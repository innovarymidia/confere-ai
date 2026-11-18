import { describe, it, expect } from "vitest";
import {
  parseBRL,
  normalizeHeader,
  detectHeaderRowIndex,
  inferColumnsByContent,
  analyzeOrdersForDivergences,
  parseMarketplaceFile,
  type NormalizedOrderRow,
  buildSampleCsvFile,
  getAuditItemExplanation,
} from "./auditEngine";

describe("auditEngine: parseBRL", () => {
  it("converts Brazilian currency strings to numbers", () => {
    expect(parseBRL("119,90")).toBe(119.9);
    expect(parseBRL("1.234,56")).toBe(1234.56);
    expect(parseBRL("R$ 89,90")).toBe(89.9);
    expect(parseBRL("-R$ 16,79")).toBe(-16.79);
    expect(parseBRL("(44,90)")).toBe(-44.9);
  });

  it("handles standard dot decimals and numbers", () => {
    expect(parseBRL("119.90")).toBe(119.9);
    expect(parseBRL(54.9)).toBe(54.9);
    expect(parseBRL(null)).toBe(0);
    expect(parseBRL("")).toBe(0);
  });
});

describe("auditEngine: normalizeHeader e detectHeaderRowIndex", () => {
  it("normalizes headers by stripping accents and lowercasing", () => {
    expect(normalizeHeader("N.º de Venda")).toBe("n.º de venda");
    expect(normalizeHeader("Preço Original")).toBe("preco original");
    expect(normalizeHeader("Situação")).toBe("situacao");
  });

  it("detects header row index ignoring institutional metadata", () => {
    const matrix = [
      ["Relatório de Faturamento"],
      ["Período: 30 dias"],
      [""],
      ["N.º de venda", "SKU", "Estado", "Receita por produtos (BRL)", "Tarifa de venda", "Tarifas de envio", "Total (BRL)"],
      ["1001", "SKU-A", "Entregue", "100", "15", "20", "65"],
    ];
    const idx = detectHeaderRowIndex(matrix, "mercadolivre");
    expect(idx).toBe(3);
  });
});

describe("auditEngine: analyzeOrdersForDivergences", () => {
  it("detects shipping overcharges (Regra 1: cubagem errada)", () => {
    const orders: NormalizedOrderRow[] = [
      {
        orderId: "PED-1",
        sku: "SKU-TESTE",
        status: "entregue",
        grossAmount: 100,
        feeAmount: 15,
        shippingAmount: 20, // baseline
        netAmount: 65,
      },
      {
        orderId: "PED-2",
        sku: "SKU-TESTE",
        status: "entregue",
        grossAmount: 100,
        feeAmount: 15,
        shippingAmount: 20, // baseline
        netAmount: 65,
      },
      {
        orderId: "PED-3",
        sku: "SKU-TESTE",
        status: "entregue",
        grossAmount: 100,
        feeAmount: 15,
        shippingAmount: 55, // outlier cubado
        netAmount: 30,
      },
    ];

    const result = analyzeOrdersForDivergences(orders, "mercadolivre");
    expect(result.items.length).toBeGreaterThanOrEqual(1);

    const shippingDivergence = result.items.find((i) => i.error_type === "frete");
    expect(shippingDivergence).toBeDefined();
    expect(shippingDivergence?.order_id).toBe("PED-3");
    expect(shippingDivergence?.charged_amount).toBe(55);
    expect(shippingDivergence?.expected_amount).toBe(20);
    expect(shippingDivergence?.recoverable_amount).toBe(35);
  });

  it("detects commission divergence (Regra 2) and negative net returns (Regra 3)", () => {
    const orders: NormalizedOrderRow[] = [
      // Baseline comissao = 15%
      { orderId: "1", sku: "SKU-COMM", status: "entregue", grossAmount: 100, feeAmount: 15, shippingAmount: 10, netAmount: 75 },
      { orderId: "2", sku: "SKU-COMM", status: "entregue", grossAmount: 100, feeAmount: 15, shippingAmount: 10, netAmount: 75 },
      // Cobrança a maior na comissão (30% em vez de 15%)
      { orderId: "3", sku: "SKU-COMM", status: "entregue", grossAmount: 100, feeAmount: 30, shippingAmount: 10, netAmount: 60 },
      // Devolução com saldo líquido negativo
      { orderId: "4", sku: "SKU-RET", status: "devolvido", grossAmount: 0, feeAmount: 0, shippingAmount: 15, netAmount: -25 },
    ];

    const result = analyzeOrdersForDivergences(orders, "shopee");

    const commError = result.items.find((i) => i.error_type === "comissao");
    expect(commError).toBeDefined();
    expect(commError?.order_id).toBe("3");
    expect(commError?.recoverable_amount).toBe(15);

    const devError = result.items.find((i) => i.error_type === "devolucao");
    expect(devError).toBeDefined();
    expect(devError?.order_id).toBe("4");
    expect(devError?.recoverable_amount).toBe(25);
  });

  it("does not falsely flag multi-unit orders with proportional shipping as cubing divergence", () => {
    const orders: NormalizedOrderRow[] = [
      // Baseline 1 unidade: frete R$ 20
      { orderId: "1", sku: "SKU-COMBO", status: "entregue", quantity: 1, grossAmount: 50, feeAmount: 7.5, shippingAmount: 20, netAmount: 22.5 },
      { orderId: "2", sku: "SKU-COMBO", status: "entregue", quantity: 1, grossAmount: 50, feeAmount: 7.5, shippingAmount: 20, netAmount: 22.5 },
      // Pedido com 2 unidades: frete R$ 29 (esperado ~29, perfeitamente proporcional a 2 unidades no pacote)
      { orderId: "3", sku: "SKU-COMBO", status: "entregue", quantity: 2, grossAmount: 100, feeAmount: 15, shippingAmount: 29, netAmount: 56 },
    ];

    const result = analyzeOrdersForDivergences(orders, "mercadolivre");
    const shippingError = result.items.find((i) => i.order_id === "3" && i.error_type === "frete");
    expect(shippingError).toBeUndefined(); // Não deve ser apontado como erro de cubagem
  });

  it("tolerates legitimate distance freight for Norte/Nordeste without false cubing flag", () => {
    const orders: NormalizedOrderRow[] = [
      // 2 envios Sudeste (R$ 19,90)
      { orderId: "1", sku: "SKU-DIST", status: "entregue", grossAmount: 120, feeAmount: 18, shippingAmount: 19.9, netAmount: 82.1, buyerRegion: "SE_SUL" },
      { orderId: "2", sku: "SKU-DIST", status: "entregue", grossAmount: 120, feeAmount: 18, shippingAmount: 19.9, netAmount: 82.1, buyerRegion: "SE_SUL" },
      // 1 envio legitimo interestadual para a regiao Norte (R$ 27,90, cerca de 40% a mais pela distancia)
      { orderId: "3", sku: "SKU-DIST", status: "entregue", grossAmount: 120, feeAmount: 18, shippingAmount: 27.9, netAmount: 74.1, buyerRegion: "NORTE_NE_CO" },
      // 1 envio com salto absurdo de cubagem real na mesma regiao (R$ 58,90)
      { orderId: "4", sku: "SKU-DIST", status: "entregue", grossAmount: 120, feeAmount: 18, shippingAmount: 58.9, netAmount: 43.1, buyerRegion: "SE_SUL" },
    ];

    const result = analyzeOrdersForDivergences(orders, "mercadolivre");
    // Pedido 3 para o Norte NAO deve ser marcado como cubagem errada
    expect(result.items.find((i) => i.order_id === "3")).toBeUndefined();
    // Pedido 4 (salto real para 58.90 no Sudeste) DEVE ser apontado
    const item4 = result.items.find((i) => i.order_id === "4");
    expect(item4).toBeDefined();
    expect(item4?.error_type).toBe("frete");
  });

  it("does not flag legit Premium listing fee (~18%) as error when SKU baseline is Classico (~13%)", () => {
    const orders: NormalizedOrderRow[] = [
      // Anúncios Clássicos (13%)
      { orderId: "1", sku: "SKU-PREM", status: "entregue", grossAmount: 100, feeAmount: 13, shippingAmount: 15, netAmount: 72 },
      { orderId: "2", sku: "SKU-PREM", status: "entregue", grossAmount: 100, feeAmount: 13, shippingAmount: 15, netAmount: 72 },
      // Anúncio Premium legítimo (18% com parcelamento sem juros)
      { orderId: "3", sku: "SKU-PREM", status: "entregue", grossAmount: 100, feeAmount: 18, shippingAmount: 15, netAmount: 67 },
      // Cobrança realmente abusiva acima do teto (30%)
      { orderId: "4", sku: "SKU-PREM", status: "entregue", grossAmount: 100, feeAmount: 30, shippingAmount: 15, netAmount: 55 },
    ];

    const result = analyzeOrdersForDivergences(orders, "mercadolivre");
    // Pedido 3 (Premium regular de 18%) não deve ser falsamente apontado
    expect(result.items.find((i) => i.order_id === "3")).toBeUndefined();
    // Pedido 4 (30%) deve ser apontado
    expect(result.items.find((i) => i.order_id === "4")).toBeDefined();
  });

  it("detects excessive fee on single-sale long-tail items based on official regulatory ceiling", () => {
    const orders: NormalizedOrderRow[] = [
      // Item de cauda longa (1 venda apenas) com cobrança exorbitante de 35% de taxa
      { orderId: "SINGLE-1", sku: "SKU-CAUDA-LONGA", status: "entregue", grossAmount: 100, feeAmount: 35, shippingAmount: 15, netAmount: 50 },
    ];

    const result = analyzeOrdersForDivergences(orders, "mercadolivre");
    const item = result.items.find((i) => i.order_id === "SINGLE-1");
    expect(item).toBeDefined();
    expect(item?.error_type).toBe("comissao");
  });

  it("excludes seller-fault returns (defeito) and flags buyer-repentance returns", () => {
    const orders: NormalizedOrderRow[] = [
      // Devolução com culpa comprovada do vendedor (defeito de fabricacao): retencao do marketplace e legal
      { orderId: "DEV-1", sku: "SKU-RET1", status: "devolvido", grossAmount: 0, feeAmount: 0, shippingAmount: 15, netAmount: -20, returnReason: "Produto com defeito de fabricacao" },
      // Devolução por arrependimento do comprador: deve ser 100% estornada
      { orderId: "DEV-2", sku: "SKU-RET2", status: "devolvido", grossAmount: 0, feeAmount: 0, shippingAmount: 15, netAmount: -20, returnReason: "Comprador se arrependeu da compra" },
    ];

    const result = analyzeOrdersForDivergences(orders, "mercadolivre");
    // DEV-1 com defeito não deve ser apontado para o lojista passar vergonha no suporte
    expect(result.items.find((i) => i.order_id === "DEV-1")).toBeUndefined();
    // DEV-2 por arrependimento deve ser apontado para estorno integral
    const item2 = result.items.find((i) => i.order_id === "DEV-2");
    expect(item2).toBeDefined();
    expect(item2?.error_type).toBe("devolucao");
  });
});

describe("auditEngine: Sample CSV parsing end-to-end", () => {
  it("parses generated Mercado Livre sample CSV without errors", async () => {
    const file = buildSampleCsvFile("mercadolivre");
    const parsed = await parseMarketplaceFile(file, "mercadolivre");
    expect(parsed.length).toBeGreaterThan(5);

    const { items, summary } = analyzeOrdersForDivergences(parsed, "mercadolivre");
    expect(items.length).toBeGreaterThan(0);
    expect(summary.totalRecoverable).toBeGreaterThan(0);
    expect(items[0].row_rank).toBe(1);
  });

  it("parses generated Shopee sample CSV without errors", async () => {
    const file = buildSampleCsvFile("shopee");
    const parsed = await parseMarketplaceFile(file, "shopee");
    expect(parsed.length).toBeGreaterThan(5);

    const { items, summary } = analyzeOrdersForDivergences(parsed, "shopee");
    expect(items.length).toBeGreaterThan(0);
    expect(summary.totalRecoverable).toBeGreaterThan(0);
  });

  it("parses realistic CSV with institutional headers and finds divergences", async () => {
    const rawMl = [
      "Relatório de Repasses Financeiros e Envios - Mercado Livre Brasil",
      "Período: Últimos 30 dias",
      "",
      "N.º de venda;SKU;Estado;Receita por produtos (BRL);Tarifa de venda e impostos (BRL);Tarifas de envio (BRL);Total (BRL)",
      "20000098401;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-19,90;83,21",
      "20000098402;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-19,90;83,21",
      "20000098403;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-54,90;48,21",
      "20000098404;KIT-ORGANIZADOR-3P;Devolvido;0,00;0,00;-24,90;-24,90",
    ].join("\n");
    const mlFile = new File([rawMl], "vendas_mercado_livre_modelo.csv", { type: "text/csv" });
    const mlOrders = await parseMarketplaceFile(mlFile, "mercadolivre");
    expect(mlOrders.length).toBe(4);
    const mlAudit = analyzeOrdersForDivergences(mlOrders, "mercadolivre");
    expect(mlAudit.items.length).toBe(2);
  });
});

describe("auditEngine: getAuditItemExplanation", () => {
  it("generates detailed calculation explanation for shipping divergence without dashes or &", () => {
    const item = {
      order_id: "200000918404",
      sku: "KIT-ORGANIZADOR-3P",
      error_type: "frete" as const,
      expected_amount: 19.9,
      charged_amount: 54.9,
      recoverable_amount: 35.0,
    };
    const expl = getAuditItemExplanation(item, "mercadolivre");

    expect(expl.sourceData).toContain("200000918404");
    expect(expl.sourceData).toContain("Mercado Livre");
    expect(expl.officialRule).toContain("Tabela Oficial de Frete");
    expect(expl.divergenceReason).toContain("54,90");
    expect(expl.recommendedAction).toContain("ficha técnica");

    // Compliance: no & and no punctuation dashes in copy
    expect(expl.sourceData).not.toContain("&");
    expect(expl.officialRule).not.toContain("&");
    expect(expl.divergenceReason).not.toContain("&");
    expect(expl.recommendedAction).not.toContain("&");
    expect(expl.recommendedAction).not.toContain(" - ");
    expect(expl.recommendedAction).not.toContain("—");
  });

  it("generates commission explanation for Shopee", () => {
    const item = {
      order_id: "261108A9X108",
      sku: "MOCHILA-IMPERMEAVEL-30L",
      error_type: "comissao" as const,
      expected_amount: 20.99,
      charged_amount: 34.48,
      recoverable_amount: 13.49,
    };
    const expl = getAuditItemExplanation(item, "shopee");

    expect(expl.sourceData).toContain("Shopee");
    expect(expl.officialRule).toContain("Tarifas de Venda 2026");
    expect(expl.divergenceReason).toContain("34,48");
    expect(expl.recommendedAction).toContain("revisão da taxa");
  });

  it("generates return refund explanation", () => {
    const item = {
      order_id: "200000918414",
      sku: "KIT-ORGANIZADOR-3P",
      error_type: "devolucao" as const,
      expected_amount: 0,
      charged_amount: 24.9,
      recoverable_amount: 24.9,
    };
    const expl = getAuditItemExplanation(item, "mercadolivre");

    expect(expl.officialRule).toContain("Cancelamento e Devolução 2026");
    expect(expl.divergenceReason).toContain("24,90");
    expect(expl.divergenceReason).toContain("frete reverso");
    expect(expl.recommendedAction).toContain("crédito integral");
  });
});

describe("auditEngine: inferColumnsByContent e Conciliação Matemática", () => {
  it("infers columns correctly purely by content and mathematical balance (Gross - Fee - Shipping = Net)", () => {
    // Planilha com títulos completamente genéricos (Col_A, Col_B...)
    const matrix = [
      ["Col_0", "Col_1", "Col_2", "Col_3", "Col_4", "Col_5", "Col_6"],
      ["20000098401", "KIT-PARAFUSADEIRA", "Entregue", "150,00", "22,50", "20,00", "107,50"],
      ["20000098402", "KIT-PARAFUSADEIRA", "Entregue", "150,00", "22,50", "20,00", "107,50"],
      ["20000098403", "KIT-PARAFUSADEIRA", "Entregue", "150,00", "22,50", "55,00", "72,50"],
    ];

    const initialCols = {
      orderId: -1,
      sku: -1,
      status: -1,
      quantity: -1,
      grossAmount: -1,
      feeAmount: -1,
      shippingAmount: -1,
      netAmount: -1,
      listingType: -1,
      buyerRegion: -1,
      returnReason: -1,
    };

    const inferred = inferColumnsByContent(matrix, 0, initialCols);

    expect(inferred.orderId).toBe(0); // Detectado por número de 11 dígitos
    expect(inferred.sku).toBe(1);     // Detectado por string alfanumérica
    expect(inferred.status).toBe(2);  // Detectado por 'Entregue'
    expect(inferred.grossAmount).toBe(3); // 150.00
    expect(inferred.feeAmount).toBe(4);   // 22.50
    expect(inferred.shippingAmount).toBe(5); // 20.00 / 55.00
    expect(inferred.netAmount).toBe(6);   // 107.50 / 72.50 (150 - 22.50 - 20 = 107.50)
  });

  it("parses end-to-end a spreadsheet with generic/unrecognized headers without errors", async () => {
    const rawCsv = [
      "Relatorio Exportado Customizado",
      "Gerado em 18/11/2026",
      "",
      "X1;X2;X3;X4;X5;X6;X7",
      "20000098401;FONE-G9;Entregue;200,00;30,00;18,00;152,00",
      "20000098402;FONE-G9;Entregue;200,00;30,00;18,00;152,00",
      "20000098403;FONE-G9;Entregue;200,00;30,00;54,00;116,00",
    ].join("\n");

    const file = new File([rawCsv], "planilha_generica.csv", { type: "text/csv" });
    const orders = await parseMarketplaceFile(file, "mercadolivre");

    expect(orders.length).toBe(3);
    expect(orders[0].orderId).toBe("20000098401");
    expect(orders[0].grossAmount).toBe(200);
    expect(orders[0].feeAmount).toBe(30);
    expect(orders[0].shippingAmount).toBe(18);
    expect(orders[0].netAmount).toBe(152);

    const audit = analyzeOrdersForDivergences(orders, "mercadolivre");
    expect(audit.items.length).toBe(1);
    expect(audit.items[0].order_id).toBe("20000098403");
    expect(audit.items[0].error_type).toBe("frete");
    expect(audit.items[0].recoverable_amount).toBe(36); // 54 - 18 = 36
  });
});
