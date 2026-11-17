import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Calendar,
  ArrowRight,
  ShieldCheck,
  LogOut,
  UploadCloud,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { LiquidGlassNavbar } from "../components/ui/liquid-glass-navbar";
import { MercadoLivreLogo, ShopeeLogo } from "../components/ui/marketplace-logos";

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
  const [isPro, setIsPro] = useState(false);

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

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#171717] pb-20">
      <LiquidGlassNavbar variant="result" isPro={isPro} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-10 space-y-6">
        {/* Cabecalho de Boas-Vindas e Dados da Conta */}
        <div className="bg-white rounded-[6px] p-6 sm:p-8 border border-[#ebebeb] shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666] block mb-1">
              Minha Conta de Vendedor
            </span>
            <h1 className="text-2xl sm:text-3xl font-normal text-[#171717] tracking-tight">
              Minhas Conferências
            </h1>
            <p className="text-xs sm:text-sm text-[#4d4d4d] mt-1 font-normal leading-relaxed">
              Consulte suas conferências de vendas e veja quanto dinheiro você tem para receber de volta.
            </p>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto flex-wrap">
            <div className="px-3 py-1.5 rounded-[4px] bg-[#fafafa] border border-[#ebebeb] text-xs font-mono">
              <span className="text-[#8f8f8f] block text-[10px] uppercase">
                Conta Cadastrada
              </span>
              <span className="text-[#171717]">
                {userEmail || "Acesso Local Demo"}
              </span>
            </div>

            <div className="px-3 py-1.5 rounded-[4px] bg-[#fafafa] border border-[#ebebeb] text-xs font-mono flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#171717] shrink-0" />
              <div>
                <span className="text-[#8f8f8f] block text-[10px] uppercase">
                  Status
                </span>
                <span className="text-[#171717]">
                  {isPro ? "Assinante Pro Ativo" : "Plano Gratuito"}
                </span>
              </div>
            </div>

            {userEmail && (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-2 rounded-[4px] border border-[#ebebeb] text-[#666666] hover:text-[#171717] hover:border-[#171717] transition cursor-pointer"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Listagem das Auditorias */}
        {loading ? (
          <div className="bg-white rounded-[6px] p-12 border border-[#ebebeb] shadow-subtle flex flex-col items-center justify-center text-center">
            <div className="w-8 h-8 border-2 border-[#171717] border-t-transparent rounded-full animate-spin mb-3" />
            <p className="font-mono text-xs uppercase tracking-[0.071em] text-[#666666]">
              Carregando relatórios...
            </p>
          </div>
        ) : audits.length === 0 ? (
          <div className="bg-white rounded-[6px] p-10 sm:p-14 border border-[#ebebeb] shadow-subtle text-center space-y-4">
            <div className="w-12 h-12 rounded-[6px] bg-[#fafafa] text-[#171717] flex items-center justify-center mx-auto border border-[#ebebeb]">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-normal text-[#171717] tracking-tight">
                Nenhuma auditoria realizada ainda
              </h2>
              <p className="text-xs sm:text-sm text-[#4d4d4d] max-w-md mx-auto mt-1 font-normal leading-relaxed">
                Envie seu primeiro extrato de repasses do Mercado Livre ou Shopee para descobrir valores cobrados a maior.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 py-3 px-6 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-medium text-xs uppercase tracking-wider shadow-subtle transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Auditar Minha Primeira Planilha</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
                {audits.length} {audits.length === 1 ? "Auditoria Registrada" : "Auditorias Registradas"}
              </span>
              <Link
                to="/"
                className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#171717] hover:underline flex items-center gap-1"
              >
                <span>+ Fazer Nova Auditoria</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3">
              {audits.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-[6px] p-5 sm:p-6 border border-[#ebebeb] shadow-subtle hover:border-[#171717] transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-[4px] flex items-center justify-center p-1 shrink-0 border border-[#ebebeb] bg-[#fafafa]"
                    >
                      {item.platform === "mercadolivre" ? (
                        <MercadoLivreLogo className="w-full h-full" />
                      ) : (
                        <ShopeeLogo className="w-full h-full" />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[11px] uppercase tracking-[0.071em] px-2 py-0.5 rounded-[4px] bg-[#fafafa] border border-[#ebebeb] text-[#171717] flex items-center gap-1.5">
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
                        <span className="font-mono text-xs text-[#8f8f8f] flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 font-mono text-xs text-[#4d4d4d]">
                        <span>
                          <strong className="text-[#171717]">{item.total_orders_analyzed}</strong> pedidos analisados
                        </span>
                        <span className="text-[#8f8f8f]">•</span>
                        <span className="text-[#297a3a]">
                          <strong>{item.total_divergent_orders}</strong> com cobrança a maior
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-[#ebebeb]">
                    <div className="text-left md:text-right">
                      <span className="font-mono text-[10px] uppercase tracking-[0.071em] text-[#666666] block">
                        Valor a Recuperar
                      </span>
                      <span className="font-mono text-xl sm:text-2xl font-normal text-[#297a3a]">
                        +{formatBRL(item.total_recoverable)}
                      </span>
                    </div>

                    <Link
                      to={`/resultado/${item.id}`}
                      className="py-2 px-3.5 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-mono text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-subtle shrink-0"
                    >
                      <span>Ver Relatório</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default HistoryPage;
