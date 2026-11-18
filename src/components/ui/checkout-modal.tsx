"use client";
import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { X, Check, Copy, ArrowRight, ShieldCheck, Sparkles, Eye, EyeOff, Lock, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { PrivacyModal } from "./privacy-modal";

export interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPlanId?: "pro" | "escala";
  initialBilling?: "monthly" | "yearly";
  auditId?: string;
  totalOrders?: number;
  onSuccess?: () => void;
}

export function CheckoutModal({
  isOpen,
  onClose,
  initialPlanId = "pro",
  initialBilling = "monthly",
  auditId,
  totalOrders,
  onSuccess,
}: CheckoutModalProps) {
  const [selectedPlanId, setSelectedPlanId] = useState<"pro" | "escala">(initialPlanId);
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "yearly">(initialBilling);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [whatsapp, setWhatsapp] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [accountExistsAlert, setAccountExistsAlert] = useState<{ message: string; email: string } | null>(null);
  const [recoverySent, setRecoverySent] = useState(false);
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; copyPaste: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  // Preço total do ciclo
  const currentPlanPrice = useMemo(() => {
    if (selectedPlanId === "escala") {
      return selectedBilling === "yearly" ? 1416 : 147;
    }
    return selectedBilling === "yearly" ? 648 : 67;
  }, [selectedPlanId, selectedBilling]);

  const currentPlanMonthlyEquivalent = useMemo(() => {
    if (selectedPlanId === "escala") {
      return selectedBilling === "yearly" ? 118 : 147;
    }
    return selectedBilling === "yearly" ? 54 : 67;
  }, [selectedPlanId, selectedBilling]);

  // Identifica se o usuário já possui login ativo no navegador
  useEffect(() => {
    async function checkCurrentSession() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (user) {
          setIsLoggedIn(true);
          setCurrentUserEmail(user.email || null);
          if (user.email) setEmail(user.email);
          if (user.user_metadata?.full_name) setFullName(user.user_metadata.full_name);
          setUserId(user.id);
        } else {
          setIsLoggedIn(false);
          setCurrentUserEmail(null);
        }
      } catch {
        setIsLoggedIn(false);
      }
    }

    if (isOpen) {
      checkCurrentSession();
    }
  }, [isOpen]);

  // Monitora aprovacao do pagamento em tempo real (WebSocket Realtime + Polling de Contingencia)
  useEffect(() => {
    if (!userId) return;

    let isSubscribed = true;

    // 1. Canal Realtime via WebSocket
    const channel = supabase
      .channel(`checkout_profile_${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${userId}`,
        },
        (payload) => {
          const updatedProfile = payload.new as { is_pro?: boolean };
          if (updatedProfile?.is_pro && isSubscribed) {
            onSuccess?.();
            onClose();
          }
        }
      )
      .subscribe();

    // 2. Polling de contingência a cada 3 segundos (caso WebSocket oscile na rede móvel do cliente)
    const pollInterval = setInterval(async () => {
      try {
        const { data } = await supabase
          .from("profiles")
          .select("is_pro")
          .eq("id", userId)
          .maybeSingle();

        if (data?.is_pro && isSubscribed) {
          onSuccess?.();
          onClose();
        }
      } catch {
        // Ignora erro momentâneo de rede
      }
    }, 3000);

    return () => {
      isSubscribed = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [userId, onSuccess, onClose]);

  const handleSendRecoveryLink = async () => {
    const targetEmail = accountExistsAlert?.email || email;
    if (!targetEmail) return;

    setRecoveryLoading(true);
    setCheckoutError(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(
        targetEmail.trim().toLowerCase(),
        {
          redirectTo: `${window.location.origin}/login`,
        }
      );

      if (error) {
        // Fallback OTP/Magic Link
        await supabase.auth.signInWithOtp({
          email: targetEmail.trim().toLowerCase(),
          options: {
            emailRedirectTo: `${window.location.origin}/login`,
          },
        });
      }
      setRecoverySent(true);
    } catch {
      setCheckoutError("Não foi possível enviar o link de recuperação. Tente fazer login diretamente.");
    } finally {
      setRecoveryLoading(false);
    }
  };

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);
    setCheckoutError(null);
    setAccountExistsAlert(null);

    // Validação de senha para novos cadastros
    if (!isLoggedIn && (!password || password.trim().length < 6)) {
      setCheckoutError("Crie uma senha com no mínimo 6 caracteres para poder acessar o sistema depois.");
      setCheckoutLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          fullName,
          email,
          password: !isLoggedIn ? password.trim() : undefined,
          whatsapp,
          cpfCnpj,
          auditId: auditId || "direct",
          planId: selectedPlanId,
          billing: selectedBilling,
        },
      });

      if (error) {
        let msg = error.message || "Falha ao gerar cobrança no Asaas.";
        let errCode = "";
        let accountEmail = "";

        if ((error as any).context) {
          try {
            const errJson = await (error as any).context.json();
            if (errJson?.error) msg = errJson.error;
            if (errJson?.code) errCode = errJson.code;
            if (errJson?.accountEmail) accountEmail = errJson.accountEmail;
          } catch {
            // Ignora
          }
        }

        if (errCode === "ACCOUNT_EXISTS") {
          setAccountExistsAlert({
            message: msg,
            email: accountEmail || email,
          });
          return;
        }

        throw new Error(msg);
      }

      if (data?.error) {
        if (data.code === "ACCOUNT_EXISTS") {
          setAccountExistsAlert({
            message: data.error,
            email: data.accountEmail || email,
          });
          return;
        }
        throw new Error(data.error);
      }

      if (data?.session?.access_token && data?.session?.refresh_token) {
        await supabase.auth.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
        });
      } else if (!isLoggedIn && password) {
        try {
          await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password: password.trim(),
          });
        } catch {
          // Ignora se der erro pontual de rede
        }
      }

      if (data?.userId) {
        setUserId(data.userId);
      }

      setPixData({
        qrCodeBase64: data.qrCodeBase64,
        copyPaste: data.copyPaste,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar cobrança Pix.";
      setCheckoutError(msg);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-[#ffffff] rounded-[12px] shadow-modal border border-[#b9bbc6] p-6 sm:p-8 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#60646c] hover:text-[#000000] p-1.5 rounded-[12px] border border-[#b9bbc6] hover:border-[#000000] transition cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {!pixData ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#ff5900]" />
                Auditoria Oficial ConfereAI
              </span>
            </div>

            <h3 className="text-2xl font-semibold text-[#000000] tracking-[-0.025em] mt-1">
              {totalOrders
                ? `Liberar Lista Completa (${totalOrders} Pedidos)`
                : "Ativar Assinatura ConfereAI"}
            </h3>
            <p className="text-xs sm:text-sm text-[#60646c] mt-1 font-normal leading-relaxed tracking-[-0.01em]">
              Escolha o plano ideal e gere o Pix para liberação imediata da sua conta.
            </p>

            {/* Alternador Mensal ou Anual */}
            <div className="flex items-center justify-between p-1 bg-[#f3f3f7] border border-[#b9bbc6] rounded-[12px] mt-4 mb-3">
              <button
                type="button"
                onClick={() => setSelectedBilling("monthly")}
                className={`flex-1 py-1.5 text-xs font-semibold tracking-[-0.01em] rounded-[8px] transition cursor-pointer text-center ${
                  selectedBilling === "monthly"
                    ? "bg-[#000000] text-white"
                    : "text-[#60646c] hover:text-[#000000]"
                }`}
              >
                Cobrança Mensal
              </button>
              <button
                type="button"
                onClick={() => setSelectedBilling("yearly")}
                className={`flex-1 py-1.5 text-xs font-semibold tracking-[-0.01em] rounded-[8px] transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedBilling === "yearly"
                    ? "bg-[#000000] text-white"
                    : "text-[#60646c] hover:text-[#000000]"
                }`}
              >
                <span>Plano Anual</span>
                <span className="text-[10px] text-[#000000] bg-white px-1.5 py-0.5 rounded-[4px] border border-[#b9bbc6]">
                  20% OFF
                </span>
              </button>
            </div>

            {/* Seleção de Planos (Pro vs Escala) */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div
                onClick={() => setSelectedPlanId("pro")}
                className={`p-4 rounded-[12px] border transition cursor-pointer text-left relative ${
                  selectedPlanId === "pro"
                    ? "border-[#000000] bg-white ring-1 ring-[#000000]"
                    : "border-[#b9bbc6] bg-[#f3f3f7] hover:border-[#000000]/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] block">
                    Mais Escolhido
                  </span>
                  {selectedPlanId === "pro" && (
                    <Sparkles className="w-3.5 h-3.5 text-[#ff5900]" />
                  )}
                </div>
                <h4 className="text-sm font-semibold text-[#000000] mt-0.5">Pro Seller</h4>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-base font-semibold text-[#000000]">
                    R$ {currentPlanMonthlyEquivalent}
                  </span>
                  <span className="text-xs text-[#60646c]">/mês</span>
                </div>
                <span className="text-[11px] text-[#6f737b] block mt-1 tracking-[-0.01em]">
                  {selectedBilling === "yearly" ? "R$ 648 cobrado ao ano" : "Cobrança mensal"}
                </span>
              </div>

              <div
                onClick={() => setSelectedPlanId("escala")}
                className={`p-4 rounded-[12px] border transition cursor-pointer text-left relative ${
                  selectedPlanId === "escala"
                    ? "border-[#000000] bg-white ring-1 ring-[#000000]"
                    : "border-[#b9bbc6] bg-[#f3f3f7] hover:border-[#000000]/60"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] block">
                    Até 5 Lojas
                  </span>
                  {selectedPlanId === "escala" && (
                    <Sparkles className="w-3.5 h-3.5 text-[#ff5900]" />
                  )}
                </div>
                <h4 className="text-sm font-semibold text-[#000000] mt-0.5">Operação Escala</h4>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="text-base font-semibold text-[#000000]">
                    R$ {selectedBilling === "yearly" ? 118 : 147}
                  </span>
                  <span className="text-xs text-[#60646c]">/mês</span>
                </div>
                <span className="text-[11px] text-[#6f737b] block mt-1 tracking-[-0.01em]">
                  {selectedBilling === "yearly" ? "R$ 1.416 cobrado ao ano" : "Cobrança mensal"}
                </span>
              </div>
            </div>

            <form onSubmit={handleGeneratePix} className="space-y-3">
              {isLoggedIn && (
                <div className="p-3 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#ff5900] shrink-0" />
                    <span className="text-[#60646c]">
                      Conectado como <strong className="text-[#000000]">{currentUserEmail || email}</strong>
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] px-2 py-0.5 rounded-[6px] bg-[#000000] text-white">
                    Sessão Ativa
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c] mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#b9bbc6] bg-[#f3f3f7] text-sm text-[#000000] placeholder:text-[#8b8d98] focus:bg-white focus:border-[#000000] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c] mb-1">
                  Melhor E-mail (seu acesso)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@sualoja.com.br"
                  className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#b9bbc6] bg-[#f3f3f7] text-sm text-[#000000] placeholder:text-[#8b8d98] focus:bg-white focus:border-[#000000] focus:outline-none transition-all"
                />
              </div>

              {!isLoggedIn && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
                      Criar Senha de Acesso
                    </label>
                    <span className="text-[11px] text-[#8b8d98]">Mínimo 6 dígitos</span>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-[#8b8d98] absolute left-3.5 top-3" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Crie uma senha para acessar sua conta"
                      className="w-full pl-10 pr-10 py-2.5 rounded-[12px] border border-[#b9bbc6] bg-[#f3f3f7] text-sm text-[#000000] placeholder:text-[#8b8d98] focus:bg-white focus:border-[#000000] focus:outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-[#8b8d98] hover:text-[#000000] cursor-pointer"
                      aria-label={showPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-[11px] text-[#60646c] mt-1 tracking-[-0.01em]">
                    Você usará este e-mail e senha para acessar o painel e conferências futuras.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c] mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#b9bbc6] bg-[#f3f3f7] text-sm text-[#000000] placeholder:text-[#8b8d98] focus:bg-white focus:border-[#000000] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c] mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    required
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3.5 py-2.5 rounded-[12px] border border-[#b9bbc6] bg-[#f3f3f7] text-sm text-[#000000] placeholder:text-[#8b8d98] focus:bg-white focus:border-[#000000] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {accountExistsAlert && (
                <div className="p-4 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <AlertCircle className="w-4 h-4 text-[#ff5900] shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-[#000000] text-sm tracking-[-0.01em]">
                        Conta Já Cadastrada
                      </h4>
                      <p className="text-[#60646c] mt-0.5 font-normal leading-relaxed tracking-[-0.01em]">
                        {accountExistsAlert.message}
                      </p>
                    </div>
                  </div>

                  {recoverySent ? (
                    <div className="p-3 rounded-[8px] bg-white border border-[#b9bbc6] text-[#000000]">
                      <span className="font-semibold block">Link enviado com sucesso!</span>
                      <span className="text-[#60646c] block mt-0.5">
                        Verifique a caixa de entrada de <strong>{accountExistsAlert.email}</strong> para redefinir sua senha ou acessar sua conta.
                      </span>
                    </div>
                  ) : (
                    <div className="space-y-2.5 pt-1">
                      <p className="text-[11px] text-[#000000] font-medium">
                        Já sabe sua senha? Digite-a para confirmar e gerar o Pix:
                      </p>
                      <div className="flex gap-2">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Sua senha cadastrada"
                          className="flex-1 px-3 py-2 rounded-[8px] border border-[#b9bbc6] bg-white text-xs text-[#000000] focus:outline-none focus:border-[#000000]"
                        />
                        <button
                          type="button"
                          disabled={checkoutLoading || !password}
                          onClick={(e) => handleGeneratePix(e)}
                          className="px-3.5 py-2 rounded-[8px] bg-[#ff5900] hover:bg-[#e04f00] text-white font-semibold text-xs transition cursor-pointer shrink-0"
                        >
                          {checkoutLoading ? "Entrando..." : "Entrar e Gerar Pix"}
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-2 pt-1 border-t border-[#b9bbc6]/40">
                        <button
                          type="button"
                          disabled={recoveryLoading}
                          onClick={handleSendRecoveryLink}
                          className="w-full sm:w-auto px-3.5 py-1.5 rounded-[8px] bg-[#000000] hover:bg-[#15191e] text-white font-semibold text-xs tracking-[-0.01em] transition cursor-pointer"
                        >
                          {recoveryLoading ? "Enviando..." : "Esqueci a Senha"}
                        </button>

                        <Link
                          to="/login"
                          className="w-full sm:w-auto px-3.5 py-1.5 rounded-[8px] bg-white hover:bg-[#f3f3f7] border border-[#b9bbc6] text-[#000000] font-semibold text-xs tracking-[-0.01em] text-center transition"
                        >
                          Ir para Página de Login
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {checkoutError && (
                <div className="p-3.5 rounded-[12px] bg-red-50 border border-red-200 text-xs text-red-700 space-y-2">
                  <p className="font-medium">{checkoutError}</p>
                  <p className="text-[11px] text-red-600">
                    Se deseja testar e visualizar a liberação de todos os pedidos da planilha enquanto ajusta a chave de API:
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      onSuccess?.();
                      onClose();
                    }}
                    className="underline font-semibold text-xs text-red-800 hover:text-red-950 cursor-pointer block"
                  >
                    Simular liberação de teste agora →
                  </button>
                </div>
              )}

              {/* Botão de Finalização com Ember #ff5900 e 12px de raio */}
              <button
                type="submit"
                disabled={checkoutLoading}
                className="w-full py-3.5 rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-white font-semibold text-sm tracking-[-0.01em] transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {checkoutLoading ? (
                  "Gerando Pix..."
                ) : (
                  <>
                    <span>
                      Gerar Pix de R$ {currentPlanPrice.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      {selectedBilling === "yearly" ? " (Plano Anual: 20% OFF)" : " (Plano Mensal)"}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-[#60646c] text-center mt-2.5 leading-relaxed tracking-[-0.01em]">
                Ao gerar o Pix, você concorda com nossos{" "}
                <button
                  type="button"
                  onClick={() => setIsPrivacyOpen(true)}
                  className="underline text-[#000000] font-medium hover:text-[#ff5900] cursor-pointer"
                >
                  Termos e Política de Privacidade (LGPD)
                </button>.
              </p>
            </form>
          </>
        ) : (
          <div className="text-center py-2">
            <span className="inline-flex items-center gap-1.5 text-xs text-[#60646c] bg-[#f3f3f7] border border-[#b9bbc6] px-3 py-1 rounded-[6px]">
              <span className="w-2 h-2 rounded-full bg-[#ff5900] animate-ping" />
              Aguardando pagamento Pix...
            </span>
            <h3 className="text-xl font-semibold text-[#000000] tracking-[-0.025em] mt-3">
              Escaneie o QR Code no seu banco
            </h3>
            <p className="text-xs sm:text-sm text-[#60646c] mt-1 font-normal tracking-[-0.01em]">
              Assim que você pagar, o acesso é liberado em segundos.
            </p>

            <div className="my-5 flex justify-center">
              <div className="p-4 rounded-[12px] bg-[#ffffff] border border-[#b9bbc6]">
                <img
                  src={
                    pixData.qrCodeBase64.startsWith("data:")
                      ? pixData.qrCodeBase64
                      : `data:image/png;base64,${pixData.qrCodeBase64}`
                  }
                  alt="QR Code Pix"
                  className="w-48 h-48 object-contain"
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
              className="w-full py-3 rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-white font-semibold text-xs uppercase tracking-[-0.01em] transition flex items-center justify-center gap-2 cursor-pointer"
            >
              {pixCopied ? (
                <>
                  <Check className="w-4 h-4 text-white" />
                  <span>Código Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copiar Código Pix Copia e Cola</span>
                </>
              )}
            </button>
          </div>
        )}
      </div>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}

export default CheckoutModal;
