"use client";
import * as React from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Zap, ArrowRight, User, ShieldCheck, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

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
        "fixed top-3 inset-x-0 z-50 flex justify-center px-4 transition-all duration-300 pointer-events-none",
        className
      )}
    >
      <nav
        aria-label="Navegacao Principal"
        className={cn(
          "pointer-events-auto relative flex items-center justify-between gap-3 sm:gap-6 rounded-full px-4 sm:px-6 py-2.5 transition-all duration-300",
          "bg-white/75 backdrop-blur-xl border border-white/80 shadow-[0_10px_35px_-5px_rgba(79,70,229,0.12),0_4px_12px_rgba(0,0,0,0.04)]",
          scrolled ? "bg-white/90 shadow-soft-lg py-2" : "py-2.5"
        )}
      >
        {/* Logo ConfereAI */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-black text-sm shadow-glow-violet group-hover:scale-105 transition-transform">
            <Zap className="w-4 h-4 fill-white" />
          </div>
          <div className="flex items-baseline">
            <span className="font-extrabold text-base tracking-tight text-slate-900">
              Confere<span className="text-indigo-600">AI</span>
            </span>
            <span className="hidden sm:inline-block ml-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              B2B
            </span>
          </div>
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
                  className="relative px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors z-10"
                >
                  {isHovered && (
                    <motion.span
                      layoutId="liquid-pill"
                      className="absolute inset-0 rounded-full bg-indigo-50/90 border border-indigo-100/70 -z-10 shadow-xs"
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
            <span className="font-bold text-slate-700">Auditoria Segura no Navegador</span>
            {platform && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="font-extrabold text-indigo-600 uppercase text-[10px]">
                  {platform === "mercadolivre" ? "Mercado Livre" : "Shopee"}
                </span>
              </>
            )}
          </div>
        )}

        {/* Acoes da Direita */}
        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            to="/login"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-600 hover:text-indigo-600 hover:bg-slate-100/70 transition"
          >
            <User className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isPro ? "Minha Conta" : "Entrar"}</span>
          </Link>

          {variant === "landing" ? (
            <button
              type="button"
              onClick={onAuditClick}
              className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider shadow-glow-violet transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
            >
              <span>Auditar Gratis</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <Link
              to="/"
              className="px-4 py-2 rounded-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-xs uppercase tracking-wider shadow-glow-violet transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center gap-1.5 cursor-pointer"
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
