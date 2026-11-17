"use client";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Zap, Eye, EyeOff, ArrowRight, ShieldCheck, Lock, Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";

interface CleanMinimalSignInProps {
  onSuccess?: () => void;
  className?: string;
}

export function CleanMinimalSignIn({ onSuccess, className }: CleanMinimalSignInProps) {
  const navigate = useNavigate();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [magicLinkSent, setMagicLinkSent] = React.useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      // 1. Tenta login com senha
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) {
        // Se a senha falhar ou o usuário não tiver senha configurada ainda (gerada via Pix no Asaas)
        // Oferece envio de Magic Link instantâneo
        throw error;
      }

      if (data.user) {
        onSuccess?.();
        navigate("/historico");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao autenticar.";
      if (msg.includes("Invalid login credentials")) {
        setErrorMsg(
          "E-mail ou senha incorretos. Se você realizou o pagamento via Pix, utilize o link de acesso enviado ao seu e-mail."
        );
      } else {
        setErrorMsg(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!email) {
      setErrorMsg("Digite seu e-mail para receber o link de acesso.");
      return;
    }
    setLoading(true);
    setErrorMsg(null);

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;
      setMagicLinkSent(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao enviar link de acesso.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={cn(
        "w-full max-w-md mx-auto bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-soft-lg",
        className
      )}
    >
      {/* Logo ConfereAI */}
      <div className="flex flex-col items-center text-center mb-6">
        <Link to="/" className="flex items-center gap-2 group mb-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-xl shadow-glow-violet group-hover:scale-105 transition-transform">
            <Zap className="w-6 h-6 fill-white" />
          </div>
          <span className="font-black text-2xl tracking-tight text-slate-900">
            Confere<span className="text-indigo-600">AI</span>
          </span>
        </Link>
        <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">
          Acessar Minhas Conferências
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Consulte seus relatórios salvos e veja o dinheiro recuperado do Mercado Livre e Shopee.
        </p>
      </div>

      {magicLinkSent ? (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center">
          <ShieldCheck className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
          <h3 className="font-extrabold text-sm text-emerald-900">Link de Acesso Enviado!</h3>
          <p className="text-xs text-emerald-700 mt-1">
            Enviamos um link de acesso para <strong>{email}</strong>. Clique nele para entrar diretamente sem precisar de senha.
          </p>
          <button
            type="button"
            onClick={() => setMagicLinkSent(false)}
            className="mt-4 text-xs font-bold text-emerald-800 underline cursor-pointer"
          >
            Voltar ao login com senha
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
              E-mail Cadastrado
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-indigo-600 bg-slate-50/50"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Senha de Acesso
              </label>
              <button
                type="button"
                onClick={handleSendMagicLink}
                className="text-[11px] font-bold text-indigo-600 hover:underline cursor-pointer"
              >
                Esqueci / Entrar com Link
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-indigo-600 bg-slate-50/50"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-md transition flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {loading ? (
              "Verificando..."
            ) : (
              <>
                <span>Entrar no Painel</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={handleSendMagicLink}
              className="text-xs font-bold text-slate-500 hover:text-indigo-600 transition cursor-pointer"
            >
              Não tem senha? Entrar com Link Mágico no E-mail
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
        <Link to="/" className="hover:text-slate-700 transition font-medium">
          ← Voltar para o início
        </Link>
        <span className="font-semibold text-slate-500">ConfereAI 2026</span>
      </div>
    </div>
  );
}

export default CleanMinimalSignIn;
