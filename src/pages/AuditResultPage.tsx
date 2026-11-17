import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import * as XLSX from "xlsx";
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
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { LiquidGlassNavbar } from "../components/ui/liquid-glass-navbar";
import { AnalyticsBento } from "../components/ui/analytics-bento";
import { MercadoLivreLogo, ShopeeLogo, ConfereAiLogo } from "../components/ui/marketplace-logos";
import { CheckoutModal } from "../components/ui/checkout-modal";

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
    badgeClass: "bg-amber-50 text-amber-800 border-amber-200/80",
    icon: <Package className="w-3.5 h-3.5 text-amber-600" />,
  },
  comissao: {
    label: "Comissão Divergente",
    badgeClass: "bg-indigo-50 text-indigo-800 border-indigo-200/80",
    icon: <Percent className="w-3.5 h-3.5 text-indigo-600" />,
  },
  devolucao: {
    label: "Devolução Não Estornada",
    badgeClass: "bg-rose-50 text-rose-800 border-rose-200/80",
    icon: <RotateCcw className="w-3.5 h-3.5 text-rose-600" />,
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

  // Estados do Modal Pix e Seleção de Plano
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanId] = useState<"pro" | "escala">("pro");
  const [selectedBilling] = useState<"monthly" | "yearly">("monthly");
  const [justUnlockedBanner, setJustUnlockedBanner] = useState(false);

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
          setItems(parsed.filter((item) => item.row_rank <= 2));
        }
      }
    } catch {
      // Sem itens locais
    }
  }, [auditId, isPro]);

  // Carrega dados iniciais da auditoria
  useEffect(() => {
    async function init() {
      if (!auditId) return;
      setLoading(true);

      let loadedAudit: AuditSummary | null = null;

      try {
        const { data: auditData } = await supabase
          .from("audits")
          .select("*")
          .eq("id", auditId)
          .single();

        if (auditData) {
          loadedAudit = auditData as AuditSummary;
        }
      } catch {
        // Fallback local
      }

      if (!loadedAudit) {
        try {
          const raw = sessionStorage.getItem(`audit_${auditId}`);
          if (raw) {
            loadedAudit = JSON.parse(raw) as AuditSummary;
          }
        } catch {
          // Sem cache local
        }
      }

      setAudit(loadedAudit);

      let userIsPro = false;
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
            userIsPro = true;
            setIsPro(true);
          }
        }
      } catch {
        // Modo offline
      }

      await loadAuditItems(userIsPro);
      setLoading(false);
    }

    init();
  }, [auditId, loadAuditItems]);

  // Supabase Realtime Listener para desbloquear no pagamento Pix
  useEffect(() => {
    if (!userId || isPro) return;

    const channel = supabase
      .channel(`profile-unlock-${userId}`)
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
            setIsCheckoutOpen(false);
            setJustUnlockedBanner(true);
            await loadAuditItems(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, isPro, loadAuditItems]);

  const handleCopyDispute = (item: AuditItem) => {
    navigator.clipboard.writeText(item.dispute_text);
    setCopiedRowId(item.id);
    setTimeout(() => setCopiedRowId(null), 2500);
  };

  const handleExportSpreadsheet = () => {
    if (!items.length) return;
    const rows = items.map((i) => ({
      "Item": i.row_rank,
      "ID do Pedido": i.order_id,
      "Produto (SKU)": i.sku,
      "Motivo do Erro": ERROR_BADGE[i.error_type]?.label || i.error_type,
      "Valor Correto (R$)": i.expected_amount,
      "Valor Cobrado a Mais (R$)": i.charged_amount,
      "Diferença a Devolver (R$)": i.recoverable_amount,
      "Status da Cobrança": i.is_refunded ? "Reembolsado" : i.is_contested ? "Contestado no Suporte" : "Pendente",
      "Mensagem Pronta para o Suporte": i.dispute_text,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Contestacoes");
    XLSX.writeFile(wb, `devolucoes-${audit?.platform || "marketplace"}-${auditId?.slice(0, 8)}.xlsx`);
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

  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.error_type === activeFilter);
  }, [items, activeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#171717] border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-xs uppercase tracking-[0.071em] text-[#666666]">
            Calculando divergências financeiras...
          </p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fafafa] p-6 text-center">
        <p className="font-medium text-[#171717] mb-4">Auditoria não encontrada.</p>
        <Link
          to="/"
          className="px-5 py-2.5 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-mono text-xs uppercase tracking-wider shadow-subtle"
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
    <div className="min-h-screen bg-[#fafafa] text-[#171717] pb-20">
      <LiquidGlassNavbar variant="result" platform={audit.platform} isPro={isPro} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-24 md:pb-10 space-y-6">
        {/* Banner de Desbloqueio ao Vivo pós-Pix */}
        {justUnlockedBanner && (
          <div className="p-3.5 rounded-[6px] bg-[#171717] text-white font-normal text-xs flex items-center justify-between shadow-subtle">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#297a3a] shrink-0" />
              <span>
                Pagamento confirmado! Todos os {audit.total_divergent_orders} pedidos e textos prontos para pedir o estorno no suporte foram liberados.
              </span>
            </span>
            <button
              onClick={() => setJustUnlockedBanner(false)}
              className="font-mono text-[11px] underline ml-4 cursor-pointer text-white/80 hover:text-white"
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
              <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
                Relatório de Valores a Recuperar
              </span>
              <span className="font-mono text-xs text-[#8f8f8f]">/</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.071em] text-[#171717]">
                {audit.platform === "mercadolivre" ? (
                  <>
                    <MercadoLivreLogo className="w-3.5 h-3.5 rounded-[2px]" />
                    <span>Mercado Livre</span>
                  </>
                ) : (
                  <>
                    <ShopeeLogo className="w-3.5 h-3.5 rounded-[2px]" />
                    <span>Shopee</span>
                  </>
                )}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#171717] tracking-[-0.05em] mt-1">
              Valores Cobrados a Mais nas Suas Vendas
            </h1>
            <p className="text-sm text-[#4d4d4d] mt-1 font-normal leading-relaxed">
              Conferimos <strong className="text-[#171717]">{audit.total_orders_analyzed} vendas</strong> da sua loja e encontramos{" "}
              <strong className="text-[#171717]">{audit.total_divergent_orders} pedidos</strong> onde o marketplace cobrou mais do que deveria.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-white border border-[#ebebeb] text-[#171717] hover:bg-[#fafafa] font-mono text-[11px] uppercase tracking-[0.071em] transition shadow-subtle-2 shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
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
        />

        {/* =========================================================================
            TABELA DE PEDIDOS DIVERGENTES (Amostra Gratuita + Paywall)
            ========================================================================= */}
        <section className="bg-white rounded-[6px] border border-[#ebebeb] shadow-subtle overflow-hidden">
          <div className="px-5 py-4 border-b border-[#ebebeb] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-base font-medium text-[#171717] tracking-tight">
                {isPro
                  ? `Lista Completa dos ${items.length} Pedidos com Cobrança a Mais`
                  : `Exemplo de Comprovação (2 de ${audit.total_divergent_orders} pedidos encontrados)`}
              </h2>
              <p className="text-xs text-[#4d4d4d] mt-0.5 font-normal">
                {isPro
                  ? "Copie os textos de contestação e envie no chat de suporte do marketplace para receber o estorno."
                  : "Abra esses 2 pedidos no painel do marketplace para conferir você mesmo a cobrança a maior antes de liberar os demais."}
              </p>
            </div>

            {/* Ações e Filtros */}
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
              {isPro && (
                <button
                  type="button"
                  onClick={handleExportSpreadsheet}
                  className="px-3 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-mono text-[11px] uppercase tracking-[0.071em] transition flex items-center gap-1.5 shadow-subtle cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha (.xlsx)</span>
                </button>
              )}

              {/* Filtros em Pílulas */}
              <div className="flex items-center gap-1 p-0.5 bg-[#fafafa] rounded-full border border-[#ebebeb] overflow-x-auto max-w-full">
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
                    className={`px-3 py-0.5 rounded-full font-mono text-[11px] uppercase tracking-[0.071em] transition cursor-pointer shrink-0 ${
                      activeFilter === tab.id
                        ? "bg-[#171717] text-white shadow-subtle-2"
                        : "text-[#666666] hover:text-[#171717]"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Linhas da Tabela */}
          <div className="divide-y divide-[#ebebeb]">
            {filteredItems.map((item) => {
              const badge = ERROR_BADGE[item.error_type];

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-[#fafafa] transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Identificação do Pedido */}
                  <div className="flex items-start gap-3">
                    <span className="w-7 h-7 rounded-[4px] bg-[#fafafa] border border-[#ebebeb] text-[#171717] font-mono text-xs flex items-center justify-center shrink-0 mt-0.5">
                      #{item.row_rank}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-medium text-[#171717]">
                          #{item.order_id}
                        </span>
                        <span
                          className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.071em] px-2 py-0.5 rounded-[4px] border border-[#ebebeb] bg-[#fafafa] text-[#171717]"
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </div>
                      <span className="font-mono text-xs text-[#666666] block mt-0.5">
                        SKU: <strong className="text-[#171717]">{item.sku}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Comparativo de Tarifas */}
                  <div className="flex items-center justify-between sm:justify-start sm:gap-6 text-xs w-full md:w-auto py-2.5 md:py-0 border-y md:border-y-0 border-[#ebebeb]">
                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.071em] text-[#666666] block">
                        Esperado
                      </span>
                      <span className="font-mono text-xs text-[#4d4d4d]">
                        {formatBRL(item.expected_amount)}
                      </span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.071em] text-[#666666] block">
                        Cobrado
                      </span>
                      <span className="font-mono text-xs text-[#4d4d4d]">
                        {formatBRL(item.charged_amount)}
                      </span>
                    </div>

                    <div>
                      <span className="font-mono text-[10px] uppercase tracking-[0.071em] text-[#297a3a] block">
                        A Recuperar
                      </span>
                      <span className="font-mono text-base font-medium text-[#297a3a]">
                        +{formatBRL(item.recoverable_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Ação: Copiar Texto e Checkboxes Pro */}
                  <div className="flex items-center gap-2.5 justify-end w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => handleCopyDispute(item)}
                      className="w-full md:w-auto justify-center px-3 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-mono text-xs transition flex items-center gap-1.5 cursor-pointer shadow-subtle"
                    >
                      {copiedRowId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#297a3a]" />
                          <span>Texto Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar Contestação</span>
                        </>
                      )}
                    </button>

                    {isPro && (
                      <div className="flex items-center gap-3 pl-2 font-mono text-[11px] text-[#666666] border-l border-[#ebebeb]">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.is_contested}
                            onChange={() => handleToggleStatus(item, "is_contested")}
                            className="rounded-[2px] text-[#171717]"
                          />
                          <span>Aberto</span>
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.is_refunded}
                            onChange={() => handleToggleStatus(item, "is_refunded")}
                            className="rounded-[2px] text-[#297a3a]"
                          />
                          <span>Reembolsado</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* =========================================================================
              SEÇÃO BORRADA + PAYWALL (Trava RLS Anti-Burla)
              ========================================================================= */}
          {!isPro && blurredAmounts.length > 0 && (
            <div className="relative border-t border-[#ebebeb]">
              {/* Linhas borradas usando apenas os valores R$ do array blurred_preview_amounts */}
              <div className="divide-y divide-[#ebebeb] select-none pointer-events-none filter blur-xs opacity-40">
                {blurredAmounts.slice(0, 7).map((amount, idx) => (
                  <div
                    key={idx}
                    className="p-4 sm:p-5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-[4px] bg-[#fafafa] border border-[#ebebeb] text-[#8f8f8f] font-mono text-xs flex items-center justify-center">
                        #{idx + 3}
                      </span>
                      <div>
                        <div className="font-mono text-sm font-medium text-[#171717]">
                          #2000094827{idx}
                        </div>
                        <div className="font-mono text-[11px] text-[#8f8f8f]">SKU-OCULTO-{idx + 3}</div>
                      </div>
                    </div>
                    <div className="font-mono text-base font-medium text-[#297a3a]">
                      +{formatBRL(amount)}
                    </div>
                    <div className="px-3 py-1.5 rounded-[6px] bg-[#fafafa] border border-[#ebebeb] text-[#8f8f8f] font-mono text-xs">
                      Copiar Contestação
                    </div>
                  </div>
                ))}
              </div>

              {/* Card de Conversão sobre o Blur */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-white/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <span className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.071em] px-3 py-0.5 rounded-full bg-[#fafafa] text-[#171717] border border-[#ebebeb] mb-2">
                  <Lock className="w-3.5 h-3.5 text-[#171717]" />
                  +{blurredAmounts.length} pedidos da sua lista aguardando liberação do estorno
                </span>

                <h3 className="text-2xl sm:text-3xl font-normal text-[#171717] tracking-[-0.05em] max-w-lg">
                  Receba esses {formatBRL(audit.total_recoverable)} de volta no seu caixa
                </h3>
                <p className="text-xs sm:text-sm text-[#4d4d4d] max-w-md mt-2 leading-relaxed font-normal">
                  Desbloqueie o número de todos os {audit.total_divergent_orders} pedidos, os produtos afetados e o texto pronto de contestação para pedir o estorno imediato no suporte.
                </p>

                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="mt-6 py-3 px-8 w-full sm:w-auto rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-medium text-sm transition-all shadow-subtle flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Desbloquear Relatório Completo ({audit.total_divergent_orders} Pedidos)</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="font-mono text-[11px] text-[#8f8f8f] mt-2">
                  Liberação automática em segundos via Pix, cancele quando quiser com 1 clique
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

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
          className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-[#ebebeb] p-3 shadow-subtle-2 flex items-center justify-between gap-3"
        >
          <div className="flex flex-col">
            <span className="font-mono text-[10px] uppercase tracking-[0.071em] text-[#666666]">
              Total a Recuperar
            </span>
            <span className="font-mono font-medium text-base text-[#297a3a] leading-tight">
              +{formatBRL(audit.total_recoverable)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            className="py-2 px-4 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-mono text-xs uppercase tracking-wider transition shadow-subtle flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Liberar Relatório Completo</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* Rodapé Corporativo B2B */}
      <footer className="mt-12 border-t border-[#ebebeb] py-8 text-center font-mono text-[11px] text-[#8f8f8f] bg-[#fafafa]">
        <ConfereAiLogo className="h-7 w-auto mx-auto mb-2 opacity-90" />
        ConfereAI: Auditoria Financeira de Repasses para E-commerce
      </footer>
    </div>
  );
}
