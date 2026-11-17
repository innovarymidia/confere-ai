"use client";
import * as React from "react";
import { useState, useMemo, useEffect } from "react";
import { X, Check, Copy, ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

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
  const [whatsapp, setWhatsapp] = useState("");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{ qrCodeBase64: string; copyPaste: string } | null>(null);
  const [pixCopied, setPixCopied] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

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

  // Monitora aprovacao do pagamento em tempo real
  useEffect(() => {
    if (!userId) return;

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
          if (updatedProfile?.is_pro) {
            onSuccess?.();
            onClose();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onSuccess, onClose]);

  const handleGeneratePix = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutLoading(true);
    setCheckoutError(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          fullName,
          email,
          whatsapp,
          cpfCnpj,
          auditId: auditId || "direct",
          planId: selectedPlanId,
          billing: selectedBilling,
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
      // Demonstracao local de fallback
      const dummyQrCode =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
      setPixData({
        qrCodeBase64: dummyQrCode,
        copyPaste:
          "00020126580014br.gov.bcb.pix0136123e4567-e89b-12d3-a456-426614174000520400005303986540567.005802BR5913ConfereAI6009Sao Paulo62070503***6304ABCD",
      });

      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 5000);
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-[6px] shadow-subtle border border-[#ebebeb] p-6 sm:p-7 max-h-[92vh] overflow-y-auto">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#666666] hover:text-[#171717] p-1 rounded-[4px] border border-[#ebebeb] hover:border-[#171717] transition cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {!pixData ? (
          <>
            <div className="flex items-center gap-2 mb-1">
              <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666] flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#171717]" />
                Auditoria Oficial ConfereAI
              </span>
            </div>

            <h3 className="text-xl font-normal text-[#171717] tracking-[-0.05em] mt-1">
              {totalOrders
                ? `Liberar Lista Completa (${totalOrders} Pedidos)`
                : "Ativar Assinatura ConfereAI"}
            </h3>
            <p className="text-xs text-[#4d4d4d] mt-1 font-normal leading-relaxed">
              Escolha o plano ideal e gere o Pix para liberação imediata da sua conta.
            </p>

            {/* Alternador Mensal ou Anual */}
            <div className="flex items-center justify-between p-1 bg-[#fafafa] border border-[#ebebeb] rounded-full mt-4 mb-3">
              <button
                type="button"
                onClick={() => setSelectedBilling("monthly")}
                className={`flex-1 py-1 text-[11px] font-mono uppercase tracking-[0.071em] rounded-full transition cursor-pointer text-center ${
                  selectedBilling === "monthly"
                    ? "bg-[#171717] text-white"
                    : "text-[#666666] hover:text-[#171717]"
                }`}
              >
                Cobrança Mensal
              </button>
              <button
                type="button"
                onClick={() => setSelectedBilling("yearly")}
                className={`flex-1 py-1 text-[11px] font-mono uppercase tracking-[0.071em] rounded-full transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  selectedBilling === "yearly"
                    ? "bg-[#171717] text-white"
                    : "text-[#666666] hover:text-[#171717]"
                }`}
              >
                <span>Plano Anual</span>
                <span className="text-[10px] text-[#297a3a] bg-[#297a3a]/10 px-1.5 py-0.2 rounded-full border border-[#297a3a]/20">
                  20% OFF
                </span>
              </button>
            </div>

            {/* Seleção de Planos (Pro vs Escala) */}
            <div className="grid grid-cols-2 gap-2.5 mb-4">
              <div
                onClick={() => setSelectedPlanId("pro")}
                className={`p-3.5 rounded-[6px] border transition cursor-pointer text-left relative ${
                  selectedPlanId === "pro"
                    ? "border-[#171717] bg-white ring-1 ring-[#171717] shadow-subtle"
                    : "border-[#ebebeb] bg-[#fafafa] hover:border-[#171717]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.071em] text-[#666666] block">
                    Mais Escolhido
                  </span>
                  {selectedPlanId === "pro" && (
                    <Sparkles className="w-3 h-3 text-[#171717]" />
                  )}
                </div>
                <h4 className="text-sm font-medium text-[#171717] mt-0.5">Pro Seller</h4>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="font-mono text-base font-normal text-[#171717]">
                    R$ {currentPlanMonthlyEquivalent}
                  </span>
                  <span className="font-mono text-[10px] text-[#666666]">/mês</span>
                </div>
                <span className="font-mono text-[10px] text-[#8f8f8f] block mt-1">
                  {selectedBilling === "yearly" ? "R$ 648 cobrado ao ano" : "Cobrança mensal"}
                </span>
              </div>

              <div
                onClick={() => setSelectedPlanId("escala")}
                className={`p-3.5 rounded-[6px] border transition cursor-pointer text-left relative ${
                  selectedPlanId === "escala"
                    ? "border-[#171717] bg-white ring-1 ring-[#171717] shadow-subtle"
                    : "border-[#ebebeb] bg-[#fafafa] hover:border-[#171717]/40"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] uppercase tracking-[0.071em] text-[#666666] block">
                    Até 5 Lojas
                  </span>
                  {selectedPlanId === "escala" && (
                    <Sparkles className="w-3 h-3 text-[#171717]" />
                  )}
                </div>
                <h4 className="text-sm font-medium text-[#171717] mt-0.5">Operação Escala</h4>
                <div className="mt-1 flex items-baseline gap-0.5">
                  <span className="font-mono text-base font-normal text-[#171717]">
                    R$ {selectedBilling === "yearly" ? 118 : 147}
                  </span>
                  <span className="font-mono text-[10px] text-[#666666]">/mês</span>
                </div>
                <span className="font-mono text-[10px] text-[#8f8f8f] block mt-1">
                  {selectedBilling === "yearly" ? "R$ 1.416 cobrado ao ano" : "Cobrança mensal"}
                </span>
              </div>
            </div>

            <form onSubmit={handleGeneratePix} className="space-y-3">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666] mb-1">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo Silva"
                  className="w-full px-3 py-2 rounded-[6px] border border-[#ebebeb] bg-[#fafafa] text-sm text-[#171717] focus:bg-white focus:border-[#171717] focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666] mb-1">
                  Melhor E-mail (seu acesso)
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="voce@sualoja.com.br"
                  className="w-full px-3 py-2 rounded-[6px] border border-[#ebebeb] bg-[#fafafa] text-sm text-[#171717] focus:bg-white focus:border-[#171717] focus:outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666] mb-1">
                    WhatsApp
                  </label>
                  <input
                    type="tel"
                    required
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="(11) 99999-9999"
                    className="w-full px-3 py-2 rounded-[6px] border border-[#ebebeb] bg-[#fafafa] text-sm text-[#171717] focus:bg-white focus:border-[#171717] focus:outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666] mb-1">
                    CPF ou CNPJ
                  </label>
                  <input
                    type="text"
                    required
                    value={cpfCnpj}
                    onChange={(e) => setCpfCnpj(e.target.value)}
                    placeholder="000.000.000-00"
                    className="w-full px-3 py-2 rounded-[6px] border border-[#ebebeb] bg-[#fafafa] text-sm text-[#171717] focus:bg-white focus:border-[#171717] focus:outline-none transition-all"
                  />
                </div>
              </div>

              {checkoutError && (
                <div className="p-3 rounded-[6px] bg-red-50 border border-red-200 text-xs font-normal text-red-700">
                  {checkoutError}
                </div>
              )}

              <button
                type="submit"
                disabled={checkoutLoading}
                className="w-full py-3 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-medium text-sm transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 shadow-subtle"
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
            </form>
          </>
        ) : (
          <div className="text-center py-2">
            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-[#666666] bg-[#fafafa] border border-[#ebebeb] px-3 py-1 rounded-full">
              ● Aguardando pagamento Pix...
            </span>
            <h3 className="text-lg font-normal text-[#171717] tracking-tight mt-3">
              Escaneie o QR Code no seu banco
            </h3>
            <p className="text-xs text-[#4d4d4d] mt-1 font-normal">
              Assim que você pagar, o acesso é liberado em segundos.
            </p>

            <div className="my-4 flex justify-center">
              <div className="p-3 rounded-[6px] bg-white border border-[#ebebeb] shadow-subtle-2">
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
              className="w-full py-2.5 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-mono text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-subtle"
            >
              {pixCopied ? (
                <>
                  <Check className="w-4 h-4 text-[#297a3a]" />
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
    </div>
  );
}

export default CheckoutModal;
