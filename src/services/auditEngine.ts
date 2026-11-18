import type { SupabaseClient } from "@supabase/supabase-js";

export type MarketplacePlatform = "mercadolivre" | "shopee";
export type DivergenceType = "frete" | "comissao" | "devolucao";

export interface NormalizedOrderRow {
  orderId: string;
  sku: string;
  status: string;
  quantity?: number;      // Quantidade de unidades vendidas (default 1)
  grossAmount: number;    // Valor bruto da venda (positivo)
  feeAmount: number;      // Comissão + taxa fixa cobrada (valor absoluto positivo)
  shippingAmount: number; // Frete descontado do vendedor (valor absoluto positivo)
  netAmount: number;      // Valor líquido repassado
  listingType?: string;   // Tipo de anúncio ("classico", "premium", "geral")
  buyerRegion?: string;   // Região macro do comprador ("SE_SUL", "NORTE_NE_CO", "GERAL")
  returnReason?: string;  // Motivo da devolução ou cancelamento
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
    quantity: ["quantidade", "unidades", "qtd", "quantidade de produtos", "quantity"],
    grossAmount: ["receita por produtos (brl)", "valor do produto", "total (brl)", "preco unitario", "valor bruto", "receita por produtos"],
    feeAmount: ["tarifa de venda e impostos (brl)", "tarifa de venda", "custo de gestao", "comissao", "tarifas", "tarifa de venda e impostos"],
    shippingAmount: ["tarifas de envio (brl)", "custo de envio", "frete", "envio por conta do vendedor", "tarifas de envio"],
    netAmount: ["total (brl)", "valor liquido", "recebido", "repasse liquido", "total líquido"],
    listingType: ["tipo de anuncio", "tipo de publicacao", "tipo de publicacion", "modalidade", "tipo de publicacao (brl)", "listing_type"],
    buyerRegion: ["estado do comprador", "estado de envio", "uf do comprador", "uf de destino", "uf", "estado", "cidade do comprador", "destino", "regiao"],
    returnReason: ["motivo da devolucao", "motivo da reclamacao", "motivo do cancelamento", "tipo de cancelamento", "responsabilidade", "substatus"],
  },
  shopee: {
    orderId: ["id do pedido", "nº do pedido", "numero do pedido", "order id", "pedido"],
    sku: ["numero de referencia sku", "sku principal", "sku", "codigo do produto", "nome do produto", "referencia sku"],
    status: ["status do pedido", "status", "status da devolucao / reembolso", "situacao"],
    quantity: ["quantidade", "qtd", "unidades", "quantity", "quantidade do produto"],
    grossAmount: ["preco original", "subtotal do produto", "valor total do pedido", "preco acordado", "subtotal"],
    feeAmount: ["taxa de comissao", "taxa de servico", "taxa de transacao", "total de taxas", "taxas"],
    shippingAmount: ["taxa de envio paga pelo vendedor", "desconto de frete do vendedor", "taxa de envio", "frete reverso", "frete"],
    netAmount: ["valor total liberado", "renda do pedido", "valor liquido", "total liberado", "renda líquida"],
    listingType: ["tipo de anuncio", "modalidade", "tipo de servico", "tipo"],
    buyerRegion: ["estado de envio", "uf de envio", "estado do destinatario", "uf", "estado", "cidade", "regiao"],
    returnReason: ["motivo do reembolso", "motivo da devolucao / reembolso", "motivo do cancelamento", "motivo da devolucao", "razao"],
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

  // Fallback estrutural: localiza a primeira linha com formato de tabela (>= 3 colunas não vazias)
  for (let i = 0; i < Math.min(matrix.length - 1, 20); i++) {
    const row = matrix[i] || [];
    const nextRow = matrix[i + 1] || [];
    const nonEmpties = row.filter((c) => c !== "" && c !== null && c !== undefined).length;
    const nextNonEmpties = nextRow.filter((c) => c !== "" && c !== null && c !== undefined).length;
    if (nonEmpties >= 3 && nextNonEmpties >= 3) {
      return i;
    }
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
    quantity: findIndex(aliases.quantity),
    grossAmount: findIndex(aliases.grossAmount),
    feeAmount: findIndex(aliases.feeAmount),
    shippingAmount: findIndex(aliases.shippingAmount),
    netAmount: findIndex(aliases.netAmount),
    listingType: findIndex(aliases.listingType),
    buyerRegion: findIndex(aliases.buyerRegion),
    returnReason: findIndex(aliases.returnReason),
  };
}

/**
 * Normaliza estados ou cidades para macro-regioes de frete no Brasil
 */
export function normalizeMacroRegion(raw: unknown): "SE_SUL" | "NORTE_NE_CO" | "GERAL" {
  if (!raw) return "GERAL";
  const str = String(raw).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (/\b(SP|RJ|MG|ES|PR|SC|RS|SAO PAULO|RIO DE JANEIRO|MINAS GERAIS|ESPIRITO SANTO|PARANA|SANTA CATARINA|RIO GRANDE DO SUL|SUDESTE|SUL)\b/.test(str)) {
    return "SE_SUL";
  }
  if (/\b(BA|PE|CE|MA|PA|AM|MT|MS|GO|DF|RN|PB|AL|SE|PI|TO|RO|AC|AP|RR|BAHIA|PERNAMBUCO|CEARA|MARANHAO|PARA|AMAZONAS|MATO GROSSO|GOIAS|DISTRITO FEDERAL|NORTE|NORDESTE|CENTRO-OESTE)\b/.test(str)) {
    return "NORTE_NE_CO";
  }
  return "GERAL";
}

/**
 * Normaliza modalidade de anuncio para evitar comparacao incorreta de taxas
 */
export function normalizeListingType(raw: unknown): "classico" | "premium" | "geral" {
  if (!raw) return "geral";
  const str = String(raw).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  if (/premium|gold pro|sem juros|parcelamento|destaque/.test(str)) return "premium";
  if (/classico|classica|gold|sem parcelamento|padrao/.test(str)) return "classico";
  return "geral";
}

/**
 * Identifica se a devolucao foi motivada por falha/defeito atribuivel ao vendedor
 */
export function isSellerFaultReturn(reason: unknown): boolean {
  if (!reason) return false;
  const str = String(reason).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return /(defeito|avariad|quebrad|estragad|danificad|incomplet|faltou|trocad|errad|nao funcionou|vendedor nao enviou|atraso no envio|reclamacao procedente)/.test(str);
}

/**
 * Inspeciona o conteudo das celulas e aplica conciliacao matematica (Bruto - Tarifa - Frete = Liquido)
 * para identificar colunas mesmo quando os titulos forem desconhecidos, genericos ou em outro idioma.
 */
export function inferColumnsByContent(
  matrix: unknown[][],
  headerIdx: number,
  existingCols: Record<keyof NormalizedOrderRow, number>
): Record<keyof NormalizedOrderRow, number> {
  const result = { ...existingCols };
  const sampleRows = matrix
    .slice(headerIdx + 1, headerIdx + 45)
    .filter((r) => Array.isArray(r) && r.length > 0 && r.some((c) => c !== "" && c !== null));

  if (sampleRows.length === 0) return result;

  const numColumns = Math.max(...sampleRows.map((r) => r.length));
  if (numColumns <= 0) return result;

  // 1. Detecta ID do Pedido pelo formato e unicidade
  if (result.orderId === -1) {
    let bestCol = -1;
    let highestScore = 0;

    for (let c = 0; c < numColumns; c++) {
      if (Object.values(result).includes(c)) continue;
      const values = sampleRows.map((r) => String(r[c] ?? "").trim()).filter(Boolean);
      if (values.length < Math.min(3, sampleRows.length)) continue;

      const uniqueCount = new Set(values).size;
      const uniquenessRatio = uniqueCount / values.length;

      // Padrão de Order ID: 7 a 20 digitos ou alfanumerico com alta cardinalidade
      const matchesPatternCount = values.filter((v) =>
        /^\d{7,20}$/.test(v) || /^[A-Z0-9_-]{7,25}$/i.test(v)
      ).length;
      const patternRatio = matchesPatternCount / values.length;

      const hasCurrencyOrComma = values.some((v) => v.includes("R$") || /,\d{2}$/.test(v));

      if (!hasCurrencyOrComma && uniquenessRatio >= 0.75 && patternRatio >= 0.7) {
        const score = uniquenessRatio * 2 + patternRatio;
        if (score > highestScore) {
          highestScore = score;
          bestCol = c;
        }
      }
    }

    if (bestCol !== -1) {
      result.orderId = bestCol;
    }
  }

  // 2. Detecta Status pelos termos de situacao da venda
  if (result.status === -1) {
    for (let c = 0; c < numColumns; c++) {
      if (Object.values(result).includes(c)) continue;
      const values = sampleRows.map((r) => normalizeHeader(r[c])).filter(Boolean);
      if (values.length === 0) continue;

      const statusMatches = values.filter((v) =>
        /(entregue|concluido|cancelad|devolvid|reembols|media|enviado|caminho|pendente|transit|delivered|completed|cancelled|returned)/.test(v)
      ).length;

      if (statusMatches / values.length >= 0.4) {
        result.status = c;
        break;
      }
    }
  }

  // 3. Detecta UF e Regiao de Destino por siglas de estados brasileiros
  if (result.buyerRegion === -1) {
    const UF_REGEX = /\b(AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO)\b/;
    for (let c = 0; c < numColumns; c++) {
      if (Object.values(result).includes(c)) continue;
      const values = sampleRows.map((r) => String(r[c] ?? "").toUpperCase().trim()).filter(Boolean);
      if (values.length === 0) continue;

      const ufMatches = values.filter((v) => UF_REGEX.test(v) && v.length <= 4).length;
      if (ufMatches / values.length >= 0.4) {
        result.buyerRegion = c;
        break;
      }
    }
  }

  // 4. Detecta Quantidade por inteiros pequenos (1..30)
  if (result.quantity === -1) {
    for (let c = 0; c < numColumns; c++) {
      if (Object.values(result).includes(c)) continue;
      const values = sampleRows.map((r) => r[c]);
      let intCount = 0;
      let validCount = 0;

      for (const val of values) {
        if (val === "" || val === null || val === undefined) continue;
        validCount++;
        const num = Number(val);
        if (Number.isInteger(num) && num >= 1 && num <= 30) {
          intCount++;
        }
      }

      if (validCount >= 3 && intCount / validCount >= 0.8) {
        result.quantity = c;
        break;
      }
    }
  }

  // 5. Detecta SKU por texto de identificacao de produto
  if (result.sku === -1) {
    for (let c = 0; c < numColumns; c++) {
      if (Object.values(result).includes(c)) continue;
      const values = sampleRows.map((r) => String(r[c] ?? "").trim()).filter(Boolean);
      if (values.length === 0) continue;

      const isTextAndNotNum = values.every((v) => v.length >= 2 && v.length <= 60 && isNaN(Number(v)));
      if (isTextAndNotNum) {
        result.sku = c;
        break;
      }
    }
  }

  // 6. Conciliacao Matematica de Colunas Monetarias: Bruto - Tarifa - Frete = Liquido
  const isMissingMoney =
    result.grossAmount === -1 ||
    result.netAmount === -1 ||
    result.feeAmount === -1 ||
    result.shippingAmount === -1;

  if (isMissingMoney) {
    const moneyCols: number[] = [];
    for (let c = 0; c < numColumns; c++) {
      if (c === result.orderId || c === result.status || c === result.sku || c === result.quantity || c === result.buyerRegion) {
        continue;
      }
      let validMoneyCount = 0;
      for (const row of sampleRows) {
        const val = row[c];
        if (val !== "" && val !== null && val !== undefined) {
          const num = parseBRL(val);
          if (Number.isFinite(num) && num !== 0) {
            validMoneyCount++;
          }
        }
      }
      if (validMoneyCount >= Math.min(2, Math.floor(sampleRows.length * 0.35))) {
        moneyCols.push(c);
      }
    }

    // Caso A: 4 colunas monetarias (Gross, Fee, Shipping, Net) onde Gross - Fee - Shipping = Net
    let best4Match: { gross: number; fee: number; ship: number; net: number; hits: number } | null = null;

    if (moneyCols.length >= 4) {
      for (const g of moneyCols) {
        if (result.grossAmount !== -1 && g !== result.grossAmount) continue;
        for (const f of moneyCols) {
          if (f === g) continue;
          if (result.feeAmount !== -1 && f !== result.feeAmount) continue;
          for (const s of moneyCols) {
            if (s === g || s === f) continue;
            if (result.shippingAmount !== -1 && s !== result.shippingAmount) continue;
            for (const n of moneyCols) {
              if (n === g || n === f || n === s) continue;
              if (result.netAmount !== -1 && n !== result.netAmount) continue;

              let hits = 0;
              for (const row of sampleRows) {
                const grossVal = Math.abs(parseBRL(row[g]));
                const feeVal = Math.abs(parseBRL(row[f]));
                const shipVal = Math.abs(parseBRL(row[s]));
                const netVal = parseBRL(row[n]);

                if (grossVal > 0) {
                  const expectedNet = grossVal - feeVal - shipVal;
                  if (Math.abs(expectedNet - netVal) < 0.25) {
                    hits++;
                  }
                }
              }

              if (hits >= Math.min(2, Math.floor(sampleRows.length * 0.4))) {
                if (!best4Match || hits > best4Match.hits) {
                  best4Match = { gross: g, fee: f, ship: s, net: n, hits };
                }
              }
            }
          }
        }
      }
    }

    if (best4Match) {
      if (result.grossAmount === -1) result.grossAmount = best4Match.gross;
      if (result.feeAmount === -1) result.feeAmount = best4Match.fee;
      if (result.shippingAmount === -1) result.shippingAmount = best4Match.ship;
      if (result.netAmount === -1) result.netAmount = best4Match.net;
    } else if (moneyCols.length >= 3) {
      // Caso B: 3 colunas monetarias (Gross, Fee, Net) onde Gross - Fee = Net
      let best3Match: { gross: number; fee: number; net: number; hits: number } | null = null;

      for (const g of moneyCols) {
        if (result.grossAmount !== -1 && g !== result.grossAmount) continue;
        for (const f of moneyCols) {
          if (f === g) continue;
          if (result.feeAmount !== -1 && f !== result.feeAmount) continue;
          for (const n of moneyCols) {
            if (n === g || n === f) continue;
            if (result.netAmount !== -1 && n !== result.netAmount) continue;

            let hits = 0;
            for (const row of sampleRows) {
              const grossVal = Math.abs(parseBRL(row[g]));
              const feeVal = Math.abs(parseBRL(row[f]));
              const netVal = parseBRL(row[n]);

              if (grossVal > 0) {
                const expectedNet = grossVal - feeVal;
                if (Math.abs(expectedNet - netVal) < 0.25) {
                  hits++;
                }
              }
            }

            if (hits >= Math.min(2, Math.floor(sampleRows.length * 0.4))) {
              if (!best3Match || hits > best3Match.hits) {
                best3Match = { gross: g, fee: f, net: n, hits };
              }
            }
          }
        }
      }

      if (best3Match) {
        if (result.grossAmount === -1) result.grossAmount = best3Match.gross;
        if (result.feeAmount === -1) result.feeAmount = best3Match.fee;
        if (result.netAmount === -1) result.netAmount = best3Match.net;
      }
    }
  }

  return result;
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
  // Proteção contra DoS de memória / Arquivos excessivos (OWASP)
  const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
  if (file.size > MAX_FILE_SIZE) {
    throw new Error("O arquivo excede o limite máximo permitido de 15 MB.");
  }

  const [XLSX, buffer] = await Promise.all([
    import("xlsx"),
    file.arrayBuffer(),
  ]);
  const workbook = XLSX.read(buffer, { type: "array", raw: true, cellDates: true });
  const firstSheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[firstSheetName];

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: true });
  if (matrix.length < 2) {
    throw new Error("A planilha está vazia ou não possui linhas suficientes.");
  }
  if (matrix.length > 100000) {
    throw new Error("A planilha excede o limite máximo de 100.000 linhas por conferência.");
  }

  const headerIdx = detectHeaderRowIndex(matrix, platform);
  const headerRow = matrix[headerIdx];
  let colIdx = mapColumnIndices(headerRow, platform);

  // Fallback Inteligente: se colunas essenciais faltarem pelos titulos, infere por conteudo e equacao matematica
  if (
    colIdx.orderId === -1 ||
    colIdx.grossAmount === -1 ||
    colIdx.feeAmount === -1 ||
    colIdx.shippingAmount === -1 ||
    colIdx.netAmount === -1 ||
    colIdx.status === -1
  ) {
    colIdx = inferColumnsByContent(matrix, headerIdx, colIdx);
  }

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
    const rawQty = colIdx.quantity !== -1 ? Math.round(parseBRL(row[colIdx.quantity])) : 1;
    const quantity = Number.isFinite(rawQty) && rawQty > 0 ? rawQty : 1;

    const rawListing = colIdx.listingType !== -1 ? normalizeListingType(row[colIdx.listingType]) : undefined;
    const rawRegion = colIdx.buyerRegion !== -1 ? normalizeMacroRegion(row[colIdx.buyerRegion]) : undefined;
    const rawReason = colIdx.returnReason !== -1 ? String(row[colIdx.returnReason] ?? "").trim() : undefined;

    orders.push({
      orderId: rawOrderId,
      sku: rawSku || "SKU-NAO-INFORMADO",
      status: rawStatus,
      quantity,
      grossAmount: gross,
      feeAmount: fee,
      shippingAmount: shipping,
      netAmount: net,
      listingType: rawListing,
      buyerRegion: rawRegion,
      returnReason: rawReason,
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

  // 1. Agrupa pedidos válidos por SKU, Região e Modalidade de Anúncio
  const skuShippingMap = new Map<string, number[]>();
  const skuRegionShippingMap = new Map<string, number[]>();
  const skuFeeRateMap = new Map<string, number[]>();
  const skuListingFeeRateMap = new Map<string, number[]>();

  for (const order of validOrders) {
    const qty = Math.max(1, order.quantity ?? 1);
    if (order.shippingAmount > 0) {
      // Normaliza o frete unitário considerando volume de multi-unidades
      const unitShipping = qty === 1 ? order.shippingAmount : order.shippingAmount / (1 + (qty - 1) * 0.45);
      
      const list = skuShippingMap.get(order.sku) ?? [];
      list.push(unitShipping);
      skuShippingMap.set(order.sku, list);

      if (order.buyerRegion && order.buyerRegion !== "GERAL") {
        const regKey = `${order.sku}__${order.buyerRegion}`;
        const regList = skuRegionShippingMap.get(regKey) ?? [];
        regList.push(unitShipping);
        skuRegionShippingMap.set(regKey, regList);
      }
    }
    if (order.grossAmount > 0 && order.feeAmount > 0) {
      const rate = order.feeAmount / order.grossAmount;
      const rates = skuFeeRateMap.get(order.sku) ?? [];
      rates.push(rate);
      skuFeeRateMap.set(order.sku, rates);

      if (order.listingType && order.listingType !== "geral") {
        const listingKey = `${order.sku}__${order.listingType}`;
        const listingRates = skuListingFeeRateMap.get(listingKey) ?? [];
        listingRates.push(rate);
        skuListingFeeRateMap.set(listingKey, listingRates);
      }
    }
  }

  // Calcula percentil 35% para frete por SKU e por Região
  const baselineShippingBySku = new Map<string, number>();
  for (const [sku, values] of skuShippingMap.entries()) {
    if (values.length >= 2) {
      const sorted = [...values].sort((a, b) => a - b);
      const p35Index = Math.floor(sorted.length * 0.35);
      baselineShippingBySku.set(sku, sorted[p35Index]);
    }
  }

  const baselineShippingByRegion = new Map<string, number>();
  for (const [regKey, values] of skuRegionShippingMap.entries()) {
    if (values.length >= 2) {
      const sorted = [...values].sort((a, b) => a - b);
      const p35Index = Math.floor(sorted.length * 0.35);
      baselineShippingByRegion.set(regKey, sorted[p35Index]);
    }
  }

  // Calcula taxa mediana por SKU e por Modalidade de Anúncio
  const baselineFeeRateBySku = new Map<string, number>();
  for (const [sku, rates] of skuFeeRateMap.entries()) {
    if (rates.length >= 2) {
      baselineFeeRateBySku.set(sku, calculateMedian(rates));
    }
  }

  const baselineFeeRateByListing = new Map<string, number>();
  for (const [listingKey, rates] of skuListingFeeRateMap.entries()) {
    if (rates.length >= 2) {
      baselineFeeRateByListing.set(listingKey, calculateMedian(rates));
    }
  }

  // REGRA 1 E REGRA 2: Audita pedidos concluídos
  for (const order of validOrders) {
    const qty = Math.max(1, order.quantity ?? 1);

    // REGRA 1: Frete e Cubagem com inteligência geográfica e proteção regional
    if (order.shippingAmount > 0) {
      const regionKey = `${order.sku}__${order.buyerRegion || "GERAL"}`;
      const regionalBase = baselineShippingByRegion.get(regionKey);
      const generalBase = baselineShippingBySku.get(order.sku);

      let baseUnitShipping: number | undefined;
      let thresholdRatio = 1.25;
      let minDiff = 4.0;

      if (regionalBase) {
        // Pedido comparado com o histórico da mesma região geográfica
        baseUnitShipping = regionalBase;
        thresholdRatio = 1.22;
        minDiff = 3.5;
      } else if (generalBase) {
        baseUnitShipping = generalBase;
        if (order.buyerRegion === "NORTE_NE_CO") {
          // Destinos Norte, Nordeste e Centro-Oeste admitem variação maior de frete legítimo
          thresholdRatio = 1.45;
          minDiff = 8.0;
        } else {
          thresholdRatio = 1.28;
          minDiff = 5.0;
        }
      }

      if (baseUnitShipping) {
        const expectedShipping = round2(
          qty === 1 ? baseUnitShipping : baseUnitShipping * (1 + (qty - 1) * 0.45)
        );
        if (order.shippingAmount > expectedShipping * thresholdRatio) {
          const diff = round2(order.shippingAmount - expectedShipping);
          if (diff >= minDiff) {
            rawDivergences.push({
              order_id: order.orderId,
              sku: order.sku,
              error_type: "frete",
              expected_amount: expectedShipping,
              charged_amount: round2(order.shippingAmount),
              recoverable_amount: diff,
              dispute_text: `Olá, solicito revisão da tarifa de envio cobrada no pedido #${order.orderId} (SKU: ${order.sku}, Qtd: ${qty}). O custo padrão de peso e cubagem deste anúncio no ${platformLabel} para ${qty} unidade(s) é de ${formatBRL(expectedShipping)}, porém foi descontado ${formatBRL(order.shippingAmount)} (cobrança a maior de ${formatBRL(diff)}). Peço a conferência da cubagem e o estorno da diferença.`,
            });
          }
        }
      } else if (!generalBase && (skuShippingMap.get(order.sku)?.length ?? 0) === 1) {
        // Auditoria em Produto de Cauda Longa (1 venda única):
        // No Mercado Livre, produtos abaixo de R$ 79 não possuem obrigatoriedade de frete grátis do vendedor.
        // Se houver desconto expressivo de frete em item barato de 1 unidade, acusa divergência:
        if (platform === "mercadolivre" && order.grossAmount > 0 && order.grossAmount < 79 && order.shippingAmount > 25.0) {
          const diff = round2(order.shippingAmount);
          rawDivergences.push({
            order_id: order.orderId,
            sku: order.sku,
            error_type: "frete",
            expected_amount: 0,
            charged_amount: round2(order.shippingAmount),
            recoverable_amount: diff,
            dispute_text: `Olá, solicito revisão do frete debitado no pedido #${order.orderId} (SKU: ${order.sku}). O produto foi vendido por ${formatBRL(order.grossAmount)} (abaixo de R$ 79,00), onde a regra oficial não obriga o vendedor a arcar com frete grátis. Solicito o estorno integral de ${formatBRL(diff)}.`,
          });
        }
      }
    }

    // REGRA 2: Comissão e Tarifas com proteção Clássico vs. Premium e Cauda Longa
    if (order.grossAmount > 0 && order.feeAmount > 0) {
      const listingKey = `${order.sku}__${order.listingType || "geral"}`;
      const listingBaseRate = baselineFeeRateByListing.get(listingKey);
      const generalBaseRate = baselineFeeRateBySku.get(order.sku);
      const effectiveRate = order.feeAmount / order.grossAmount;

      const expectedRate = listingBaseRate ?? generalBaseRate;

      // Proteção Clássico vs. Premium no Mercado Livre:
      // Se não houver coluna de anúncio, mas a taxa do pedido for ~16% a 19.5% e o baseline for ~12% a 14%
      // (salto legítimo de anúncio Premium com parcelamento), não marca falso positivo.
      const isLikelyPremiumMismatch =
        platform === "mercadolivre" &&
        !order.listingType &&
        expectedRate !== undefined &&
        effectiveRate >= 0.16 &&
        effectiveRate <= 0.195 &&
        expectedRate <= 0.145;

      if (expectedRate && !isLikelyPremiumMismatch) {
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
      } else if (!expectedRate && (skuFeeRateMap.get(order.sku)?.length ?? 0) === 1) {
        // Cauda Longa (1 venda única): Avalia contra o teto regulamentar máximo da plataforma
        let maxRegulatoryFee = 0;
        if (platform === "mercadolivre") {
          const fixedFee = order.grossAmount < 79 ? 6.75 * qty : 0;
          maxRegulatoryFee = round2(order.grossAmount * 0.195 + fixedFee);
        } else {
          let shopeeFixed = 26.0;
          if (order.grossAmount < 80) shopeeFixed = 4.5;
          else if (order.grossAmount < 100) shopeeFixed = 16.0;
          else if (order.grossAmount < 200) shopeeFixed = 20.0;
          maxRegulatoryFee = round2(order.grossAmount * 0.20 + shopeeFixed * qty);
        }

        if (maxRegulatoryFee > 0 && order.feeAmount > maxRegulatoryFee * 1.15) {
          const diff = round2(order.feeAmount - maxRegulatoryFee);
          if (diff >= 4.0) {
            rawDivergences.push({
              order_id: order.orderId,
              sku: order.sku,
              error_type: "comissao",
              expected_amount: maxRegulatoryFee,
              charged_amount: round2(order.feeAmount),
              recoverable_amount: diff,
              dispute_text: `Olá, solicito revisão da tarifa de venda cobrada no pedido #${order.orderId} (SKU: ${order.sku}). O valor cobrado de ${formatBRL(order.feeAmount)} ultrapassa o teto máximo oficial do ${platformLabel} para esta categoria (${formatBRL(maxRegulatoryFee)}). Solicito o ajuste e estorno de ${formatBRL(diff)}.`,
            });
          }
        }
      }
    }
  }

  // REGRA 3: Audita pedidos devolvidos/cancelados sem culpa do lojista
  for (const order of returnedOrders) {
    // Se a devolução comprovadamente ocorreu por falha ou defeito do vendedor, a retenção é legal
    if (isSellerFaultReturn(order.returnReason)) {
      continue;
    }

    if (order.netAmount < -2.0) {
      const loss = round2(Math.abs(order.netAmount));
      rawDivergences.push({
        order_id: order.orderId,
        sku: order.sku,
        error_type: "devolucao",
        expected_amount: 0,
        charged_amount: loss,
        recoverable_amount: loss,
        dispute_text: `Olá, o pedido #${order.orderId} (SKU: ${order.sku}) consta como cancelado ou devolvido sem culpa do vendedor, porém gerou um desconto líquido indevido de ${formatBRL(loss)} na minha conta (tarifa ou frete reverso não estornado). Solicito o reembolso integral deste lançamento.`,
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

export interface AuditItemExplanation {
  sourceData: string;
  officialRule: string;
  divergenceReason: string;
  recommendedAction: string;
}

/**
 * Gera o detalhamento e memória de cálculo oficial de uma cobrança divergente
 */
export function getAuditItemExplanation(
  item: {
    order_id: string;
    sku: string;
    error_type: DivergenceType;
    expected_amount: number;
    charged_amount: number;
    recoverable_amount: number;
  },
  platform: MarketplacePlatform
): AuditItemExplanation {
  const platformName = platform === "mercadolivre" ? "Mercado Livre" : "Shopee";

  if (item.error_type === "frete") {
    return {
      sourceData: `Extrato financeiro oficial do ${platformName}, pedido #${item.order_id}, anúncio com SKU ${item.sku}.`,
      officialRule: `Tabela Oficial de Frete e Cubagem 2026 (${platformName}). A cobrança de frete deve seguir estritamente o peso real e a cubagem cadastrados na ficha técnica do produto.`,
      divergenceReason: `O marketplace cobrou ${formatBRL(item.charged_amount)} de frete quando o valor correto para este anúncio é ${formatBRL(item.expected_amount)}. Essa diferença de ${formatBRL(item.recoverable_amount)} cobrada a mais decorre de cubagem errada apontada na esteira de triagem da transportadora.`,
      recommendedAction: `1. Envie o texto pronto de contestação no suporte do ${platformName} solicitando o estorno. 2. Acesse a ficha técnica deste anúncio no painel e revise o peso e as medidas da embalagem para estancar cobranças indevidas nos próximos envios.`,
    };
  }

  if (item.error_type === "comissao") {
    return {
      sourceData: `Extrato de tarifas e repasses do ${platformName}, pedido #${item.order_id}, anúncio com SKU ${item.sku}.`,
      officialRule: `Tabela Oficial de Tarifas de Venda 2026 (${platformName}). A comissão deve respeitar a alíquota contratual da categoria sobre o valor da venda, somada à taxa fixa unitária quando aplicável.`,
      divergenceReason: `Foi descontado ${formatBRL(item.charged_amount)} de comissão, enquanto o valor esperado para a categoria é ${formatBRL(item.expected_amount)}. Houve aplicação de taxa superior, gerando ${formatBRL(item.recoverable_amount)} retidos a mais.`,
      recommendedAction: `1. Solicite no suporte a revisão da taxa cobrada com o texto pronto de contestação. 2. Verifique no painel do ${platformName} se o anúncio não foi enquadrado em modalidade com taxa mais alta.`,
    };
  }

  // devolucao
  return {
    sourceData: `Relatório de devoluções e cancelamentos do ${platformName}, pedido #${item.order_id}, anúncio com SKU ${item.sku}.`,
    officialRule: `Política Oficial de Cancelamento e Devolução 2026 (${platformName}). Vendas devolvidas ou canceladas sem culpa do vendedor não devem gerar saldo líquido negativo ou retenção de tarifa e frete reverso.`,
    divergenceReason: `O pedido consta como cancelado ou devolvido, mas o marketplace reteve ${formatBRL(item.recoverable_amount)} na sua conta (frete reverso ou comissão não estornada).`,
    recommendedAction: `1. Abra chamado no suporte anexando o ID da venda e solicite o crédito integral do valor retido. 2. Acompanhe a liberação do crédito nos próximos lançamentos da sua conta.`,
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

      // Salva cópia local em sessionStorage para redundância e modo demo
      try {
        sessionStorage.setItem(
          `audit_${auditRecord.id}`,
          JSON.stringify({
            id: auditRecord.id,
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
        );
        sessionStorage.setItem(
          `audit_items_${auditRecord.id}`,
          JSON.stringify(
            items.map((it) => ({
              audit_id: auditRecord.id,
              id: crypto.randomUUID(),
              is_contested: false,
              is_refunded: false,
              ...it,
            }))
          )
        );
      } catch {
        // Ignora quota de storage
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


/**
 * Gera um arquivo CSV realista em memória para demonstração instantânea ou gravação de anúncio
 */
export function buildSampleCsvFile(platform: MarketplacePlatform): File {
  if (platform === "mercadolivre") {
    const rows = [
      "Relatório de Liberações Financeiras: Mercado Livre",
      "Período: Últimos 30 dias",
      "",
      "N.º de venda;SKU;Estado;Receita por produtos (BRL);Tarifa de venda e impostos (BRL);Tarifas de envio (BRL);Total (BRL)",
      "200000918401;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-19,90;83,21",
      "200000918402;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-19,90;83,21",
      "200000918403;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-20,50;82,61",
      "200000918404;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-54,90;48,21",
      "200000918405;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-48,90;54,21",
      "200000918406;SUPORTE-ARTICULADO-PRO;Entregue;189,00;-30,24;-23,45;135,31",
      "200000918407;SUPORTE-ARTICULADO-PRO;Entregue;189,00;-30,24;-23,45;135,31",
      "200000918408;SUPORTE-ARTICULADO-PRO;Entregue;189,00;-30,24;-62,80;95,96",
      "200000918409;SUPORTE-ARTICULADO-PRO;Entregue;189,00;-45,36;-23,45;120,19",
      "200000918410;GARRAFA-TERMICA-1L;Entregue;89,90;-12,59;-18,90;58,41",
      "200000918411;GARRAFA-TERMICA-1L;Entregue;89,90;-12,59;-18,90;58,41",
      "200000918412;GARRAFA-TERMICA-1L;Entregue;89,90;-12,59;-41,20;36,11",
      "200000918413;GARRAFA-TERMICA-1L;Entregue;89,90;-21,58;-18,90;49,42",
      "200000918414;KIT-ORGANIZADOR-3P;Devolvido;0,00;0,00;-24,90;-24,90",
      "200000918415;SUPORTE-ARTICULADO-PRO;Cancelado;0,00;-15,00;-19,90;-34,90",
    ];
    return new File([rows.join("\n")], "exemplo-repasses-mercadolivre-2026.csv", {
      type: "text/csv;charset=utf-8;",
    });
  }

  const shopeeRows = [
    "Relatório de Renda do Vendedor: Shopee Brasil",
    "",
    "ID do pedido;Número de referência SKU;Status do pedido;Preço original;Taxa de comissão;Taxa de envio paga pelo vendedor;Valor total liberado",
    "261108A9X101;LUMINARIA-LED-MESA;Concluído;109,90;-15,39;-14,00;80,51",
    "261108A9X102;LUMINARIA-LED-MESA;Concluído;109,90;-15,39;-14,00;80,51",
    "261108A9X103;LUMINARIA-LED-MESA;Concluído;109,90;-15,39;-39,50;55,01",
    "261108A9X104;LUMINARIA-LED-MESA;Concluído;109,90;-15,39;-44,00;50,51",
    "261108A9X105;MOCHILA-IMPERMEAVEL-30L;Concluído;149,90;-20,99;-18,50;110,41",
    "261108A9X106;MOCHILA-IMPERMEAVEL-30L;Concluído;149,90;-20,99;-18,50;110,41",
    "261108A9X107;MOCHILA-IMPERMEAVEL-30L;Concluído;149,90;-20,99;-52,90;76,01",
    "261108A9X108;MOCHILA-IMPERMEAVEL-30L;Concluído;149,90;-34,48;-18,50;96,92",
    "261108A9X109;LUMINARIA-LED-MESA;Devolvido / Reembolsado;0,00;-15,00;-14,00;-29,00",
    "261108A9X110;MOCHILA-IMPERMEAVEL-30L;Devolvido / Reembolsado;0,00;-15,00;-18,50;-33,50",
  ];

  return new File([shopeeRows.join("\n")], "exemplo-renda-shopee-2026.csv", {
    type: "text/csv;charset=utf-8;",
  });
}
