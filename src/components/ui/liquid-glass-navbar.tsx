"use client";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, User, ShieldCheck, ArrowLeft } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { cn } from "@/lib/utils";
import { MercadoLivreLogo, ShopeeLogo, ConfereAiLogo } from "./marketplace-logos";

interface NavItem {
  label: string;
  href: string;
  isAnchor?: boolean;
}

export interface LiquidGlassNavbarProps {
  onAuditClick?: () => void;
  variant?: "landing" | "result";
  platform?: "mercadolivre" | "shopee";
  isPro?: boolean;
  className?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Auditoria", href: "#auditoria", isAnchor: true },
  { label: "Vazamentos", href: "#vazamentos", isAnchor: true },
  { label: "Casos Reais", href: "#casos-reais", isAnchor: true },
  { label: "Planos", href: "#planos", isAnchor: true },
];

export function LiquidGlassNavbar({
  onAuditClick,
  variant = "landing",
  platform,
  isPro,
  className,
}: LiquidGlassNavbarProps) {
  const location = useLocation();
  const [scrolled, setScrolled] = React.useState(false);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setIsLoggedIn(Boolean(data?.session?.user));
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsLoggedIn(Boolean(session?.user));
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    item: NavItem
  ) => {
    if (item.isAnchor && location.pathname === "/") {
      e.preventDefault();
      const targetId = item.href.replace("#", "");
      const el = document.getElementById(targetId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
      } else if (onAuditClick && targetId === "auditoria") {
        onAuditClick();
      }
    }
  };

  return (
    <header
      className={cn(
        "fixed top-0 inset-x-0 z-50 h-16 flex items-center justify-center px-4 transition-all duration-200 border-b border-[#ebebeb] bg-[#fafafa]/90 backdrop-blur-xl",
        scrolled ? "bg-white shadow-subtle-2" : "bg-[#fafafa]/90",
        className
      )}
    >
      <nav
        aria-label="Navegacao Principal"
        className="flex items-center justify-between gap-4 w-full max-w-6xl mx-auto"
      >
        {/* Logo Oficial ConfereAI */}
        <Link to="/" className="flex items-center gap-2 group shrink-0" aria-label="ConfereAI Home">
          <ConfereAiLogo className="h-8 w-auto rounded-[6px] group-hover:opacity-90 transition-opacity" />
        </Link>

        {/* Centro: Links na Landing ou Badge de Seguranca na Pagina de Resultado */}
        {variant === "landing" ? (
          <div className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => (
              <a
                key={item.label}
                href={item.href}
                onClick={(e) => handleNavClick(e, item)}
                className="text-xs font-medium text-[#4d4d4d] hover:text-[#171717] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-[6px] bg-white border border-[#ebebeb] text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-[#297a3a]" />
            <span className="font-medium text-[#171717]">Conferência Privada e Segura</span>
            {platform && (
              <>
                <span className="w-1 h-1 rounded-full bg-[#c9c9c9]" />
                <div className="flex items-center gap-1.5 font-semibold text-[#171717] text-[11px] font-mono">
                  {platform === "mercadolivre" ? (
                    <>
                      <MercadoLivreLogo className="w-3.5 h-3.5 rounded-xs" />
                      <span>Mercado Livre</span>
                    </>
                  ) : (
                    <>
                      <ShopeeLogo className="w-3.5 h-3.5 rounded-xs" />
                      <span>Shopee</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Acoes da Direita (Ghost Button + Filled Button do DESIGN.md) */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to={isLoggedIn ? "/historico" : "/login"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] border border-[#ebebeb] text-xs font-medium text-[#4d4d4d] hover:text-[#171717] hover:bg-[#ebebeb]/50 transition shrink-0"
          >
            <User className="w-3.5 h-3.5 text-[#8f8f8f]" />
            <span className="hidden sm:inline">
              {isLoggedIn ? (isPro ? "Minha Conta Pro" : "Minhas Auditorias") : "Entrar"}
            </span>
          </Link>

          {variant === "landing" ? (
            <button
              type="button"
              onClick={onAuditClick}
              className="px-3.5 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-subtle-2"
            >
              <span>Auditar Grátis</span>
              <ArrowRight className="w-3 h-3 text-[#f97316]" />
            </button>
          ) : (
            <Link
              to="/"
              className="px-3.5 py-1.5 rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-medium text-xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 shadow-subtle-2"
            >
              <ArrowLeft className="w-3 h-3 text-[#f97316]" />
              <span>Nova Auditoria</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default LiquidGlassNavbar;
