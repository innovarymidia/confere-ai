"use client";
import { useState } from "react";
import { Cookie, ShieldCheck } from "lucide-react";
import { PrivacyModal } from "./privacy-modal";

const COOKIE_CONSENT_KEY = "confereai_cookie_consent";

export function CookieConsentBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return !localStorage.getItem(COOKIE_CONSENT_KEY);
    } catch {
      return false;
    }
  });
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);

  const handleConsent = (type: "all" | "essential") => {
    try {
      localStorage.setItem(COOKIE_CONSENT_KEY, type);
    } catch {
      // Ignora
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />;
  }

  return (
    <>
      <aside
        aria-label="Aviso de Privacidade e Cookies"
        className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-50 bg-[#ffffff] border border-[#b9bbc6] rounded-[12px] p-5 shadow-modal text-left animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-[8px] bg-[#f3f3f7] border border-[#b9bbc6] flex items-center justify-center text-[#ff5900] shrink-0 mt-0.5">
            <Cookie className="w-4 h-4" />
          </div>

          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-[#000000] tracking-[-0.01em]">
                Controle de Cookies e Privacidade (LGPD)
              </span>
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff5900]" />
            </div>

            <p className="text-xs text-[#60646c] leading-relaxed tracking-[-0.01em]">
              Utilizamos cookies essenciais para autenticação segura e navegação. Você pode aceitar todos ou manter apenas os necessários para o sistema funcionar.
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleConsent("all")}
                className="px-3.5 py-1.5 rounded-[8px] bg-[#ff5900] hover:bg-[#e04f00] text-white text-xs font-semibold tracking-[-0.01em] transition cursor-pointer"
              >
                Aceitar todos
              </button>

              <button
                type="button"
                onClick={() => handleConsent("essential")}
                className="px-3 py-1.5 rounded-[8px] bg-[#f3f3f7] hover:bg-[#ffffff] border border-[#b9bbc6] text-[#000000] text-xs font-medium tracking-[-0.01em] transition cursor-pointer"
              >
                Rejeitar não essenciais
              </button>

              <button
                type="button"
                onClick={() => setIsPrivacyOpen(true)}
                className="text-[11px] text-[#60646c] hover:text-[#000000] underline ml-auto cursor-pointer"
              >
                Saiba mais
              </button>
            </div>
          </div>
        </div>
      </aside>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </>
  );
}

export default CookieConsentBanner;
