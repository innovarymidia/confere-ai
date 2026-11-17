import * as XLSX from "xlsx";
import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketplacePlatform = "mercadolivre" | "shopee";
export type DivergenceType = "frete" | "comissao" | "devolucao";

export interface NormalizedOrderRow {
  orderId: string;
  sku: string;
  status: string;
  grossAmount: number;    // Valor bruto da venda (positivo)
  feeAmount: number;      // Comissão + taxa fixa cobrada (valor absoluto positivo)
  shippingAmount: number; // Frete descontado do vendedor (valor absoluto positivo)
  netAmount: number;      // Valor líquido repassado
}

export interface DivergentItemPayload {
  row_rank: number;
  order_id: string;
  sku: string;
  error_type: DivergenceType;
  expected_amount: number;
  charged_amount: number;
  recoverable_amount: number;
  dispute_text: string;
}

export interface AuditExecutionResult {
  auditId: string;
  totalOrdersAnalyzed: number;
  totalDivergentOrders: number;
  totalRecoverable: number;
}

// Dicionário de aliases de colunas reais exportadas pelo Mercado Livre e Shopee
export const COLUMN_ALIASES: Record<MarketplacePlatform, Record<keyof NormalizedOrderRow, string[]>> = {
  mercadolivre: {
    orderId: ["n.º de venda", "numero da venda", "id da venda", "codigo da venda", "nº de venda", "operation_id", "order_id", "venda"],
    sku: ["sku", "codigo universal", "mlb", "n.º de anuncio", "numero do anuncio", "titulo do anuncio", "anuncio"],
    status: ["estado", "status", "situacao", "estado da venda", "status da venda"],
    grossAmount: ["receita por produtos (brl)", "valor do produto", "total (brl)", "preco unitario", "valor bruto", "receita por produtos"],
    feeAmount: ["tarifa de venda e impostos (brl)", "tarifa de venda", "custo de gestao", "comissao", "tarifas", "tarifa de venda e impostos"],
    shippingAmount: ["tarifas de envio (brl)", "custo de envio", "frete", "envio por conta do vendedor", "tarifas de envio"],
    netAmount: ["total (brl)", "valor liquido", "recebido", "repasse liquido", "total líquido"],
  },
  shopee: {
    orderId: ["id do pedido", "nº do pedido", "numero do pedido", "order id", "pedido"],
    sku: ["numero de referencia sku", "sku principal", "sku", "codigo do produto", "nome do produto", "referencia sku"],
    status: ["status do pedido", "status", "status da devolucao / reembolso", "situacao"],
    grossAmount: ["preco original", "subtotal do produto", "valor total do pedido", "preco acordado", "subtotal"],
    feeAmount: ["taxa de comissao", "taxa de servico", "taxa de transacao", "total de taxas", "taxas"],
    shippingAmount: ["taxa de envio paga pelo vendedor", "desconto de frete do vendedor", "taxa de envio", "frete reverso", "frete"],
    netAmount: ["valor total liberado", "renda do pedido", "valor liquido", "total liberado", "renda líquida"],
  },
};

/**
 * Converte strings monetárias brasileiras ("-R$ 1.234,56", "(44,90)", "119,90", "119.90") ou números Excel para float seguro
 */
export function parseBRL(raw: unknown): number {
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : 0;
  }
  if (!raw) return 0;

  let str = String(raw).trim();
  const isNegative = str.startsWith("-") || (str.startsWith("(") && str.endsWith(")"));

  // Remove moeda, espaços, parênteses
  str = str.replace(/[R$\s()]/g, "");

  if (str.includes(",") && str.includes(".")) {
    if (str.lastIndexOf(",") > str.lastIndexOf(".")) {
      // 1.234,56 -> 1234.56
      str = str.replace(/\./g, "").replace(",", ".");
    } else {
      // 1,234.56 -> 1234.56
      str = str.replace(/,/g, "");
    }
  } else if (str.includes(",")) {
    // 119,90 -> 119.90
    str = str.replace(",", ".");
  }
  // Se contiver apenas ponto (119.90), já é float padrão

  const parsed = parseFloat(str);
  if (!Number.isFinite(parsed)) return 0;
  return isNegative ? -Math.abs(parsed) : parsed;
}

/**
 * Normaliza texto de cabeçalho (minúsculo, sem acentos e sem espaços duplos)
 */
export function normalizeHeader(text: unknown): string {
  return String(text ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Encontra a linha exata onde começa a tabela (ignora cabeçalhos institucionais no topo do CSV/XLSX)
 */
export function detectHeaderRowIndex(matrix: unknown[][], platform: MarketplacePlatform): number {
  const orderAliases = COLUMN_ALIASES[platform].orderId.map(normalizeHeader);

  for (let i = 0; i < Math.min(matrix.length, 25); i++) {
    const row = matrix[i] || [];
    const normalizedCells = row.map(normalizeHeader);
    const hasOrderCol = normalizedCells.some((cell) =>
      orderAliases.some((alias) => cell === alias || cell.includes(alias))
    );
    if (hasOrderCol) return i;
  }
  return 0;
}

/**
 * Mapeia os índices das colunas com base nos aliases da plataforma
 */
export function mapColumnIndices(
  headerRow: unknown[],
  platform: MarketplacePlatform
): Record<keyof NormalizedOrderRow, number> {
  const normalizedHeaders = headerRow.map(normalizeHeader);
  const aliases = COLUMN_ALIASES[platform];

  const findIndex = (candidates: string[]): number => {
    for (const candidate of candidates) {
      const normCandidate = normalizeHeader(candidate);
      const exact = normalizedHeaders.findIndex((h) => h === normCandidate);
      if (exact !== -1) return exact;
      const partial = normalizedHeaders.findIndex((h) => h.includes(normCandidate));
      if (partial !== -1) return partial;
    }
    return -1;
  };

  return {
    orderId: findIndex(aliases.orderId),
    sku: findIndex(aliases.sku),
    status: findIndex(aliases.status),
    grossAmount: findIndex(aliases.grossAmount),
    feeAmount: findIndex(aliases.feeAmount),
    shippingAmount: findIndex(aliases.shippingAmount),
    netAmount: findIndex(aliases.netAmount),
  };
}

/**
 * Calcula a mediana de um array numérico (robusta contra outliers)
 */
export function calculateMedian(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function round2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatBRL(val: number): string {
  return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * Lê o arquivo CSV/XLSX no navegador e retorna linhas normalizadas
 */
export async function parseMarketplaceFile(
  file: File,
  platform: MarketplacePlatform
): Promise<NormalizedOrderRow[]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", raw: false });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
  if (matrix.length < 2) {
    throw new Error("A planilha está vazia ou não possui linhas suficientes.");
  }

  const headerIdx = detectHeaderRowIndex(matrix, platform);
  const headerRow = matrix[headerIdx];
  const colIdx = mapColumnIndices(headerRow, platform);

  if (colIdx.orderId === -1) {
    throw new Error(
      `Não encontramos a coluna de ID do pedido para ${platform === "mercadolivre" ? "Mercado Livre" : "Shopee"}. Verifique se selecionou a plataforma correta.`
    );
  }

  const orders: NormalizedOrderRow[] = [];

  for (let r = headerIdx + 1; r < matrix.length; r++) {
    const row = matrix[r];
    if (!row || row.length === 0) continue;

    const rawOrderId = String(row[colIdx.orderId] ?? "").trim();
    if (!rawOrderId || rawOrderId.toLowerCase().startsWith("total")) continue;

    const rawSku = colIdx.sku !== -1 ? String(row[colIdx.sku] ?? "").trim() : "SKU-GERAL";
    const rawStatus = colIdx.status !== -1 ? normalizeHeader(row[colIdx.status]) : "concluido";

    const gross = colIdx.grossAmount !== -1 ? Math.abs(parseBRL(row[colIdx.grossAmount])) : 0;
    const fee = colIdx.feeAmount !== -1 ? Math.abs(parseBRL(row[colIdx.feeAmount])) : 0;
    const shipping = colIdx.shippingAmount !== -1 ? Math.abs(parseBRL(row[colIdx.shippingAmount])) : 0;
    const net = colIdx.netAmount !== -1 ? parseBRL(row[colIdx.netAmount]) : round2(gross - fee - shipping);

    orders.push({
      orderId: rawOrderId,
      sku: rawSku || "SKU-NAO-INFORMADO",
      status: rawStatus,
      grossAmount: gross,
      feeAmount: fee,
      shippingAmount: shipping,
      netAmount: net,
    });
  }

  return orders;
}

/**
 * Motor matemático: aplica as 3 regras de detecção de divergência financeira
 */
export function analyzeOrdersForDivergences(
  orders: NormalizedOrderRow[],
  platform: MarketplacePlatform
): {
  items: DivergentItemPayload[];
  summary: {
    totalRecoverable: number;
    freteRecoverable: number;
    comissaoRecoverable: number;
    devolucaoRecoverable: number;
  };
} {
  const platformLabel = platform === "mercadolivre" ? "Mercado Livre" : "Shopee";
  const rawDivergences: Omit<DivergentItemPayload, "row_rank">[] = [];

  // Separa pedidos concluídos vs. devolvidos/cancelados
  const isCanceledOrReturned = (status: string) =>
    /(cancelad|devolvid|reembols|mediac|estorn|returned|cancelled)/.test(status);

  const validOrders = orders.filter((o) => !isCanceledOrReturned(o.status));
  const returnedOrders = orders.filter((o) => isCanceledOrReturned(o.status));

  // 1. Agrupa pedidos válidos por SKU para calcular baseline de Frete e Taxa Efetiva
  const skuShippingMap = new Map<string, number[]>();
  const skuFeeRateMap = new Map<string, number[]>();

  for (const order of validOrders) {
    if (order.shippingAmount > 0) {
      const list = skuShippingMap.get(order.sku) ?? [];
      list.push(order.shippingAmount);
      skuShippingMap.set(order.sku, list);
    }
    if (order.grossAmount > 0 && order.feeAmount > 0) {
      const rate = order.feeAmount / order.grossAmount;
      const rates = skuFeeRateMap.get(order.sku) ?? [];
      rates.push(rate);
      skuFeeRateMap.set(order.sku, rates);
    }
  }

  // Calcula percentil 35% para frete (evita distorção se metade dos pedidos teve erro de cubagem)
  const baselineShippingBySku = new Map<string, number>();
  for (const [sku, values] of skuShippingMap.entries()) {
    if (values.length >= 2) {
      const sorted = [...values].sort((a, b) => a - b);
      const p35Index = Math.floor(sorted.length * 0.35);
      baselineShippingBySku.set(sku, sorted[p35Index]);
    }
  }

  const baselineFeeRateBySku = new Map<string, number>();
  for (const [sku, rates] of skuFeeRateMap.entries()) {
    if (rates.length >= 2) {
      baselineFeeRateBySku.set(sku, calculateMedian(rates));
    }
  }

  // REGRA 1 & REGRA 2: Audita pedidos concluídos (Frete Cubado + Comissão Acima do Padrão)
  for (const order of validOrders) {
    // Regra 1: Frete Outlier por SKU (erro de cubagem/peso na triagem)
    const expectedShipping = baselineShippingBySku.get(order.sku);
    if (expectedShipping && order.shippingAmount > expectedShipping * 1.22) {
      const diff = round2(order.shippingAmount - expectedShipping);
      if (diff >= 3.5) {
        rawDivergences.push({
          order_id: order.orderId,
          sku: order.sku,
          error_type: "frete",
          expected_amount: round2(expectedShipping),
          charged_amount: round2(order.shippingAmount),
          recoverable_amount: diff,
          dispute_text: `Olá, solicito revisão da tarifa de envio cobrada no pedido #${order.orderId} (SKU: ${order.sku}). O custo padrão de peso/cubagem deste mesmo anúncio no ${platformLabel} é de ${formatBRL(expectedShipping)}, porém neste pedido foi descontado ${formatBRL(order.shippingAmount)} (cobrança a maior de ${formatBRL(diff)}). Peço a conferência da cubagem e o estorno da diferença.`,
        });
      }
    }

    // Regra 2: Comissão / Tarifa divergente do padrão do SKU ou teto da faixa
    if (order.grossAmount > 0 && order.feeAmount > 0) {
      const expectedRate = baselineFeeRateBySku.get(order.sku);
      if (expectedRate) {
        const expectedFee = round2(order.grossAmount * expectedRate);
        if (order.feeAmount > expectedFee * 1.12) {
          const diff = round2(order.feeAmount - expectedFee);
          if (diff >= 3.0) {
            rawDivergences.push({
              order_id: order.orderId,
              sku: order.sku,
              error_type: "comissao",
              expected_amount: expectedFee,
              charged_amount: round2(order.feeAmount),
              recoverable_amount: diff,
              dispute_text: `Olá, solicito revisão da tarifa de venda descontada no pedido #${order.orderId} (SKU: ${order.sku}). Para este anúncio, a tarifa aplicada historicamente é de ${formatBRL(expectedFee)}, mas foi cobrado ${formatBRL(order.feeAmount)} (diferença de ${formatBRL(diff)}). Favor verificar a alíquota aplicada e estornar o valor excedente.`,
            });
          }
        }
      }
    }
  }

  // REGRA 3: Audita pedidos devolvidos/cancelados com saldo líquido negativo (frete reverso ou comissão não estornada)
  for (const order of returnedOrders) {
    if (order.netAmount < -2.0) {
      const loss = round2(Math.abs(order.netAmount));
      rawDivergences.push({
        order_id: order.orderId,
        sku: order.sku,
        error_type: "devolucao",
        expected_amount: 0,
        charged_amount: loss,
        recoverable_amount: loss,
        dispute_text: `Olá, o pedido #${order.orderId} (SKU: ${order.sku}) consta como cancelado/devolvido, porém gerou um desconto líquido indevido de ${formatBRL(loss)} na minha conta (tarifa ou frete reverso não estornado). Solicito o reembolso integral deste lançamento.`,
      });
    }
  }

  // Ordena do maior valor recuperável para o menor e atribui row_rank (1..N)
  rawDivergences.sort((a, b) => b.recoverable_amount - a.recoverable_amount);

  const rankedItems: DivergentItemPayload[] = rawDivergences.map((item, idx) => ({
    ...item,
    row_rank: idx + 1,
  }));

  const freteRecoverable = round2(
    rankedItems.filter((i) => i.error_type === "frete").reduce((acc, i) => acc + i.recoverable_amount, 0)
  );
  const comissaoRecoverable = round2(
    rankedItems.filter((i) => i.error_type === "comissao").reduce((acc, i) => acc + i.recoverable_amount, 0)
  );
  const devolucaoRecoverable = round2(
    rankedItems.filter((i) => i.error_type === "devolucao").reduce((acc, i) => acc + i.recoverable_amount, 0)
  );

  return {
    items: rankedItems,
    summary: {
      totalRecoverable: round2(freteRecoverable + comissaoRecoverable + devolucaoRecoverable),
      freteRecoverable,
      comissaoRecoverable,
      devolucaoRecoverable,
    },
  };
}

/**
 * Orquestra o parse, análise e gravação nas tabelas `audits` e `audit_items` do Supabase
 * (com fallback automático para armazenamento local caso o Supabase não esteja configurado ainda).
 */
export async function runMarketplaceAuditAndSave(
  file: File,
  platform: MarketplacePlatform,
  supabase: SupabaseClient
): Promise<AuditExecutionResult> {
  // 1. Parse e análise 100% client-side
  const orders = await parseMarketplaceFile(file, platform);
  if (orders.length === 0) {
    throw new Error("Nenhum pedido válido foi encontrado na planilha enviada.");
  }

  const { items, summary } = analyzeOrdersForDivergences(orders, platform);

  // 2. Separa apenas os valores R$ dos itens 3..N para renderizar o blur sem vazar SKU/Pedido via API
  const blurredPreviewAmounts = items.slice(2).map((item) => item.recoverable_amount);

  // Tentativa de gravação no Supabase
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: auditRecord, error: auditError } = await supabase
      .from("audits")
      .insert({
        user_id: user?.id ?? null,
        platform,
        total_orders_analyzed: orders.length,
        total_divergent_orders: items.length,
        total_recoverable: summary.totalRecoverable,
        frete_recoverable: summary.freteRecoverable,
        comissao_recoverable: summary.comissaoRecoverable,
        devolucao_recoverable: summary.devolucaoRecoverable,
        blurred_preview_amounts: blurredPreviewAmounts,
      })
      .select("id")
      .single();

    if (!auditError && auditRecord) {
      if (items.length > 0) {
        const rowsToInsert = items.map((item) => ({
          audit_id: auditRecord.id,
          ...item,
        }));

        const BATCH_SIZE = 500;
        for (let i = 0; i < rowsToInsert.length; i += BATCH_SIZE) {
          const batch = rowsToInsert.slice(i, i + BATCH_SIZE);
          await supabase.from("audit_items").insert(batch);
        }
      }

      return {
        auditId: auditRecord.id,
        totalOrdersAnalyzed: orders.length,
        totalDivergentOrders: items.length,
        totalRecoverable: summary.totalRecoverable,
      };
    }
  } catch (err) {
    console.warn("Supabase não disponível ou com erro de conexão. Utilizando modo demo local:", err);
  }

  // Fallback local caso Supabase ainda não tenha sido conectado (Zero-Setup Demo Mode)
  const localAuditId = crypto.randomUUID();
  const localAudit = {
    id: localAuditId,
    user_id: null,
    platform,
    total_orders_analyzed: orders.length,
    total_divergent_orders: items.length,
    total_recoverable: summary.totalRecoverable,
    frete_recoverable: summary.freteRecoverable,
    comissao_recoverable: summary.comissaoRecoverable,
    devolucao_recoverable: summary.devolucaoRecoverable,
    blurred_preview_amounts: blurredPreviewAmounts,
  };

  const localItems = items.map((item) => ({
    audit_id: localAuditId,
    id: crypto.randomUUID(),
    is_contested: false,
    is_refunded: false,
    ...item,
  }));

  try {
    sessionStorage.setItem(`audit_${localAuditId}`, JSON.stringify(localAudit));
    sessionStorage.setItem(`audit_items_${localAuditId}`, JSON.stringify(localItems));
  } catch {
    // Ignore storage quota errors
  }

  return {
    auditId: localAuditId,
    totalOrdersAnalyzed: orders.length,
    totalDivergentOrders: items.length,
    totalRecoverable: summary.totalRecoverable,
  };
}
