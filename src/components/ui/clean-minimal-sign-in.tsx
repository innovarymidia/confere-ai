"use client";
import * as React from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, ArrowRight, ShieldCheck, Lock, Mail } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { ConfereAiLogo } from "./marketplace-logos";

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
        "w-full max-w-md mx-auto bg-white rounded-[6px] p-6 sm:p-8 border border-[#ebebeb] shadow-subtle",
        className
      )}
    >
      {/* Logo ConfereAI */}
      <div className="flex flex-col items-center text-center mb-6">
        <Link to="/" className="flex items-center justify-center group mb-3" aria-label="ConfereAI Home">
          <ConfereAiLogo className="h-10 w-auto rounded-[4px] shadow-subtle-2 group-hover:scale-[1.01] transition-transform" />
        </Link>
        <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
          Acesso Seguro
        </span>
        <h1 className="text-xl font-normal text-[#171717] tracking-tight mt-1">
          Acessar Minhas Conferências
        </h1>
        <p className="text-xs text-[#4d4d4d] mt-1 font-normal leading-relaxed">
          Consulte seus relatórios salvos e veja o dinheiro recuperado do Mercado Livre e Shopee.
        </p>
      </div>

      {magicLinkSent ? (
        <div className="p-4 rounded-[6px] bg-[#fafafa] border border-[#ebebeb] text-center">
          <ShieldCheck className="w-6 h-6 text-[#171717] mx-auto mb-2" />
          <h3 className="font-medium text-sm text-[#171717]">Link de Acesso Enviado!</h3>
          <p className="text-xs text-[#4d4d4d] mt-1 font-normal leading-relaxed">
            Enviamos um link de acesso para <strong className="text-[#171717]">{email}</strong>. Clique nele para entrar diretamente sem precisar de senha.
          </p>
          <button
            type="button"
            onClick={() => setMagicLinkSent(false)}
            className="mt-4 font-mono text-[11px] uppercase tracking-[0.071em] text-[#171717] underline cursor-pointer"
          >
            Voltar ao login com senha
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666] mb-1">
              E-mail Cadastrado
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8f8f8f] absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                className="w-full pl-9 pr-3 py-2 rounded-[6px] border border-[#ebebeb] bg-[#fafafa] text-sm text-[#171717] focus:bg-white focus:border-[#171717] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
                Senha de Acesso
              </label>
              <button
                type="button"
                onClick={handleSendMagicLink}
                className="font-mono text-[10px] text-[#666666] hover:text-[#171717] hover:underline cursor-pointer"
              >
                Entrar com Link no E-mail
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8f8f8f] absolute left-3 top-2.5" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-9 py-2 rounded-[6px] border border-[#ebebeb] bg-[#fafafa] text-sm text-[#171717] focus:bg-white focus:border-[#171717] focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-[#8f8f8f] hover:text-[#171717] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-[6px] bg-red-50 border border-red-200 text-xs font-normal text-red-700">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-medium text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 shadow-subtle"
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
              className="font-mono text-[11px] text-[#666666] hover:text-[#171717] transition cursor-pointer"
            >
              Não tem senha? Entrar com Link Mágico no E-mail
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-[#ebebeb] flex items-center justify-between font-mono text-[11px] text-[#8f8f8f]">
        <Link to="/" className="hover:text-[#171717] transition">
          ← Voltar ao início
        </Link>
        <span>ConfereAI 2026</span>
      </div>
    </div>
  );
}

export default CleanMinimalSignIn;
