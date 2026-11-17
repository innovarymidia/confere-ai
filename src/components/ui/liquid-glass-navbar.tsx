"use client";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
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
  const [hoveredIdx, setHoveredIdx] = React.useState<number | null>(null);
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
        "fixed top-3 inset-x-0 z-50 flex justify-center px-2.5 sm:px-4 transition-all duration-300 pointer-events-none",
        className
      )}
    >
      <nav
        aria-label="Navegacao Principal"
        className={cn(
          "pointer-events-auto relative flex items-center justify-between gap-2 sm:gap-6 rounded-full px-3 sm:px-6 py-2 sm:py-2.5 transition-all duration-300 w-full max-w-4xl",
          "bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_24px_-4px_rgba(7,21,45,0.08),0_2px_8px_rgba(0,0,0,0.03)]",
          scrolled ? "bg-white/95 shadow-soft-lg py-1.5 sm:py-2" : "py-2 sm:py-2.5"
        )}
      >
        {/* Logo Oficial ConfereAI */}
        <Link to="/" className="flex items-center gap-2 group shrink-0" aria-label="ConfereAI Home">
          <ConfereAiLogo className="h-8 sm:h-9 w-auto rounded-lg shadow-2xs group-hover:scale-[1.02] transition-transform" />
        </Link>

        {/* Centro: Links na Landing ou Badge de Seguranca na Pagina de Resultado */}
        {variant === "landing" ? (
          <div className="hidden md:flex items-center gap-1 relative">
            {NAV_ITEMS.map((item, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className="relative px-3.5 py-1.5 text-xs font-bold text-slate-700 hover:text-orange-600 transition-colors z-10"
                >
                  {isHovered && (
                    <motion.span
                      layoutId="liquid-pill"
                      className="absolute inset-0 rounded-full bg-orange-50/90 border border-orange-100/80 -z-10 shadow-2xs"
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 28,
                      }}
                    />
                  )}
                  {item.label}
                </a>
              );
            })}
          </div>
        ) : (
          <div className="hidden md:flex items-center gap-2 px-3.5 py-1 rounded-full bg-slate-50 border border-slate-200/80 text-xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span className="font-bold text-slate-700">Conferência Privada e Segura</span>
            {platform && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <div className="flex items-center gap-1.5 font-extrabold text-slate-800 text-[11px]">
                  {platform === "mercadolivre" ? (
                    <>
                      <MercadoLivreLogo className="w-4 h-4 rounded-xs" />
                      <span>Mercado Livre</span>
                    </>
                  ) : (
                    <>
                      <ShopeeLogo className="w-4 h-4 rounded-xs" />
                      <span>Shopee</span>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Acoes da Direita */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <Link
            to={isLoggedIn ? "/historico" : "/login"}
            className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-bold text-slate-700 hover:text-orange-600 hover:bg-orange-50/60 transition shrink-0"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {isLoggedIn ? (isPro ? "Minha Conta Pro" : "Minhas Auditorias") : "Entrar"}
            </span>
          </Link>

          {variant === "landing" ? (
            <button
              type="button"
              onClick={onAuditClick}
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-glow-orange transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
            >
              <span>Auditar Gratis</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <Link
              to="/"
              className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-orange-500 hover:bg-orange-600 text-white font-black text-[11px] sm:text-xs uppercase tracking-wider shadow-glow-orange transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1 sm:gap-1.5 cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-3 h-3" />
              <span>Nova Auditoria</span>
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export default LiquidGlassNavbar;
