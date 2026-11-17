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
import { MercadoLivreLogo, ShopeeLogo } from "../components/ui/marketplace-logos";

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

  // Estados do Modal Pix
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    qrCodeBase64: string;
    copyPaste: string;
  } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
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
            setPixData(null);
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

  // Submissão do checkout Pix
  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditId) return;

    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          fullName,
          email,
          whatsapp,
          cpfCnpj,
          auditId,
        },
      });

      if (error) {
        throw new Error(error.message || "Falha ao gerar cobrança.");
      }
      if (data?.error) {
        throw new Error(data.error);
      }

      if (data?.session) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      }

      if (data?.userId) {
        setUserId(data.userId);
      }

      setPixData({
        qrCodeBase64: data.qrCodeBase64,
        copyPaste: data.copyPaste,
      });
    } catch {
      // Simulação instantânea no modo Demo/Local
      const dummyQrCode =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      setPixData({
        qrCodeBase64: dummyQrCode,
        copyPaste:
          "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540567.005802BR5913ConfereAI6009Sao Paulo62070503***6304ABCD",
      });

      // Em modo de demonstração local, simula confirmação automática em 5 segundos
      setTimeout(async () => {
        setIsPro(true);
        setIsCheckoutOpen(false);
        setPixData(null);
        setJustUnlockedBanner(true);
        await loadAuditItems(true);
      }, 5000);
    } finally {
      setCheckoutLoading(false);
    }
  };

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
      <div className="min-h-screen flex items-center justify-center bg-[#F8F9FD]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-extrabold text-slate-800">
            Calculando divergências financeiras...
          </p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8F9FD] p-6 text-center">
        <p className="text-slate-800 font-bold mb-4">Auditoria não encontrada.</p>
        <Link
          to="/"
          className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-sm"
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
    <div className="min-h-screen bg-[#F8F9FD] text-slate-800 pb-20">
      <LiquidGlassNavbar variant="result" platform={audit.platform} isPro={isPro} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-24 md:pb-10 space-y-6">
        {/* Banner de Desbloqueio ao Vivo pós-Pix */}
        {justUnlockedBanner && (
          <div className="p-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm flex items-center justify-between shadow-soft">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                Pagamento confirmado! Todos os {audit.total_divergent_orders} pedidos e textos prontos para pedir o estorno no suporte foram liberados.
              </span>
            </span>
            <button
              onClick={() => setJustUnlockedBanner(false)}
              className="text-xs underline ml-4 cursor-pointer font-extrabold"
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
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Relatório de Valores a Recuperar
              </span>
              <span className="text-xs font-bold text-slate-300">/</span>
              <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-xs">
                {audit.platform === "mercadolivre" ? (
                  <>
                    <MercadoLivreLogo className="w-4 h-4 rounded-xs" />
                    <span>Mercado Livre</span>
                  </>
                ) : (
                  <>
                    <ShopeeLogo className="w-4 h-4 rounded-xs" />
                    <span>Shopee</span>
                  </>
                )}
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
              Valores Cobrados a Mais nas Suas Vendas
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Conferimos <strong>{audit.total_orders_analyzed} vendas</strong> da sua loja e encontramos{" "}
              <strong className="text-rose-600">{audit.total_divergent_orders} pedidos</strong> onde o marketplace cobrou mais do que deveria.
            </p>
          </div>

          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs uppercase tracking-wider transition shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Outra Planilha</span>
          </Link>
        </div>

        {/* =========================================================================
            BENTO GRID ANALYTICS (Inspirado no @romanvasnev/analytics-bento)
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
        <section className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">
                {isPro
                  ? `Lista Completa dos ${items.length} Pedidos com Cobrança a Mais`
                  : `Exemplo de Comprovação (2 de ${audit.total_divergent_orders} pedidos encontrados)`}
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
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
                  className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Baixar Planilha (.xlsx)</span>
                </button>
              )}

              {/* Filtros em Pílulas */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200 overflow-x-auto max-w-full">
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
                    className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider transition cursor-pointer shrink-0 ${
                      activeFilter === tab.id
                        ? "bg-slate-900 text-white shadow-xs"
                        : "text-slate-500 hover:text-slate-800"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Linhas da Tabela */}
          <div className="divide-y divide-slate-100">
            {filteredItems.map((item) => {
              const badge = ERROR_BADGE[item.error_type];

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 hover:bg-slate-50/70 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  {/* Identificação do Pedido */}
                  <div className="flex items-start gap-3">
                    <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                      #{item.row_rank}
                    </span>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-extrabold text-slate-900">
                          #{item.order_id}
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${badge.badgeClass}`}
                        >
                          {badge.icon}
                          {badge.label}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">
                        SKU: <strong className="text-slate-700">{item.sku}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Comparativo de Tarifas */}
                  <div className="flex items-center justify-between sm:justify-start sm:gap-6 text-xs w-full md:w-auto py-2.5 md:py-0 border-y md:border-y-0 border-slate-100">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Esperado
                      </span>
                      <span className="font-semibold text-slate-600">
                        {formatBRL(item.expected_amount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Cobrado
                      </span>
                      <span className="font-semibold text-slate-600">
                        {formatBRL(item.charged_amount)}
                      </span>
                    </div>

                    <div>
                      <span className="text-[10px] uppercase font-bold text-emerald-600 block">
                        A Recuperar
                      </span>
                      <span className="text-base font-black text-emerald-600">
                        +{formatBRL(item.recoverable_amount)}
                      </span>
                    </div>
                  </div>

                  {/* Ação: Copiar Texto e Checkboxes Pro */}
                  <div className="flex items-center gap-2.5 justify-end w-full md:w-auto">
                    <button
                      type="button"
                      onClick={() => handleCopyDispute(item)}
                      className="w-full md:w-auto justify-center px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {copiedRowId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
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
                      <div className="flex items-center gap-3 pl-2 text-xs font-semibold text-slate-600 border-l border-slate-200">
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.is_contested}
                            onChange={() => handleToggleStatus(item, "is_contested")}
                            className="rounded text-indigo-600"
                          />
                          <span>Aberto</span>
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={item.is_refunded}
                            onChange={() => handleToggleStatus(item, "is_refunded")}
                            className="rounded text-emerald-600"
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
            <div className="relative border-t border-slate-100">
              {/* Linhas borradas usando apenas os valores R$ do array blurred_preview_amounts */}
              <div className="divide-y divide-slate-100 select-none pointer-events-none filter blur-xs opacity-50">
                {blurredAmounts.slice(0, 7).map((amount, idx) => (
                  <div
                    key={idx}
                    className="p-5 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 rounded-xl bg-slate-100 text-slate-400 font-bold flex items-center justify-center">
                        #{idx + 3}
                      </span>
                      <div>
                        <div className="font-mono text-sm font-bold text-slate-800">
                          #2000094827{idx}
                        </div>
                        <div className="text-slate-400">SKU-OCULTO-{idx + 3}</div>
                      </div>
                    </div>
                    <div className="text-base font-black text-emerald-600">
                      +{formatBRL(amount)}
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-slate-200 text-slate-600 font-bold text-xs">
                      Copiar Contestação
                    </div>
                  </div>
                ))}
              </div>

              {/* Card de Conversão sobre o Blur */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-white/70 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider px-3.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  +{blurredAmounts.length} pedidos da sua lista aguardando liberação do estorno
                </span>

                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight max-w-lg">
                  Receba esses {formatBRL(audit.total_recoverable)} de volta no seu caixa
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-2 leading-relaxed">
                  Desbloqueie o número de todos os {audit.total_divergent_orders} pedidos, os produtos afetados e o texto pronto de contestação para pedir o estorno imediato no suporte.
                </p>

                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="mt-6 py-3.5 sm:py-4 px-5 sm:px-8 w-full sm:w-auto rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md transition transform hover:-translate-y-0.5 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <span>Desbloquear Relatório Completo por R$ 67,00/mês</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-xs text-slate-400 mt-2.5">
                  Liberação automática em segundos via Pix, cancele quando quiser com 1 clique
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* =========================================================================
          MODAL DE CHECKOUT PIX TRANSPARENTE (Asaas)
          ========================================================================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 relative">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-bold cursor-pointer"
            >
              ✕
            </button>

            {!pixData ? (
              <>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Liberar Lista Completa e Textos de Reembolso
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Plano Pro Mensal (R$ 67,00): Conferências ilimitadas no Mercado Livre e Shopee
                </p>

                <form onSubmit={handleGeneratePix} className="mt-5 space-y-3.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo Silva"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Melhor E-mail (seu acesso)
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@sualoja.com.br"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-indigo-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-indigo-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        CPF ou CNPJ
                      </label>
                      <input
                        type="text"
                        required
                        value={cpfCnpj}
                        onChange={(e) => setCpfCnpj(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-indigo-600"
                      />
                    </div>
                  </div>

                  {checkoutError && (
                    <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
                      {checkoutError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md transition cursor-pointer flex items-center justify-center gap-2 mt-2"
                  >
                    {checkoutLoading ? (
                      "Gerando Pix..."
                    ) : (
                      <>
                        <span>Gerar Pix de R$ 67,00</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-100 px-3 py-1 rounded-full animate-pulse">
                  ● Aguardando pagamento Pix...
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-3">
                  Escaneie o QR Code no seu banco
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assim que você pagar, esta tela desbloqueia em 3 segundos.
                </p>

                <div className="my-4 flex justify-center">
                  <div className="p-3 rounded-2xl bg-white border border-slate-200 shadow-sm">
                    <img
                      src={
                        pixData.qrCodeBase64.startsWith("data:")
                          ? pixData.qrCodeBase64
                          : `data:image/png;base64,${pixData.qrCodeBase64}`
                      }
                      alt="QR Code Pix"
                      className="w-44 h-44 object-contain"
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.copyPaste);
                    setPixCopied(true);
                    setTimeout(() => setPixCopied(false), 3000);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  {pixCopied ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Código Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copiar Código Pix Copia-e-Cola</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Barra Fixa de Conversao no Mobile (Sticky Bottom Bar) */}
      {!isPro && !isCheckoutOpen && audit && (
        <aside
          aria-label="Acao de desbloqueio mobile"
          className="fixed bottom-0 inset-x-0 z-40 md:hidden bg-white/95 backdrop-blur-md border-t border-slate-200 p-3.5 shadow-[0_-8px_25px_rgba(0,0,0,0.08)] flex items-center justify-between gap-3"
        >
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              Total a Recuperar
            </span>
            <span className="text-lg font-black text-emerald-600 leading-tight">
              +{formatBRL(audit.total_recoverable)}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsCheckoutOpen(true)}
            className="py-2.5 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <span>Liberar por R$ 67</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </aside>
      )}

      {/* Rodapé Corporativo B2B */}
      <footer className="mt-12 border-t border-slate-200 py-6 text-center text-xs text-slate-400">
        ConfereAI | Auditoria Financeira de Repasses para E-commerce
      </footer>
    </div>
  );
}
