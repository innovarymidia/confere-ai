import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Copy,
  Check,
  CheckCircle2,
  Lock,
  ArrowRight,
  Package,
  Percent,
  RotateCcw,
  ArrowLeft,
  Download,
  ChevronDown,
  ChevronUp,
  FileText,
  Layers,
  Info,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { LiquidGlassNavbar } from "../components/ui/liquid-glass-navbar";
import { AnalyticsBento } from "../components/ui/analytics-bento";
import { MercadoLivreLogo, ShopeeLogo, ConfereAiLogo } from "../components/ui/marketplace-logos";
import { CheckoutModal } from "../components/ui/checkout-modal";
import { PrivacyModal } from "../components/ui/privacy-modal";
import { getAuditItemExplanation } from "../services/auditEngine";

interface AuditSummary {
  id: string;
  user_id: string | null;
  platform: "mercadolivre" | "shopee";
  total_orders_analyzed: number;
  total_divergent_orders: number;
  total_recoverable: number;
  frete_recoverable: number;
  comissao_recoverable: number;
  devolucao_recoverable: number;
  blurred_preview_amounts: number[];
}

interface AuditItem {
  id: string;
  row_rank: number;
  order_id: string;
  sku: string;
  error_type: "frete" | "comissao" | "devolucao";
  expected_amount: number;
  charged_amount: number;
  recoverable_amount: number;
  dispute_text: string;
  is_contested: boolean;
  is_refunded: boolean;
}

const ERROR_BADGE: Record<
  AuditItem["error_type"],
  { label: string; badgeClass: string; icon: React.ReactNode }
> = {
  frete: {
    label: "Frete Cubado / Peso",
    badgeClass: "bg-[#f3f3f7] text-[#000000] border-[#b9bbc6]",
    icon: <Package className="w-3.5 h-3.5 text-[#ff5900]" />,
  },
  comissao: {
    label: "Comissão Divergente",
    badgeClass: "bg-[#f3f3f7] text-[#000000] border-[#b9bbc6]",
    icon: <Percent className="w-3.5 h-3.5 text-[#ff5900]" />,
  },
  devolucao: {
    label: "Devolução Não Estornada",
    badgeClass: "bg-[#f3f3f7] text-[#000000] border-[#b9bbc6]",
    icon: <RotateCcw className="w-3.5 h-3.5 text-[#ff5900]" />,
  },
};

function formatBRL(value: number): string {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function AuditResultPage() {
  const { id: auditId } = useParams<{ id: string }>();

  const [audit, setAudit] = useState<AuditSummary | null>(null);
  const [items, setItems] = useState<AuditItem[]>([]);
  const [isPro, setIsPro] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedRowId, setCopiedRowId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<"all" | "frete" | "comissao" | "devolucao">("all");
  const [viewMode, setViewMode] = useState<"orders" | "skus">("orders");
  const [selectedSkuFilter, setSelectedSkuFilter] = useState<string | null>(null);
  const [expandedItemIds, setExpandedItemIds] = useState<Set<string>>(new Set());

  const toggleExpandItem = (id: string) => {
    setExpandedItemIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Estados do Modal Pix e Seleção de Plano
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanId] = useState<"pro" | "escala">("pro");
  const [selectedBilling] = useState<"monthly" | "yearly">("monthly");
  const [justUnlockedBanner, setJustUnlockedBanner] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Busca itens via RLS (2 se visitante, todos se Pro)
  const loadAuditItems = useCallback(async (proStatus = isPro) => {
    if (!auditId) return;

    try {
      const { data, error } = await supabase
        .from("audit_items")
        .select("*")
        .eq("audit_id", auditId)
        .order("row_rank", { ascending: true });

      if (!error && data && data.length > 0) {
        // Se o usuário está em status Pro mas a consulta RLS retornou apenas os 2 itens iniciais,
        // carrega os demais itens a partir do cache local seguro ou renova a sessão para reconsultar
        if (proStatus && data.length <= 2) {
          const raw = sessionStorage.getItem(`audit_items_${auditId}`);
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as AuditItem[];
              if (parsed.length > data.length) {
                setItems(parsed);
                return;
              }
            } catch {
              // Segue para revalidação
            }
          }

          try {
            await supabase.auth.refreshSession();
            const { data: retryData } = await supabase
              .from("audit_items")
              .select("*")
              .eq("audit_id", auditId)
              .order("row_rank", { ascending: true });

            if (retryData && retryData.length > 2) {
              setItems(retryData as AuditItem[]);
              return;
            }
          } catch {
            // Continua com itens disponíveis
          }
        }
        setItems(data as AuditItem[]);
        return;
      }
    } catch {
      // Ignora erro de rede e usa fallback local
    }

    // Fallback: modo demo/offline em sessionStorage
    try {
      const raw = sessionStorage.getItem(`audit_items_${auditId}`);
      if (raw) {
        const parsed = JSON.parse(raw) as AuditItem[];
        if (proStatus) {
          setItems(parsed);
        } else {
          setItems(parsed.slice(0, 2));
        }
      }
    } catch {
      // Ignora erro
    }
  }, [auditId, isPro]);

  // Carrega cabeçalho da auditoria e dados do usuário
  useEffect(() => {
    async function init() {
      if (!auditId) return;
      try {
        sessionStorage.setItem("last_audit_id", auditId);
      } catch {
        // Ignora erro de storage
      }
      setLoading(true);

      let currentIsPro = false;

      // 1. Verifica se usuário autenticado é Pro
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setUserId(user.id);
          const { data: profile } = await supabase
            .from("profiles")
            .select("is_pro")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.is_pro) {
            currentIsPro = true;
            setIsPro(true);
          }
        }
      } catch {
        // Modo local
      }

      // 2. Busca resumo da auditoria no Supabase
      try {
        const { data, error } = await supabase
          .from("audits")
          .select("*")
          .eq("id", auditId)
          .maybeSingle();

        if (!error && data) {
          setAudit(data as AuditSummary);
          await loadAuditItems(currentIsPro);
          setLoading(false);
          return;
        }
      } catch {
        // Ignora erro de rede e usa fallback local
      }

      // Fallback sessionStorage
      try {
        const raw = sessionStorage.getItem(`audit_${auditId}`);
        if (raw) {
          const parsed = JSON.parse(raw) as AuditSummary;
          setAudit(parsed);
          await loadAuditItems(currentIsPro);
        }
      } catch {
        // Ignora erro
      }

      setLoading(false);
    }

    init();
  }, [auditId, loadAuditItems]);

  // Realtime: escuta atualizações de status Pro na tabela profiles
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`audit_profile_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        async (payload) => {
          const updatedProfile = payload.new as { is_pro?: boolean };
          if (updatedProfile?.is_pro) {
            setIsPro(true);
            setJustUnlockedBanner(true);
            await loadAuditItems(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, loadAuditItems]);

  const handleCopyDispute = (item: AuditItem) => {
    navigator.clipboard.writeText(item.dispute_text);
    setCopiedRowId(item.id);
    setTimeout(() => setCopiedRowId(null), 3000);
  };

  const handleExportSpreadsheet = async () => {
    if (!items || items.length === 0) return;

    const dataToExport = items.map((item) => ({
      Rank: item.row_rank,
      Pedido: item.order_id,
      SKU: item.sku,
      TipoErro: ERROR_BADGE[item.error_type]?.label || item.error_type,
      ValorEsperado: item.expected_amount,
      ValorCobrado: item.charged_amount,
      ValorARecuperar: item.recoverable_amount,
      TextoContestacao: item.dispute_text,
      Contestado: item.is_contested ? "Sim" : "Não",
      Reembolsado: item.is_refunded ? "Sim" : "Não",
    }));

    const XLSX = await import("xlsx");
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Divergencias");
    XLSX.writeFile(
      workbook,
      `ConfereAI_${audit?.platform || "Marketplace"}_${auditId?.slice(0, 8)}.xlsx`
    );
  };

  const handleExportCSV = () => {
    if (!items || items.length === 0) return;

    // Sanitização contra CSV Injection / Formula Injection (CWE-1236)
    const escapeCsvCell = (val: unknown): string => {
      const str = String(val ?? "").replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(str)) {
        return `"'${str}"`;
      }
      return `"${str}"`;
    };

    const headers = [
      "Rank",
      "Pedido",
      "SKU",
      "Tipo Divergencia",
      "Valor Esperado (R$)",
      "Valor Cobrado (R$)",
      "Valor a Recuperar (R$)",
      "Contestado",
      "Reembolsado",
      "Texto Contestacao",
    ];

    const rows = items.map((i) => [
      i.row_rank,
      escapeCsvCell(i.order_id),
      escapeCsvCell(i.sku),
      escapeCsvCell(ERROR_BADGE[i.error_type]?.label || i.error_type),
      i.expected_amount.toFixed(2).replace(".", ","),
      i.charged_amount.toFixed(2).replace(".", ","),
      i.recoverable_amount.toFixed(2).replace(".", ","),
      i.is_contested ? "Sim" : "Não",
      i.is_refunded ? "Sim" : "Não",
      escapeCsvCell(i.dispute_text),
    ]);

    const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ConfereAI_Divergencias_${audit?.platform || "Marketplace"}_${auditId?.slice(0, 8)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleToggleStatus = async (
    item: AuditItem,
    field: "is_contested" | "is_refunded"
  ) => {
    if (!isPro) return;
    const newValue = !item[field];

    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, [field]: newValue } : row))
    );

    try {
      await supabase
        .from("audit_items")
        .update({ [field]: newValue })
        .eq("id", item.id);
    } catch {
      // Offline fallback
    }
  };

  interface SkuAggregatedGroup {
    sku: string;
    totalRecoverable: number;
    ordersCount: number;
    items: AuditItem[];
    primaryErrorType: AuditItem["error_type"];
    freteCount: number;
    comissaoCount: number;
    devolucaoCount: number;
    listingAction: string;
  }

  const skuGroups = useMemo<SkuAggregatedGroup[]>(() => {
    const map = new Map<string, AuditItem[]>();
    for (const item of items) {
      const list = map.get(item.sku) || [];
      list.push(item);
      map.set(item.sku, list);
    }

    const platformName = audit?.platform === "mercadolivre" ? "Mercado Livre" : "Shopee";
    const groups: SkuAggregatedGroup[] = [];

    for (const [sku, skuItems] of map.entries()) {
      const totalRecoverable = skuItems.reduce((acc, i) => acc + i.recoverable_amount, 0);
      const freteCount = skuItems.filter((i) => i.error_type === "frete").length;
      const comissaoCount = skuItems.filter((i) => i.error_type === "comissao").length;
      const devolucaoCount = skuItems.filter((i) => i.error_type === "devolucao").length;

      let primaryErrorType: AuditItem["error_type"] = "frete";
      if (comissaoCount >= freteCount && comissaoCount >= devolucaoCount) {
        primaryErrorType = "comissao";
      } else if (devolucaoCount >= freteCount && devolucaoCount >= comissaoCount) {
        primaryErrorType = "devolucao";
      }

      let listingAction = "";
      if (primaryErrorType === "frete") {
        listingAction = `Revisar dimensões e peso da embalagem na ficha técnica deste anúncio no ${platformName} para estancar cobranças indevidas de frete nos próximos envios.`;
      } else if (primaryErrorType === "comissao") {
        listingAction = `Verificar a categoria selecionada e a alíquota contratual deste anúncio no painel do ${platformName} para evitar comissões majoradas.`;
      } else {
        listingAction = `Acompanhar as devoluções deste SKU para garantir que o frete reverso não seja debitado indevidamente em cada retorno.`;
      }

      groups.push({
        sku,
        totalRecoverable,
        ordersCount: skuItems.length,
        items: skuItems,
        primaryErrorType,
        freteCount,
        comissaoCount,
        devolucaoCount,
        listingAction,
      });
    }

    return groups.sort((a, b) => b.totalRecoverable - a.totalRecoverable);
  }, [items, audit?.platform]);

  const filteredSkuGroups = useMemo(() => {
    if (activeFilter === "all") return skuGroups;
    return skuGroups.filter((g) => {
      if (activeFilter === "frete") return g.freteCount > 0;
      if (activeFilter === "comissao") return g.comissaoCount > 0;
      if (activeFilter === "devolucao") return g.devolucaoCount > 0;
      return true;
    });
  }, [skuGroups, activeFilter]);

  const filteredItems = useMemo(() => {
    let result = items;
    if (activeFilter !== "all") {
      result = result.filter((item) => item.error_type === activeFilter);
    }
    if (selectedSkuFilter) {
      result = result.filter((item) => item.sku === selectedSkuFilter);
    }
    return result;
  }, [items, activeFilter, selectedSkuFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#ffffff]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#000000] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
            Calculando divergências financeiras...
          </p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#ffffff] p-6 text-center">
        <p className="font-semibold text-lg text-[#000000] mb-4">Auditoria não encontrada.</p>
        <Link
          to="/"
          className="px-6 py-3 rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-white font-semibold text-xs uppercase tracking-[-0.01em]"
        >
          Fazer Nova Auditoria
        </Link>
      </div>
    );
  }

  const blurredAmounts = Array.isArray(audit.blurred_preview_amounts)
    ? audit.blurred_preview_amounts
    : [];

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#000000] flex flex-col justify-between">
      <div>
        <LiquidGlassNavbar variant="result" platform={audit.platform} isPro={isPro} />

        <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-36 sm:pt-40 pb-24 md:pb-12 space-y-6">
          {/* Banner de Desbloqueio ao Vivo pós-Pix */}
          {justUnlockedBanner && (
            <div className="p-4 rounded-[12px] bg-[#000000] text-white font-normal text-xs flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#ff5900] shrink-0" />
                <span>
                  Pagamento confirmado! Todos os {audit.total_divergent_orders} pedidos e textos prontos para pedir o estorno no suporte foram liberados.
                </span>
              </span>
              <button
                onClick={() => setJustUnlockedBanner(false)}
                className="text-xs underline ml-4 cursor-pointer text-white/80 hover:text-white"
              >
                Fechar
              </button>
            </div>
          )}

          {/* =========================================================================
              CABEÇALHO DA CONFERÊNCIA
              ========================================================================= */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
                  Relatório de Valores a Recuperar
                </span>
                <span className="text-xs text-[#8b8d98]">/</span>
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[-0.01em] text-[#000000]">
                  {audit.platform === "mercadolivre" ? (
                    <>
                      <MercadoLivreLogo className="w-3.5 h-3.5 rounded-[4px]" />
                      <span>Mercado Livre</span>
                    </>
                  ) : (
                    <>
                      <ShopeeLogo className="w-3.5 h-3.5 rounded-[4px]" />
                      <span>Shopee</span>
                    </>
                  )}
                </div>
              </div>
              <h1 className="text-2xl sm:text-4xl font-semibold text-[#000000] tracking-[-0.025em] mt-1">
                Valores Cobrados a Mais nas Suas Vendas
              </h1>
              <p className="text-sm sm:text-base text-[#60646c] mt-1 font-normal leading-relaxed tracking-[-0.01em]">
                Auditamos <strong className="text-[#000000] font-semibold">{audit.total_orders_analyzed} vendas</strong> da sua loja e encontramos{" "}
                <strong className="text-[#000000] font-semibold">{audit.total_divergent_orders} pedidos</strong> onde o marketplace cobrou mais do que deveria.
              </p>
            </div>

            <Link
              to="/"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-[12px] bg-[#ffffff] border border-[#b9bbc6] text-[#000000] hover:bg-[#f3f3f7] text-xs font-semibold uppercase tracking-[-0.01em] transition shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Outra Planilha</span>
            </Link>
          </div>

          {/* =========================================================================
              BENTO GRID ANALYTICS
              ========================================================================= */}
          <AnalyticsBento
            totalRecoverable={audit.total_recoverable}
            freteRecoverable={audit.frete_recoverable}
            comissaoRecoverable={audit.comissao_recoverable}
            devolucaoRecoverable={audit.devolucao_recoverable}
            totalOrdersAnalyzed={audit.total_orders_analyzed}
            totalDivergentOrders={audit.total_divergent_orders}
            platform={audit.platform}
            topDivergentOrders={items.slice(0, 5).map((i) => ({
              orderId: i.order_id,
              sku: i.sku,
              expectedAmount: i.expected_amount,
              chargedAmount: i.charged_amount,
              recoverableAmount: i.recoverable_amount,
              errorType: i.error_type,
            }))}
          />

          {/* =========================================================================
              TABELA DE PEDIDOS DIVERGENTES (Amostra Gratuita + Paywall)
              ========================================================================= */}
          <section className="bg-[#ffffff] rounded-[12px] border border-[#b9bbc6] overflow-hidden">
            <div className="px-6 py-5 border-b border-[#b9bbc6] flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-[#000000] tracking-[-0.01em]">
                  {viewMode === "orders"
                    ? isPro
                      ? `Lista Completa dos ${items.length} Pedidos com Cobrança a Mais`
                      : `Exemplo de Comprovação (2 de ${audit.total_divergent_orders} pedidos encontrados)`
                    : isPro
                    ? `Diagnóstico de Sangria por Anúncio (${skuGroups.length} Anúncios com Cobrança a Mais)`
                    : `Amostra de Anúncios com Sangria Financeira`}
                </h2>
                <p className="text-xs sm:text-sm text-[#60646c] mt-0.5 font-normal tracking-[-0.01em]">
                  {viewMode === "orders"
                    ? isPro
                      ? "Copie os textos de contestação e envie no chat de suporte do marketplace para receber o estorno."
                      : "Abra esses 2 pedidos no painel do marketplace para conferir você mesmo a cobrança a maior antes de liberar os demais."
                    : "Identifique os produtos que geram prejuízo contínuo para estancar cobranças indevidas diretamente na ficha técnica do anúncio."}
                </p>
              </div>

              {/* Ações, Seletor de Visão e Filtros */}
              <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
                {/* Seletor de Visão (Por Pedido vs Por Anúncio) */}
                <div className="flex items-center gap-1 p-1 bg-[#f3f3f7] rounded-[12px] border border-[#b9bbc6]">
                  <button
                    type="button"
                    onClick={() => setViewMode("orders")}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold uppercase tracking-[-0.01em] transition cursor-pointer flex items-center gap-1.5 ${
                      viewMode === "orders"
                        ? "bg-[#000000] text-white shadow-xs"
                        : "text-[#60646c] hover:text-[#000000]"
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Por Pedido</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("skus")}
                    className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold uppercase tracking-[-0.01em] transition cursor-pointer flex items-center gap-1.5 ${
                      viewMode === "skus"
                        ? "bg-[#000000] text-white shadow-xs"
                        : "text-[#60646c] hover:text-[#000000]"
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Por Anúncio (Sangria)</span>
                  </button>
                </div>

                {isPro && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportCSV}
                      className="px-3 py-2 rounded-[12px] bg-[#f3f3f7] hover:bg-[#ffffff] text-[#000000] border border-[#b9bbc6] text-xs font-semibold uppercase tracking-[-0.01em] transition flex items-center gap-1.5 cursor-pointer"
                      title="Exportar dados em formato CSV para Excel ou ERP"
                    >
                      <Download className="w-3.5 h-3.5 text-[#ff5900]" />
                      <span>Exportar CSV</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleExportSpreadsheet}
                      className="px-3.5 py-2 rounded-[12px] bg-[#000000] hover:bg-[#15191e] text-white text-xs font-semibold uppercase tracking-[-0.01em] transition flex items-center gap-1.5 cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Baixar .xlsx</span>
                    </button>
                  </div>
                )}

                {/* Filtros em Pílulas */}
                <div className="flex items-center gap-1 p-1 bg-[#f3f3f7] rounded-[12px] border border-[#b9bbc6] overflow-x-auto max-w-full">
                  {(
                    [
                      { id: "all", label: "Todos" },
                      { id: "frete", label: "Frete" },
                      { id: "comissao", label: "Comissão" },
                      { id: "devolucao", label: "Devoluções" },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveFilter(tab.id)}
                      className={`px-3 py-1 rounded-[8px] text-xs font-semibold uppercase tracking-[-0.01em] transition cursor-pointer shrink-0 ${
                        activeFilter === tab.id
                          ? "bg-[#000000] text-white"
                          : "text-[#60646c] hover:text-[#000000]"
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Aviso de Filtro Ativo por Anúncio/SKU */}
            {selectedSkuFilter && (
              <div className="px-6 py-2.5 bg-[#f3f3f7] border-b border-[#b9bbc6] flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
                    Filtro ativo por Anúncio:
                  </span>
                  <span className="px-2.5 py-0.5 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6] font-semibold text-[#000000]">
                    {selectedSkuFilter}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedSkuFilter(null)}
                  className="text-xs font-semibold text-[#ff5900] hover:text-[#e04f00] cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar Filtro</span>
                </button>
              </div>
            )}

            {/* CONTEÚDO: Visão por Pedido */}
            {viewMode === "orders" && (
              <div className="divide-y divide-[#b9bbc6]">
                {filteredItems.map((item) => {
                  const badge = ERROR_BADGE[item.error_type];
                  const isExpanded = expandedItemIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className="p-5 sm:p-6 hover:bg-[#f3f3f7]/50 transition flex flex-col gap-4"
                    >
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        {/* Identificação do Pedido */}
                        <div className="flex items-start gap-3">
                          <span className="w-8 h-8 rounded-[6px] bg-[#f3f3f7] border border-[#b9bbc6] text-[#000000] text-xs font-semibold flex items-center justify-center shrink-0 mt-0.5">
                            #{item.row_rank}
                          </span>

                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-semibold text-[#000000]">
                                #{item.order_id}
                              </span>
                              <span
                                className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[-0.01em] px-2.5 py-0.5 rounded-[6px] border border-[#b9bbc6] bg-[#f3f3f7] text-[#000000]"
                              >
                                {badge.icon}
                                {badge.label}
                              </span>
                            </div>
                            <span className="text-xs text-[#60646c] block mt-0.5 tracking-[-0.01em]">
                              SKU: <strong className="text-[#000000]">{item.sku}</strong>
                            </span>
                          </div>
                        </div>

                        {/* Comparativo de Tarifas */}
                        <div className="flex items-center justify-between sm:justify-start sm:gap-6 text-xs w-full md:w-auto py-2.5 md:py-0 border-y md:border-y-0 border-[#b9bbc6]">
                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#6f737b] block">
                              Esperado
                            </span>
                            <span className="text-xs font-medium text-[#60646c]">
                              {formatBRL(item.expected_amount)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#6f737b] block">
                              Cobrado
                            </span>
                            <span className="text-xs font-medium text-[#60646c]">
                              {formatBRL(item.charged_amount)}
                            </span>
                          </div>

                          <div>
                            <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#000000] block">
                              A Recuperar
                            </span>
                            <span className="text-base font-semibold text-[#000000]">
                              +{formatBRL(item.recoverable_amount)}
                            </span>
                          </div>
                        </div>

                        {/* Ações: Memória de Cálculo, Copiar Texto e Checkboxes Pro */}
                        <div className="flex flex-wrap items-center gap-2.5 justify-end w-full md:w-auto">
                          {/* Botão Memória de Cálculo (Raio-X) */}
                          <button
                            type="button"
                            onClick={() => toggleExpandItem(item.id)}
                            className="px-3 py-2 rounded-[12px] bg-[#ffffff] hover:bg-[#f3f3f7] border border-[#b9bbc6] text-[#000000] text-xs font-semibold tracking-[-0.01em] transition flex items-center gap-1.5 cursor-pointer"
                          >
                            <Info className="w-3.5 h-3.5 text-[#ff5900]" />
                            <span>{isExpanded ? "Ocultar Detalhes" : "Memória de Cálculo"}</span>
                            {isExpanded ? (
                              <ChevronUp className="w-3.5 h-3.5 text-[#60646c]" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-[#60646c]" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleCopyDispute(item)}
                            className="px-4 py-2 rounded-[12px] bg-[#000000] hover:bg-[#15191e] text-white text-xs font-semibold tracking-[-0.01em] transition flex items-center gap-1.5 cursor-pointer"
                          >
                            {copiedRowId === item.id ? (
                              <>
                                <Check className="w-4 h-4 text-[#ff5900]" />
                                <span>Texto Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-4 h-4" />
                                <span>Copiar Contestação</span>
                              </>
                            )}
                          </button>

                          {isPro && (
                            <div className="flex items-center gap-3 pl-3 text-xs text-[#60646c] border-l border-[#b9bbc6]">
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.is_contested}
                                  onChange={() => handleToggleStatus(item, "is_contested")}
                                  className="rounded-[4px] text-[#000000]"
                                />
                                <span>Aberto</span>
                              </label>
                              <label className="inline-flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.is_refunded}
                                  onChange={() => handleToggleStatus(item, "is_refunded")}
                                  className="rounded-[4px] text-[#ff5900]"
                                />
                                <span>Reembolsado</span>
                              </label>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Painel Expansível de Memória de Cálculo e Origem do Dado */}
                      {isExpanded && (() => {
                        const explanation = getAuditItemExplanation(item, audit.platform);

                        return (
                          <div className="pt-4 border-t border-[#b9bbc6] bg-[#f3f3f7] -mx-5 -mb-5 sm:-mx-6 sm:-mb-6 p-5 sm:p-6 space-y-3 rounded-b-[12px]">
                            <div className="flex items-center gap-2 mb-1">
                              <Info className="w-4 h-4 text-[#ff5900] shrink-0" />
                              <h4 className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#000000]">
                                Raio-X da Cobrança e Memória de Cálculo Oficial
                              </h4>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                              <div className="bg-[#ffffff] p-3.5 rounded-[12px] border border-[#b9bbc6]">
                                <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] block mb-1">
                                  Origem da Informação no Marketplace
                                </span>
                                <p className="text-[#000000] font-normal leading-relaxed">
                                  {explanation.sourceData}
                                </p>
                              </div>

                              <div className="bg-[#ffffff] p-3.5 rounded-[12px] border border-[#b9bbc6]">
                                <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] block mb-1">
                                  Regra Oficial Aplicada (Tabela 2026)
                                </span>
                                <p className="text-[#000000] font-normal leading-relaxed">
                                  {explanation.officialRule}
                                </p>
                              </div>

                              <div className="bg-[#ffffff] p-3.5 rounded-[12px] border border-[#b9bbc6]">
                                <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] block mb-1">
                                  Por que o Valor Divergiu?
                                </span>
                                <p className="text-[#000000] font-normal leading-relaxed">
                                  {explanation.divergenceReason}
                                </p>
                              </div>

                              <div className="bg-[#ffffff] p-3.5 rounded-[12px] border border-[#b9bbc6]">
                                <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] block mb-1">
                                  Ação Recomendada no Anúncio
                                </span>
                                <p className="text-[#000000] font-normal leading-relaxed">
                                  {explanation.recommendedAction}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}

            {/* CONTEÚDO: Visão por Anúncio (Sangria por SKU) */}
            {viewMode === "skus" && (
              <div className="divide-y divide-[#b9bbc6]">
                {filteredSkuGroups.map((group) => {
                  const primaryBadge = ERROR_BADGE[group.primaryErrorType];

                  return (
                    <div
                      key={group.sku}
                      className="p-5 sm:p-6 hover:bg-[#f3f3f7]/50 transition flex flex-col gap-4"
                    >
                      {/* Topo do Card de SKU */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <span className="px-3 py-1 rounded-[6px] bg-[#000000] text-white text-xs font-semibold tracking-[-0.01em]">
                            SKU: {group.sku}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[-0.01em] px-2.5 py-0.5 rounded-[6px] border border-[#b9bbc6] bg-[#f3f3f7] text-[#000000]">
                            {primaryBadge.icon}
                            <span>Causa Principal: {primaryBadge.label}</span>
                          </span>
                          <span className="text-xs font-medium text-[#60646c]">
                            {group.ordersCount} {group.ordersCount === 1 ? "pedido afetado" : "pedidos afetados"}
                          </span>
                        </div>

                        <div className="flex items-baseline gap-2">
                          <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
                            Prejuízo Acumulado:
                          </span>
                          <span className="text-lg font-semibold text-[#000000]">
                            +{formatBRL(group.totalRecoverable)}
                          </span>
                        </div>
                      </div>

                      {/* Diagnóstico de Sangria e Ação Preventiva */}
                      <div className="p-3.5 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                        <div>
                          <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#000000] block mb-0.5">
                            Estanque a Sangria na Raiz:
                          </span>
                          <p className="text-[#60646c] font-normal leading-relaxed">
                            {group.listingAction}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setSelectedSkuFilter(group.sku);
                            setViewMode("orders");
                          }}
                          className="px-3.5 py-2 rounded-[12px] bg-[#000000] hover:bg-[#15191e] text-white font-semibold text-xs uppercase tracking-[-0.01em] transition flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                        >
                          <span>Ver {group.ordersCount} {group.ordersCount === 1 ? "Pedido" : "Pedidos"}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Detalhamento dos Tipos de Erro deste SKU */}
                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-[#60646c]">
                        <span className="font-semibold uppercase tracking-[-0.01em]">Composição:</span>
                        {group.freteCount > 0 && (
                          <span className="px-2 py-0.5 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6]">
                            {group.freteCount} {group.freteCount === 1 ? "cobrança indevida de frete" : "cobranças indevidas de frete"}
                          </span>
                        )}
                        {group.comissaoCount > 0 && (
                          <span className="px-2 py-0.5 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6]">
                            {group.comissaoCount} {group.comissaoCount === 1 ? "comissão divergente" : "comissões divergentes"}
                          </span>
                        )}
                        {group.devolucaoCount > 0 && (
                          <span className="px-2 py-0.5 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6]">
                            {group.devolucaoCount} {group.devolucaoCount === 1 ? "devolução não estornada" : "devoluções não estornadas"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* =========================================================================
                SEÇÃO BORRADA + PAYWALL (Trava RLS Anti-Burla)
                ========================================================================= */}
            {!isPro && blurredAmounts.length > 0 && (
              <div className="relative border-t border-[#b9bbc6]">
                {/* Linhas borradas usando apenas os valores R$ do array blurred_preview_amounts */}
                <div className="divide-y divide-[#b9bbc6] select-none pointer-events-none filter blur-xs opacity-40">
                  {blurredAmounts.slice(0, 7).map((amount, idx) => (
                    <div
                      key={idx}
                      className="p-5 sm:p-6 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-[6px] bg-[#f3f3f7] border border-[#b9bbc6] text-[#8b8d98] text-xs font-semibold flex items-center justify-center">
                          #{idx + 3}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-[#000000]">
                            #2000094827{idx}
                          </div>
                          <div className="text-xs text-[#8b8d98]">SKU-OCULTO-{idx + 3}</div>
                        </div>
                      </div>
                      <div className="text-base font-semibold text-[#000000]">
                        +{formatBRL(amount)}
                      </div>
                      <div className="px-4 py-2 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] text-[#8b8d98] text-xs">
                        Copiar Contestação
                      </div>
                    </div>
                  ))}
                </div>

                {/* Card de Conversão sobre o Blur com Botão Ember */}
                <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-white/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[-0.01em] px-3 py-1 rounded-[6px] bg-[#f3f3f7] text-[#000000] border border-[#b9bbc6] mb-2">
                    <Lock className="w-3.5 h-3.5 text-[#ff5900]" />
                    +{blurredAmounts.length} pedidos da sua lista aguardando liberação do estorno
                  </span>

                  <h3 className="text-2xl sm:text-3xl font-semibold text-[#000000] tracking-[-0.025em] max-w-lg">
                    Receba esses {formatBRL(audit.total_recoverable)} de volta no seu caixa
                  </h3>
                  <p className="text-xs sm:text-sm text-[#60646c] max-w-md mt-2 leading-relaxed font-normal tracking-[-0.01em]">
                    {viewMode === "orders"
                      ? `Desbloqueie o número de todos os ${audit.total_divergent_orders} pedidos, os produtos afetados e o texto pronto de contestação para pedir o estorno imediato no suporte.`
                      : `Desbloqueie o relatório completo para visualizar o diagnóstico de sangria de todos os anúncios e SKUs da sua loja.`}
                  </p>

                  <button
                    type="button"
                    onClick={() => setIsCheckoutOpen(true)}
                    className="mt-6 py-3.5 px-8 w-full sm:w-auto rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-white font-semibold text-sm tracking-[-0.01em] transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>Desbloquear Relatório Completo ({audit.total_divergent_orders} Pedidos)</span>
                    <ArrowRight className="w-4 h-4 text-white" />
                  </button>
                  <p className="text-xs text-[#8b8d98] mt-2 tracking-[-0.01em]">
                    Liberação automática em segundos via Pix, cancele quando quiser com 1 clique
                  </p>
                </div>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Modal de Checkout Pix Transparente com Escolha de Plano e Ciclo */}
      {audit && (
        <CheckoutModal
          key={`${isCheckoutOpen}-${selectedPlanId}-${selectedBilling}`}
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          initialPlanId={selectedPlanId}
          initialBilling={selectedBilling}
          auditId={audit.id}
          totalOrders={audit.total_divergent_orders}
          onSuccess={async () => {
            setIsPro(true);
            setJustUnlockedBanner(true);
            await loadAuditItems(true);
          }}
        />
      )}

      {/* Barra Fixa de Conversao no Mobile (Sticky Bottom Bar) */}
      {!isPro && !isCheckoutOpen && audit && (
        <aside
          aria-label="Acao de desbloqueio mobile"
          className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-[#b9bbc6] p-3 flex items-center justify-between gap-3"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
              Total a Recuperar
            </span>
            <span className="font-semibold text-base text-[#000000] leading-tight">
              +{formatBRL(audit.total_recoverable)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            className="py-2.5 px-4 rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-white text-xs font-semibold uppercase tracking-[-0.01em] transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Liberar Relatório Completo</span>
            <ArrowRight className="w-3.5 h-3.5 text-white" />
          </button>
        </aside>
      )}

      {/* Rodapé Full-Bleed Abyss (#000710) */}
      <footer className="w-full bg-[#000710] text-white py-12 px-4 sm:px-6 mt-16 border-t border-[#15191e]">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#b9bbc6]">
          <div className="flex items-center gap-3">
            <ConfereAiLogo className="h-7 w-auto rounded-[6px]" />
            <span>ConfereAI: Auditoria Financeira Independente para E-commerce</span>
          </div>
          <div className="flex items-center gap-3 text-[11px] text-[#6f737b]">
            <button
              type="button"
              onClick={() => setIsPrivacyOpen(true)}
              className="hover:text-white underline cursor-pointer"
            >
              Privacidade e LGPD
            </button>
            <span>•</span>
            <span>Tabelas Oficiais 2026: Mercado Livre e Shopee</span>
          </div>
        </div>
      </footer>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}

export default AuditResultPage;
