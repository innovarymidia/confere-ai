import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ArrowRight,
  ShieldCheck,
  LogOut,
  UploadCloud,
  FileSpreadsheet,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { LiquidGlassNavbar } from "../components/ui/liquid-glass-navbar";
import { MercadoLivreLogo, ShopeeLogo, ConfereAiLogo } from "../components/ui/marketplace-logos";
import { PrivacyModal } from "../components/ui/privacy-modal";

interface SavedAudit {
  id: string;
  platform: "mercadolivre" | "shopee";
  total_orders_analyzed: number;
  total_divergent_orders: number;
  total_recoverable: number;
  created_at: string;
}

function formatBRL(value: number): string {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function HistoryPage() {
  const navigate = useNavigate();
  const [audits, setAudits] = useState<SavedAudit[]>([]);
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  useEffect(() => {
    async function fetchUserAndAudits() {
      setLoading(true);

      let currentUserId: string | null = null;
      let email: string | null = null;

      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          currentUserId = user.id;
          setUserId(user.id);
          email = user.email ?? null;
          setUserEmail(email);

          const { data: profile } = await supabase
            .from("profiles")
            .select("is_pro")
            .eq("id", user.id)
            .maybeSingle();

          if (profile?.is_pro) {
            setIsPro(true);
          }
        }
      } catch {
        // Modo local
      }

      const loadedAudits: SavedAudit[] = [];

      // 1. Busca auditorias no Supabase se houver usuario autenticado
      if (currentUserId) {
        try {
          const { data, error } = await supabase
            .from("audits")
            .select("id, platform, total_orders_analyzed, total_divergent_orders, total_recoverable, created_at")
            .eq("user_id", currentUserId)
            .order("created_at", { ascending: false });

          if (!error && data) {
            loadedAudits.push(...(data as SavedAudit[]));
          }
        } catch {
          // Erro de rede ou tabela vazia
        }
      }

      // 2. Le auditorias do sessionStorage (suporte modo demonstracao e offline)
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && key.startsWith("audit_") && !key.startsWith("audit_items_")) {
            const raw = sessionStorage.getItem(key);
            if (raw) {
              const parsed = JSON.parse(raw);
              if (parsed?.id && !loadedAudits.some((a) => a.id === parsed.id)) {
                loadedAudits.push({
                  id: parsed.id,
                  platform: parsed.platform || "mercadolivre",
                  total_orders_analyzed: parsed.total_orders_analyzed || 0,
                  total_divergent_orders: parsed.total_divergent_orders || 0,
                  total_recoverable: parsed.total_recoverable || 0,
                  created_at: parsed.created_at || new Date().toISOString(),
                });
              }
            }
          }
        }
      } catch {
        // Ignora erros de leitura de storage
      }

      setAudits(loadedAudits);
      setLoading(false);
    }

    fetchUserAndAudits();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignora erro
    }
    setUserEmail(null);
    setIsPro(false);
    navigate("/");
  };

  const handleDeleteAccount = async () => {
    setDeleteLoading(true);
    try {
      if (userId) {
        const { error } = await supabase.rpc("delete_user_account");
        if (error) {
          // Fallback caso a RPC ainda nao tenha sido criada no banco remoto
          await supabase.from("audits").delete().eq("user_id", userId);
          await supabase.from("profiles").delete().eq("id", userId);
        }
      }
    } catch {
      // Fallback gracioso
    }

    try {
      await supabase.auth.signOut();
      sessionStorage.clear();
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const key = localStorage.key(i);
        if (key && (key.startsWith("audit_") || key === "last_audit_id")) {
          localStorage.removeItem(key);
        }
      }
    } catch {
      // Ignora erro de limpeza local
    }

    setDeleteLoading(false);
    setIsDeleteModalOpen(false);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#000000] flex flex-col justify-between">
      <div>
        <LiquidGlassNavbar variant="result" isPro={isPro} />

        <main className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-36 sm:pt-40 pb-12 space-y-6">
          {/* Cabecalho de Boas-Vindas e Dados da Conta */}
          <div className="bg-[#ffffff] rounded-[12px] p-6 sm:p-8 border border-[#b9bbc6] space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c] block mb-1">
                  Minha Conta de Vendedor
                </span>
                <h1 className="text-2xl sm:text-3xl font-semibold text-[#000000] tracking-[-0.025em]">
                  Minhas Conferências
                </h1>
                <p className="text-sm text-[#60646c] mt-1 font-normal leading-relaxed tracking-[-0.01em]">
                  Consulte suas conferências de vendas e veja quanto dinheiro você tem para receber de volta.
                </p>
              </div>

              <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
                <div className="px-3.5 py-2 rounded-[6px] bg-[#f3f3f7] border border-[#b9bbc6] text-xs">
                  <span className="text-[#8b8d98] block text-[10px] font-semibold uppercase tracking-[-0.01em]">
                    Conta Cadastrada
                  </span>
                  <span className="text-[#000000] font-medium">
                    {userEmail || "Acesso Local Demo"}
                  </span>
                </div>

                <div className="px-3.5 py-2 rounded-[6px] bg-[#f3f3f7] border border-[#b9bbc6] text-xs flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#ff5900] shrink-0" />
                  <div>
                    <span className="text-[#8b8d98] block text-[10px] font-semibold uppercase tracking-[-0.01em]">
                      Status
                    </span>
                    <span className="text-[#000000] font-semibold">
                      {isPro ? "Assinante Pro Ativo" : "Plano Gratuito"}
                    </span>
                  </div>
                </div>

                {userEmail && (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="p-2.5 rounded-[12px] border border-[#b9bbc6] text-[#60646c] hover:text-[#000000] hover:border-[#000000] transition cursor-pointer"
                    title="Sair da Conta"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* LGPD Art. 18, VI: Direito a Exclusao dos Dados */}
            <div className="pt-4 border-t border-[#b9bbc6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="text-[#60646c]">
                <span className="font-semibold text-[#000000]">Privacidade e Direitos do Titular (LGPD):</span>{" "}
                Você pode solicitar a eliminação definitiva dos seus dados e histórico a qualquer momento.{" "}
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(true)}
                  className="text-[#000000] underline font-medium hover:text-[#ff5900] cursor-pointer"
                >
                  Ver Política de Privacidade
                </button>
              </div>
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3 py-1.5 rounded-[8px] bg-[#f3f3f7] hover:bg-red-50 text-red-600 hover:text-red-700 border border-[#b9bbc6] hover:border-red-300 font-medium transition cursor-pointer flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir minha conta e histórico</span>
              </button>
            </div>
          </div>

          {/* Listagem das Auditorias */}
          {loading ? (
            <div className="bg-[#ffffff] rounded-[12px] p-12 border border-[#b9bbc6] flex flex-col items-center justify-center text-center">
              <div className="w-8 h-8 border-2 border-[#000000] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
                Carregando relatórios...
              </p>
            </div>
          ) : audits.length === 0 ? (
            <div className="bg-[#ffffff] rounded-[12px] p-10 sm:p-14 border border-[#b9bbc6] text-center space-y-4">
              <div className="w-12 h-12 rounded-[12px] bg-[#f3f3f7] text-[#000000] flex items-center justify-center mx-auto border border-[#b9bbc6]">
                <FileSpreadsheet className="w-6 h-6 text-[#ff5900]" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-[#000000] tracking-[-0.01em]">
                  Nenhuma auditoria realizada ainda
                </h2>
                <p className="text-sm text-[#60646c] max-w-md mx-auto mt-1 font-normal leading-relaxed tracking-[-0.01em]">
                  Envie seu primeiro extrato de repasses do Mercado Livre ou Shopee para descobrir valores cobrados a maior.
                </p>
              </div>
              <Link
                to="/"
                className="inline-flex items-center gap-2 py-3 px-6 rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-white font-semibold text-xs uppercase tracking-[-0.01em] transition"
              >
                <UploadCloud className="w-4 h-4 text-white" />
                <span>Auditar Minha Primeira Planilha</span>
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
                  {audits.length} {audits.length === 1 ? "Auditoria Registrada" : "Auditorias Registradas"}
                </span>
                <Link
                  to="/"
                  className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#000000] hover:text-[#ff5900] flex items-center gap-1"
                >
                  <span>+ Fazer Nova Auditoria</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {audits.map((item) => (
                  <div
                    key={item.id}
                    className="bg-[#ffffff] rounded-[12px] p-5 sm:p-6 border border-[#b9bbc6] hover:border-[#000000] transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div
                        className="w-10 h-10 rounded-[6px] flex items-center justify-center p-1 shrink-0 border border-[#b9bbc6] bg-[#f3f3f7]"
                      >
                        {item.platform === "mercadolivre" ? (
                          <MercadoLivreLogo className="w-full h-full" />
                        ) : (
                          <ShopeeLogo className="w-full h-full" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-semibold uppercase tracking-[-0.01em] px-2.5 py-0.5 rounded-[6px] bg-[#f3f3f7] border border-[#b9bbc6] text-[#000000] flex items-center gap-1.5">
                            {item.platform === "mercadolivre" ? (
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
                          </span>
                          <span className="text-xs text-[#8b8d98] flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(item.created_at)}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-[#60646c]">
                          <span>
                            <strong className="text-[#000000]">{item.total_orders_analyzed}</strong> pedidos analisados
                          </span>
                          <span className="text-[#8b8d98]">•</span>
                          <span className="text-[#000000]">
                            <strong>{item.total_divergent_orders}</strong> com cobrança a maior
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[#b9bbc6]">
                      <div className="text-left md:text-right">
                        <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#6f737b] block">
                          Valor a Recuperar
                        </span>
                        <span className="text-xl sm:text-2xl font-semibold text-[#000000]">
                          +{formatBRL(item.total_recoverable)}
                        </span>
                      </div>

                      <Link
                        to={`/resultado/${item.id}`}
                        className="py-2.5 px-4 rounded-[12px] bg-[#000000] hover:bg-[#15191e] text-white text-xs font-semibold uppercase tracking-[-0.01em] transition flex items-center gap-1.5 shrink-0"
                      >
                        <span>Ver Relatório</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#ff5900]" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>

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
              Privacidade (LGPD)
            </button>
            <span>•</span>
            <span>Painel do Vendedor</span>
          </div>
        </div>
      </footer>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />

      {/* Modal de Confirmacao de Exclusao (LGPD Art. 18, VI) */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-[#ffffff] border border-[#b9bbc6] rounded-[12px] max-w-md w-full p-6 shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#b9bbc6]">
              <div className="flex items-center gap-2 text-red-600">
                <Trash2 className="w-5 h-5 shrink-0" />
                <h3 className="text-base font-semibold text-[#000000]">
                  Excluir conta e dados pessoais
                </h3>
              </div>
              <button
                type="button"
                onClick={() => !deleteLoading && setIsDeleteModalOpen(false)}
                className="p-1.5 rounded-[6px] hover:bg-[#f3f3f7] text-[#60646c] hover:text-[#000000] transition cursor-pointer"
                disabled={deleteLoading}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-[#60646c] leading-relaxed">
              <p>
                Em conformidade com o <strong className="text-[#000000]">Art. 18, VI da LGPD</strong>, você tem o direito de solicitar a eliminação definitiva de todos os dados tratados com o seu consentimento.
              </p>
              <div className="p-3 rounded-[8px] bg-red-50 border border-red-200 text-red-700">
                <strong>Atenção:</strong> Esta ação é irreversível. Todas as suas conferências registradas, relatórios de divergência e vínculo de usuário serão permanentemente eliminados.
              </div>
              <p>
                Deseja realmente prosseguir com a exclusão definitiva?
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#b9bbc6]">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-[8px] border border-[#b9bbc6] bg-[#ffffff] hover:bg-[#f3f3f7] text-xs font-semibold text-[#000000] transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={deleteLoading}
                className="px-4 py-2 rounded-[8px] bg-red-600 hover:bg-red-700 text-xs font-semibold text-white transition cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {deleteLoading ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Excluindo...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Confirmar Exclusão</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HistoryPage;
