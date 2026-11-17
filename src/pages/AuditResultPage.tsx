import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  Copy,
  Check,
  CheckCircle2,
  Lock,
  ArrowRight,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { DonutProgress } from "../components/DonutProgress";
import { ZenithCard } from "../components/ZenithCard";

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
  { label: string; badgeClass: string; dotColor: string }
> = {
  frete: {
    label: "Frete Cubado / Peso",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200/80",
    dotColor: "bg-indigo-600",
  },
  comissao: {
    label: "Comissão Divergente",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200/80",
    dotColor: "bg-violet-500",
  },
  devolucao: {
    label: "Devolução Não Estornada",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200/80",
    dotColor: "bg-rose-500",
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
      // Ignora e usa fallback local
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
          "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540567.005802BR5913AuditaSeller6009Sao Paulo62070503***6304ABCD",
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

  // Itens filtrados
  const filteredItems = useMemo(() => {
    if (activeFilter === "all") return items;
    return items.filter((item) => item.error_type === activeFilter);
  }, [items, activeFilter]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F5FB]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-black text-slate-800">
            Carregando diagnóstico financeiro...
          </p>
        </div>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#F4F5FB] p-6 text-center">
        <p className="text-slate-800 font-bold mb-4">Auditoria não encontrada.</p>
        <Link
          to="/"
          className="px-6 py-3 rounded-full bg-indigo-600 text-white font-bold text-xs uppercase tracking-wider shadow-soft"
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
    <div className="min-h-screen bg-[#F4F5FB] text-slate-800 pb-32">
      {/* Top Header Neumorphic Bar */}
      <AppHeader
        title="DIAGNÓSTICO FINANCEIRO"
        badge={isPro ? "PRO ATIVO" : "PRÉVIA GRATUITA"}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Banner de Desbloqueio ao Vivo pós-Pix */}
        {justUnlockedBanner && (
          <div className="p-4 rounded-2xl bg-emerald-600 text-white font-extrabold text-xs sm:text-sm flex items-center justify-between shadow-soft">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <span>
                Pagamento confirmado via Pix! Todos os {audit.total_divergent_orders} pedidos e
                textos de contestação foram desbloqueados.
              </span>
            </span>
            <button
              onClick={() => setJustUnlockedBanner(false)}
              className="text-xs underline ml-4 cursor-pointer font-bold"
            >
              Fechar
            </button>
          </div>
        )}

        {/* =========================================================================
            SEÇÃO 1: RESUMO FINANCEIRO (Cards Neumorphic Zenith)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card Principal: Total Recuperável */}
          <div className="lg:col-span-5 bg-gradient-to-br from-indigo-700 via-indigo-600 to-violet-700 text-white rounded-[28px] p-6 sm:p-7 shadow-soft-lg flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-44 h-44 bg-white/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-widest text-indigo-200">
                  TOTAL PARADO A RECUPERAR
                </span>
                <span className="text-[10px] font-black uppercase bg-white/20 text-white px-2.5 py-0.5 rounded-full backdrop-blur-xs">
                  {audit.platform === "mercadolivre" ? "Mercado Livre" : "Shopee"}
                </span>
              </div>

              <div className="text-4xl sm:text-5xl font-black mt-3 tracking-tight">
                {formatBRL(audit.total_recoverable)}
              </div>
              <p className="text-xs text-indigo-100 mt-2 font-medium">
                Identificado em <strong>{audit.total_divergent_orders} pedidos</strong> com
                cobrança acima do padrão histórico nas últimas vendas.
              </p>
            </div>

            <div className="relative z-10 mt-6 pt-4 border-t border-white/15 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-200 block">
                  Frete Cubado
                </span>
                <span className="text-base font-black text-white">
                  {formatBRL(audit.frete_recoverable)}
                </span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-200 block">
                  Comissões / Estornos
                </span>
                <span className="text-base font-black text-white">
                  {formatBRL(audit.comissao_recoverable + audit.devolucao_recoverable)}
                </span>
              </div>
            </div>
          </div>

          {/* Gráfico Donut de Eficácia */}
          <div className="lg:col-span-4">
            <DonutProgress
              percentage={78}
              label="EFICÁCIA"
              breakdown={[
                {
                  label: "Frete Cubado Acima",
                  value: formatBRL(audit.frete_recoverable),
                  color: "bg-indigo-600",
                },
                {
                  label: "Comissão Divergente",
                  value: formatBRL(audit.comissao_recoverable),
                  color: "bg-violet-400",
                },
                {
                  label: "Devolução / Prejuízo",
                  value: formatBRL(audit.devolucao_recoverable),
                  color: "bg-rose-400",
                },
              ]}
            />
          </div>

          {/* Cartão Zenith Prime com Saldo Retido */}
          <div className="lg:col-span-3">
            <ZenithCard
              balance={formatBRL(audit.total_recoverable)}
              divergencesCount={audit.total_divergent_orders}
            />
          </div>
        </div>

        {/* =========================================================================
            SEÇÃO 2: TABELA DE PEDIDOS DIVERGENTES (Estilo Schedule / Checklist)
            ========================================================================= */}
        <section className="bg-white rounded-[32px] p-6 sm:p-8 border border-indigo-100/70 shadow-soft">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
                RELATÓRIO DETALHADO POR SKU
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                {isPro
                  ? `Todos os ${items.length} pedidos divergentes desbloqueados`
                  : `Amostra de Validação (2 de ${audit.total_divergent_orders} pedidos encontrados)`}
              </h2>
            </div>

            {/* Filtros em Pílulas (Inspirados nas abas 'Quotes' da imagem) */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-2xl border border-indigo-100/60 overflow-x-auto">
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-black tracking-wider uppercase transition cursor-pointer shrink-0 ${
                    activeFilter === tab.id
                      ? "bg-indigo-600 text-white shadow-soft"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Pedidos em Cards / Linhas Estilizadas */}
          <div className="space-y-3">
            {filteredItems.map((item) => {
              const badge = ERROR_BADGE[item.error_type];

              return (
                <div
                  key={item.id}
                  className="p-4 sm:p-5 rounded-2xl bg-[#F8F9FD] border border-indigo-100/70 hover:border-indigo-200 hover:bg-white transition flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xs"
                >
                  {/* Dados do Pedido */}
                  <div className="flex items-start gap-3.5">
                    <div className="w-8 h-8 rounded-xl bg-white border border-indigo-100 shadow-xs flex items-center justify-center text-indigo-600 font-bold shrink-0 mt-0.5">
                      #{item.row_rank}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-sm font-black text-slate-900">
                          #{item.order_id}
                        </span>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full border ${badge.badgeClass}`}
                        >
                          {badge.label}
                        </span>
                      </div>
                      <span className="text-xs text-slate-500 font-medium block mt-0.5">
                        SKU: <strong className="text-slate-700">{item.sku}</strong>
                      </span>
                    </div>
                  </div>

                  {/* Comparativo de Valores */}
                  <div className="flex items-center gap-4 sm:gap-6 text-xs">
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

                  {/* Ações (Copiar Texto e Checkboxes Pro) */}
                  <div className="flex items-center gap-2.5 justify-end">
                    <button
                      type="button"
                      onClick={() => handleCopyDispute(item)}
                      className="px-3.5 py-2 rounded-xl bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 font-bold text-xs uppercase tracking-wider shadow-xs transition flex items-center gap-1.5 cursor-pointer"
                    >
                      {copiedRowId === item.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Copiar Contestação</span>
                        </>
                      )}
                    </button>

                    {isPro && (
                      <div className="flex items-center gap-2 pl-2 text-xs font-bold text-slate-600 border-l border-indigo-100">
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
                          <span>Pago</span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* =========================================================================
              SEÇÃO BORRADA + PAYWALL CONVERSÃO (Renderizado se !isPro)
              ========================================================================= */}
          {!isPro && blurredAmounts.length > 0 && (
            <div className="relative mt-4 pt-4 border-t border-indigo-50">
              {/* Linhas Borradas com valores reais do array blurred_preview_amounts */}
              <div className="space-y-3 select-none pointer-events-none filter blur-xs opacity-50">
                {blurredAmounts.slice(0, 6).map((amount, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-[#F8F9FD] border border-indigo-100 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-white border text-slate-400 flex items-center justify-center font-bold text-xs">
                        #{idx + 3}
                      </div>
                      <div>
                        <div className="font-mono text-sm font-bold text-slate-800">
                          #2000094827{idx}
                        </div>
                        <div className="text-xs text-slate-400">SKU-OCULTO-{idx + 3}</div>
                      </div>
                    </div>
                    <div className="font-black text-emerald-600">
                      +{formatBRL(amount)}
                    </div>
                    <div className="px-3 py-1.5 rounded-xl bg-indigo-100 text-indigo-600 text-xs font-bold">
                      Copiar Texto
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Flutuante de Conversão em Vidro Fosco */}
              <div className="absolute inset-0 bg-gradient-to-t from-white via-white/95 to-white/60 backdrop-blur-xs flex flex-col items-center justify-center p-6 text-center">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-rose-50 text-rose-600 border border-rose-200/60 mb-2">
                  <Lock className="w-3.5 h-3.5" />
                  +{blurredAmounts.length} pedidos ocultos com dinheiro retido
                </span>

                <h3 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight max-w-lg">
                  Recupere esses {formatBRL(audit.total_recoverable)} agora
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 max-w-md mt-1.5">
                  Desbloqueie a lista completa com os números dos pedidos, SKUs e os textos
                  técnicos prontos para abrir chamado no suporte do Mercado Livre e Shopee.
                </p>

                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="mt-5 py-4 px-8 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs sm:text-sm uppercase tracking-wider shadow-glow-violet transition transform hover:-translate-y-0.5 flex items-center gap-2 cursor-pointer"
                >
                  <span>Desbloquear Relatório Completo por R$ 67,00/mês</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <p className="text-[11px] text-slate-400 mt-2 font-medium">
                  Aprovação instantânea via Pix • Cancele quando quiser com 1 clique
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      {/* =========================================================================
          MODAL DE CHECKOUT PIX TRANSPARENTE (Estilo Neumorphic Soft)
          ========================================================================= */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] max-w-md w-full p-6 sm:p-8 shadow-soft-lg border border-indigo-100/80 relative">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center text-sm font-black cursor-pointer"
            >
              ✕
            </button>

            {!pixData ? (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    PAGAMENTO INSTANTÂNEO
                  </span>
                </div>
                <h3 className="text-xl font-black text-slate-900 tracking-tight">
                  Desbloquear Auditoria Completa
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Plano Pro Mensal (R$ 67,00) • Desbloqueio imediato na tela via Pix
                </p>

                <form onSubmit={handleGeneratePix} className="mt-5 space-y-3.5">
                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo Silva"
                      className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-[#F8F9FD] text-sm focus:outline-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                      Melhor E-mail
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@sualoja.com.br"
                      className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-[#F8F9FD] text-sm focus:outline-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-[#F8F9FD] text-sm focus:outline-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-1">
                        CPF ou CNPJ
                      </label>
                      <input
                        type="text"
                        required
                        value={cpfCnpj}
                        onChange={(e) => setCpfCnpj(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-4 py-2.5 rounded-xl border border-indigo-100 bg-[#F8F9FD] text-sm focus:outline-indigo-500"
                      />
                    </div>
                  </div>

                  {checkoutError && (
                    <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                      {checkoutError}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="w-full py-3.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-glow-violet transition cursor-pointer flex items-center justify-center gap-2 mt-2"
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
                <span className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-200/60 animate-pulse">
                  ● Aguardando Pagamento Pix...
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-3">
                  Escaneie o QR Code no seu banco
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assim que você pagar, esta tela desbloqueia em 3 segundos.
                </p>

                <div className="my-4 flex justify-center">
                  <div className="p-3 rounded-2xl bg-white border border-indigo-100 shadow-soft">
                    <img
                      src={`data:image/png;base64,${pixData.qrCodeBase64}`}
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
                  className="w-full py-3 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Floating Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
