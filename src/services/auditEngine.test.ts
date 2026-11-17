import { describe, it, expect } from "vitest";
import {
  parseBRL,
  normalizeHeader,
  detectHeaderRowIndex,
  analyzeOrdersForDivergences,
  parseMarketplaceFile,
  type NormalizedOrderRow,
  buildSampleCsvFile,
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

describe("auditEngine: normalizeHeader & detectHeaderRowIndex", () => {
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
});
