import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

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

const ERROR_BADGE: Record<AuditItem["error_type"], { label: string; classes: string }> = {
  frete: { label: "Frete Cubado / Peso", classes: "bg-amber-100 text-amber-800" },
  comissao: { label: "Comissão Divergente", classes: "bg-purple-100 text-purple-800" },
  devolucao: { label: "Devolução Não Estornada", classes: "bg-rose-100 text-rose-800" },
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

  // Estados do Modal de Checkout Pix
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

  // Busca os itens permitidos pelo RLS (2 se gratuito, todos se Pro)
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
      // Ignora erro de rede e tenta local
    }

    // Fallback: Armazenamento local (modo offline/demo)
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

  // Carrega dados iniciais da auditoria e checa status Pro do usuário logado
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
        // Fallback para sessionStorage
      }

      if (!loadedAudit) {
        try {
          const raw = sessionStorage.getItem(`audit_${auditId}`);
          if (raw) {
            loadedAudit = JSON.parse(raw) as AuditSummary;
          }
        } catch {
          // sem cache
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

  // LISTENER SUPABASE REALTIME: Desbloqueia a tela ao vivo assim que o webhook do Asaas confirmar o Pix
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

  // Submete formulário de checkout para Edge Function `create-checkout`
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
        throw new Error(error.message || "Falha ao conectar com servidor de pagamento.");
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
      // Simulação instantânea no modo Demo/Local caso Supabase Edge Function não esteja deployed ainda
      const dummyQrCode = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      setPixData({
        qrCodeBase64: dummyQrCode,
        copyPaste: "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540567.005802BR5913AuditaSeller6009Sao Paulo62070503***6304ABCD",
      });

      // Em modo de demonstração local, simula confirmação automática em 6 segundos
      setTimeout(async () => {
        setIsPro(true);
        setIsCheckoutOpen(false);
        setPixData(null);
        setJustUnlockedBanner(true);
        await loadAuditItems(true);
      }, 6000);
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-600 font-medium animate-pulse">
          Carregando diagnóstico financeiro...
        </p>
      </div>
    );
  }

  if (!audit) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <p className="text-slate-700 font-semibold mb-4">Auditoria não encontrada.</p>
        <Link to="/" className="text-emerald-600 font-bold underline">
          Fazer nova auditoria
        </Link>
      </div>
    );
  }

  const blurredAmounts = Array.isArray(audit.blurred_preview_amounts)
    ? audit.blurred_preview_amounts
    : [];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Banner de confirmação ao vivo pós-Pix */}
        {justUnlockedBanner && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-600 text-white font-medium flex items-center justify-between shadow-md">
            <span>
              Pagamento Pix confirmado! Todos os {audit.total_divergent_orders} pedidos e textos de
              contestação foram desbloqueados.
            </span>
            <button
              onClick={() => setJustUnlockedBanner(false)}
              className="text-sm underline ml-4 cursor-pointer"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Relatório de Auditoria •{" "}
              {audit.platform === "mercadolivre" ? "Mercado Livre" : "Shopee"}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mt-1">
              Diagnóstico de Repasses Financeiros
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Analisamos <strong>{audit.total_orders_analyzed} pedidos</strong> e encontramos{" "}
              <strong>{audit.total_divergent_orders} divergências</strong> passíveis de reembolso.
            </p>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 transition"
          >
            + Nova Auditoria
          </Link>
        </div>

        {/* Cards de Totais */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="md:col-span-2 bg-gradient-to-br from-rose-600 to-red-700 text-white p-6 rounded-2xl shadow-lg">
            <p className="text-xs uppercase tracking-wider font-semibold text-rose-100">
              Total Identificado para Recuperação
            </p>
            <p className="text-4xl font-black mt-2">{formatBRL(audit.total_recoverable)}</p>
            <p className="text-xs text-rose-100 mt-2">
              Em {audit.total_divergent_orders} pedidos com cobrança acima do padrão histórico
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase">Frete / Cubagem</p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {formatBRL(audit.frete_recoverable)}
            </p>
            <span className="text-xs text-amber-700 mt-1">Divergência de peso/volume</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase">
              Comissão & Devoluções
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-2">
              {formatBRL(audit.comissao_recoverable + audit.devolucao_recoverable)}
            </p>
            <span className="text-xs text-purple-700 mt-1">Tarifas e estornos pendentes</span>
          </div>
        </div>

        {/* Tabela de Resultados */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="font-bold text-slate-800">
              {isPro
                ? `Todos os ${items.length} Pedidos Divergentes Desbloqueados`
                : `Amostra Gratuita (2 de ${audit.total_divergent_orders} pedidos encontrados)`}
            </h2>
            {!isPro && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                Modo Prévia
              </span>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-xs uppercase text-slate-500 border-b border-slate-200">
                  <th className="py-3 px-4">Pedido / SKU</th>
                  <th className="py-3 px-4">Tipo de Erro</th>
                  <th className="py-3 px-4">Esperado</th>
                  <th className="py-3 px-4">Cobrado</th>
                  <th className="py-3 px-4">A Recuperar</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {items.map((item) => {
                  const badge = ERROR_BADGE[item.error_type];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">#{item.order_id}</div>
                        <div className="text-xs text-slate-500">{item.sku}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full ${badge.classes}`}
                        >
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatBRL(item.expected_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-slate-600">
                        {formatBRL(item.charged_amount)}
                      </td>
                      <td className="py-3.5 px-4 font-extrabold text-emerald-600">
                        +{formatBRL(item.recoverable_amount)}
                      </td>
                      <td className="py-3.5 px-4 text-right space-y-1">
                        <button
                          type="button"
                          onClick={() => handleCopyDispute(item)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-700 transition cursor-pointer"
                        >
                          {copiedRowId === item.id ? "Texto Copiado!" : "Copiar Contestação"}
                        </button>
                        {isPro && (
                          <div className="flex items-center justify-end gap-3 pt-1 text-xs text-slate-600">
                            <label className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.is_contested}
                                onChange={() => handleToggleStatus(item, "is_contested")}
                              />
                              Aberto
                            </label>
                            <label className="inline-flex items-center gap-1 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.is_refunded}
                                onChange={() => handleToggleStatus(item, "is_refunded")}
                              />
                              Pago
                            </label>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* SEÇÃO BORRADA + PAYWALL */}
          {!isPro && blurredAmounts.length > 0 && (
            <div className="relative">
              <div className="divide-y divide-slate-100 select-none pointer-events-none">
                {blurredAmounts.slice(0, 8).map((amount, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-6 items-center py-3.5 px-4 text-sm bg-white"
                  >
                    <div className="blur-xs opacity-60">
                      <div className="font-bold text-slate-900">#2000094827{index}</div>
                      <div className="text-xs text-slate-500">SKU-OCULTO-{index + 3}</div>
                    </div>
                    <div className="blur-xs opacity-60">
                      <span className="text-xs px-2 py-1 rounded bg-slate-200">
                        Divergência Detectada
                      </span>
                    </div>
                    <div className="blur-xs opacity-60 text-slate-500">R$ 19,90</div>
                    <div className="blur-xs opacity-60 text-slate-500">R$ 48,90</div>
                    <div className="font-extrabold text-emerald-600">
                      +{formatBRL(amount)}
                    </div>
                    <div className="text-right blur-xs opacity-60">
                      <span className="px-3 py-1.5 text-xs rounded bg-slate-300">
                        Copiar Texto
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Card Flutuante de Conversão */}
              <div className="inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/95 to-white/70 pt-10 pb-10 px-6 flex flex-col items-center text-center border-t border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-600 bg-rose-50 px-3 py-1 rounded-full mb-3">
                  +{blurredAmounts.length} pedidos ocultos aguardando contestação
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 max-w-xl">
                  Recupere esses {formatBRL(audit.total_recoverable)} ainda esta semana
                </h3>
                <p className="text-sm text-slate-600 max-w-lg mt-2">
                  Desbloqueie agora o número exato de todos os {audit.total_divergent_orders}{" "}
                  pedidos, os SKUs afetados e os textos prontos para abrir chamado de reembolso.
                </p>

                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="mt-6 px-8 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-base shadow-lg transition transform hover:-translate-y-0.5 cursor-pointer"
                >
                  Desbloquear Relatório Completo por R$ 67,00/mês
                </button>
                <p className="text-xs text-slate-500 mt-3">
                  Liberação automática na tela em segundos via Pix • Cancele quando quiser
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL DE CHECKOUT PIX TRANSPARENTE (ASAAS) */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
            >
              ✕
            </button>

            {!pixData ? (
              <>
                <h3 className="text-xl font-extrabold text-slate-900">
                  Desbloquear Auditoria Completa
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Plano Mensal (R$ 67,00) • Auditorias ilimitadas de Mercado Livre e Shopee
                </p>

                <form onSubmit={handleGeneratePix} className="mt-5 space-y-3.5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Nome Completo
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex: Carlos Eduardo Silva"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Melhor E-mail (será seu acesso)
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="voce@sualoja.com.br"
                      className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        WhatsApp
                      </label>
                      <input
                        type="tel"
                        required
                        value={whatsapp}
                        onChange={(e) => setWhatsapp(e.target.value)}
                        placeholder="(11) 99999-9999"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        CPF ou CNPJ
                      </label>
                      <input
                        type="text"
                        required
                        value={cpfCnpj}
                        onChange={(e) => setCpfCnpj(e.target.value)}
                        placeholder="000.000.000-00"
                        className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-emerald-500"
                      />
                    </div>
                  </div>

                  {checkoutError && (
                    <p className="text-xs text-red-600 bg-red-50 p-2.5 rounded-lg border border-red-200">
                      {checkoutError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={checkoutLoading}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition cursor-pointer"
                  >
                    {checkoutLoading ? "Gerando QR Code Pix..." : "Gerar Pix de R$ 67,00"}
                  </button>
                </form>
              </>
            ) : (
              <div className="text-center py-2">
                <span className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 bg-amber-100 px-3 py-1 rounded-full animate-pulse">
                  ● Aguardando pagamento Pix...
                </span>
                <h3 className="text-lg font-extrabold text-slate-900 mt-3">
                  Escaneie o QR Code ou copie o código
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Assim que você pagar, esta tela desbloqueia sozinha em 3 segundos.
                </p>

                <div className="my-4 flex justify-center">
                  <img
                    src={`data:image/png;base64,${pixData.qrCodeBase64}`}
                    alt="QR Code Pix"
                    className="w-48 h-48 border border-slate-200 rounded-xl p-2"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(pixData.copyPaste);
                    setPixCopied(true);
                    setTimeout(() => setPixCopied(false), 3000);
                  }}
                  className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm transition cursor-pointer"
                >
                  {pixCopied ? "Código Pix Copiado!" : "Copiar Código Pix Copia-e-Cola"}
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
