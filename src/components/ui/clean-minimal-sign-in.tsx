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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim(),
      });

      if (error) {
        throw error;
      }

      if (data.user) {
        onSuccess?.();
        const lastAuditId = sessionStorage.getItem("last_audit_id");
        if (lastAuditId) {
          navigate(`/resultado/${lastAuditId}`);
        } else {
          navigate("/historico");
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Falha ao autenticar.";
      if (msg.includes("Invalid login credentials")) {
        setErrorMsg(
          "E-mail ou senha incorretos. Verifique a senha cadastrada na compra ou solicite um link de acesso direto."
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
        "w-full max-w-md mx-auto bg-[#ffffff] rounded-[12px] p-6 sm:p-8 border border-[#b9bbc6]",
        className
      )}
    >
      {/* Logo ConfereAI */}
      <div className="flex flex-col items-center text-center mb-6">
        <Link to="/" className="flex items-center justify-center group mb-3" aria-label="ConfereAI Home">
          <ConfereAiLogo className="h-9 w-auto rounded-[6px] group-hover:opacity-90 transition-opacity" />
        </Link>
        <span className="text-[12px] font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
          Acesso Seguro
        </span>
        <h1 className="text-2xl font-semibold text-[#000000] tracking-[-0.025em] mt-1">
          Acessar Minhas Conferências
        </h1>
        <p className="text-xs sm:text-sm text-[#60646c] mt-1 font-normal leading-relaxed tracking-[-0.01em]">
          Consulte seus relatórios salvos e veja o dinheiro recuperado do Mercado Livre e Shopee.
        </p>
      </div>

      {magicLinkSent ? (
        <div className="p-4 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] text-center">
          <ShieldCheck className="w-6 h-6 text-[#ff5900] mx-auto mb-2" />
          <h3 className="font-semibold text-sm text-[#000000]">Link de Acesso Enviado!</h3>
          <p className="text-xs text-[#60646c] mt-1 font-normal leading-relaxed tracking-[-0.01em]">
            Enviamos um link de acesso para <strong className="text-[#000000]">{email}</strong>. Clique nele para entrar diretamente sem precisar de senha.
          </p>
          <button
            type="button"
            onClick={() => setMagicLinkSent(false)}
            className="mt-4 text-xs font-semibold uppercase tracking-[-0.01em] text-[#000000] underline cursor-pointer"
          >
            Voltar ao login com senha
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c] mb-1">
              E-mail Cadastrado
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#8b8d98] absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com.br"
                className="w-full pl-10 pr-3.5 py-2.5 rounded-[12px] border border-[#b9bbc6] bg-[#f3f3f7] text-sm text-[#000000] placeholder:text-[#8b8d98] focus:bg-white focus:border-[#000000] focus:outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
                Senha de Acesso
              </label>
              <button
                type="button"
                onClick={handleSendMagicLink}
                className="text-xs text-[#60646c] hover:text-[#000000] hover:underline cursor-pointer"
              >
                Entrar com Link no E-mail
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#8b8d98] absolute left-3.5 top-3" />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-10 py-2.5 rounded-[12px] border border-[#b9bbc6] bg-[#f3f3f7] text-sm text-[#000000] placeholder:text-[#8b8d98] focus:bg-white focus:border-[#000000] focus:outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3 text-[#8b8d98] hover:text-[#000000] cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-[12px] bg-red-50 border border-red-200 text-xs font-normal text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Botão de Entrar com Ember #ff5900 e 12px de raio */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-white font-semibold text-xs uppercase tracking-[-0.01em] transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
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
              className="text-xs text-[#60646c] hover:text-[#000000] transition cursor-pointer"
            >
              Não tem senha? Entrar com Link no E-mail
            </button>
          </div>
        </form>
      )}

      <div className="mt-6 pt-4 border-t border-[#b9bbc6] flex items-center justify-between text-xs text-[#8b8d98]">
        <Link to="/" className="hover:text-[#000000] transition">
          ← Voltar ao início
        </Link>
        <span>ConfereAI 2026</span>
      </div>
    </div>
  );
}

export default CleanMinimalSignIn;
