import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Package,
  Calendar,
  ArrowRight,
  ShieldCheck,
  LogOut,
  UploadCloud,
  FileSpreadsheet,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { LiquidGlassNavbar } from "../components/ui/liquid-glass-navbar";

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
    <div className="min-h-screen bg-[#F8F9FD] text-slate-800 pb-20">
      <LiquidGlassNavbar variant="result" isPro={isPro} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-10 space-y-6">
        {/* Cabecalho de Boas-Vindas e Dados da Conta */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
              Painel do Lojista
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Minhas Auditorias
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 font-medium">
              Consulte seus relatorios de repasses extraidos e abra os chamados de estorno.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <div className="px-4 py-2 rounded-2xl bg-slate-50 border border-slate-200 text-xs">
              <span className="text-slate-400 block text-[10px] uppercase font-bold">
                Conta Cadastrada
              </span>
              <span className="font-extrabold text-slate-800">
                {userEmail || "Acesso Local Demo"}
              </span>
            </div>

            <div className="px-4 py-2 rounded-2xl bg-indigo-50 border border-indigo-100 text-xs flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
              <div>
                <span className="text-indigo-600 block text-[10px] uppercase font-bold">
                  Status
                </span>
                <span className="font-extrabold text-indigo-950">
                  {isPro ? "Assinante Pro Ativo" : "Plano Gratuito"}
                </span>
              </div>
            </div>

            {userEmail && (
              <button
                type="button"
                onClick={handleSignOut}
                className="p-2.5 rounded-2xl border border-slate-200 text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                title="Sair da Conta"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Listagem das Auditorias */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 border border-slate-200/90 shadow-soft flex flex-col items-center justify-center text-center">
            <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-3" />
            <p className="text-sm font-extrabold text-slate-800">
              Carregando relatorios...
            </p>
          </div>
        ) : audits.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 sm:p-14 border border-slate-200/90 shadow-soft text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mx-auto border border-indigo-100 shadow-xs">
              <FileSpreadsheet className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight">
                Nenhuma auditoria realizada ainda
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mt-1 font-medium">
                Envie seu primeiro extrato de repasses do Mercado Livre ou Shopee para descobrir valores cobrados a maior.
              </p>
            </div>
            <Link
              to="/"
              className="inline-flex items-center gap-2 py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-md transition"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Auditar Minha Primeira Planilha</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {audits.length} {audits.length === 1 ? "Auditoria Registrada" : "Auditorias Registradas"}
              </span>
              <Link
                to="/"
                className="text-xs font-extrabold text-indigo-600 hover:underline flex items-center gap-1"
              >
                <span>+ Fazer Nova Auditoria</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 gap-3.5">
              {audits.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-soft hover:border-indigo-200 transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 border ${
                        item.platform === "mercadolivre"
                          ? "bg-amber-50 text-amber-900 border-amber-200/80"
                          : "bg-orange-50 text-orange-900 border-orange-200/80"
                      }`}
                    >
                      <Package className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {item.platform === "mercadolivre" ? "Mercado Livre" : "Shopee"}
                        </span>
                        <span className="text-xs text-slate-400 flex items-center gap-1 font-medium">
                          <Calendar className="w-3.5 h-3.5" />
                          {formatDate(item.created_at)}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 mt-2 text-xs text-slate-600 font-medium">
                        <span>
                          <strong>{item.total_orders_analyzed}</strong> pedidos analisados
                        </span>
                        <span className="w-1 h-1 rounded-full bg-slate-300 hidden sm:inline-block" />
                        <span className="text-rose-600 font-bold">
                          <strong>{item.total_divergent_orders}</strong> com cobranca a maior
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="text-left md:text-right">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">
                        Valor Identificado
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600">
                        +{formatBRL(item.total_recoverable)}
                      </span>
                    </div>

                    <Link
                      to={`/resultado/${item.id}`}
                      className="py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider transition flex items-center gap-1.5 shadow-xs shrink-0"
                    >
                      <span>Abrir Diagnostico</span>
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
