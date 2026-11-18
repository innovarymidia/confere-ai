"use client";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, User, ShieldCheck } from "lucide-react";
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
    <header className={cn("fixed top-0 inset-x-0 z-50 flex flex-col transition-all", className)}>
      {/* 1. Announcement Bar Carbon (#15191e) do DESIGN.md */}
      <aside
        aria-label="Aviso institucional"
        className="w-full bg-[#15191e] text-white py-1.5 px-4 text-center font-sans text-xs font-medium tracking-[-0.01em] border-b border-[#15191e]"
      >
        <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-2">
          <span>Tabelas Oficiais 2026 ativadas: confira fretes e tarifas da sua conta</span>
          <button
            type="button"
            onClick={onAuditClick}
            className="text-[#ff5900] hover:underline font-semibold cursor-pointer inline-flex items-center gap-1"
          >
            <span>Conferir agora</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </aside>

      {/* 2. Barra de Navegacao Paper (#ffffff) com borda Mist (#b9bbc6) */}
      <div
        className={cn(
          "w-full h-16 flex items-center justify-center px-4 sm:px-6 bg-[#ffffff] transition-all duration-200 border-b border-[#b9bbc6]",
          scrolled ? "shadow-sm" : ""
        )}
      >
        <nav
          aria-label="Navegacao Principal"
          className="flex items-center justify-between gap-4 w-full max-w-[1200px] mx-auto"
        >
          {/* Logo Oficial ConfereAI */}
          <Link to="/" className="flex items-center gap-2 group shrink-0" aria-label="ConfereAI Inicio">
            <ConfereAiLogo className="h-8 w-auto rounded-[6px] group-hover:opacity-90 transition-opacity" />
          </Link>

          {/* Centro: Links na Landing ou Badge de Seguranca na Pagina de Resultado */}
          {variant === "landing" ? (
            <div className="hidden md:flex items-center gap-7">
              {NAV_ITEMS.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={(e) => handleNavClick(e, item)}
                  className="text-sm font-medium text-[#60646c] hover:text-[#000000] tracking-[-0.01em] transition-colors"
                >
                  {item.label}
                </a>
              ))}
            </div>
          ) : (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-[6px] bg-[#f3f3f7] border border-[#b9bbc6] text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-[#ff5900]" />
              <span className="font-medium text-[#000000]">Conferência Privada e Segura</span>
              {platform && (
                <>
                  <span className="w-1 h-1 rounded-full bg-[#8b8d98]" />
                  <div className="flex items-center gap-1.5 font-semibold text-[#000000] text-xs">
                    {platform === "mercadolivre" ? (
                      <>
                        <MercadoLivreLogo className="w-3.5 h-3.5 rounded-[4px]" />
                        <span>Mercado Livre</span>
                      </>
                    ) : (
                      <>
                        <ShopeeLogo className="w-3.5 h-3.5 rounded-[4px]" />
                        <span>Shopee</span>
                      </>
                    )}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Acoes da Direita: Ghost link Ink (#000000) e Botao Ember (#ff5900) com radius 12px */}
          <div className="flex items-center gap-3 shrink-0">
            <Link
              to={isLoggedIn ? "/historico" : "/login"}
              className="flex items-center gap-1.5 px-3 py-2 rounded-[12px] text-sm font-medium text-[#000000] hover:text-[#000000] hover:bg-[#f3f3f7] tracking-[-0.01em] transition shrink-0"
            >
              <User className="w-4 h-4 text-[#8b8d98]" />
              <span className="hidden sm:inline">
                {isLoggedIn ? (isPro ? "Minha Conta Pro" : "Minhas Auditorias") : "Entrar"}
              </span>
            </Link>

            {variant === "landing" ? (
              <button
                type="button"
                onClick={onAuditClick}
                className="px-4 py-2 rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-[#ffffff] font-semibold text-sm tracking-[-0.01em] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Auditar Grátis</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#ffffff]" />
              </button>
            ) : (
              <Link
                to="/"
                className="px-4 py-2 rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-[#ffffff] font-semibold text-sm tracking-[-0.01em] transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <span>Nova Auditoria</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#ffffff]" />
              </Link>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}

export default LiquidGlassNavbar;
