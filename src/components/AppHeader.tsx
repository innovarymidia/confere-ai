import React from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, ArrowUpRight, Zap } from "lucide-react";

interface AppHeaderProps {
  onScrollToAudit?: () => void;
  showNewAuditButton?: boolean;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  onScrollToAudit,
  showNewAuditButton = true,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 shadow-xs">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo ConfereAI */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black text-lg shadow-sm group-hover:bg-indigo-700 transition">
            <Zap className="w-5 h-5 fill-current" />
          </div>
          <div>
            <span className="font-extrabold text-lg text-slate-900 tracking-tight block leading-tight">
              Confere<span className="text-indigo-600">AI</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Auditoria de Repasses
            </span>
          </div>
        </Link>

        {/* Centro / Badge de Confiança */}
        <div className="hidden md:flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Processamento Seguro Client-Side</span>
          </span>
          <span className="text-xs font-semibold text-slate-400">•</span>
          <span className="text-xs font-semibold text-slate-500">
            Regras Vigentes 2026
          </span>
        </div>

        {/* Botão Ação */}
        <div className="flex items-center gap-3">
          {onScrollToAudit && (
            <button
              type="button"
              onClick={onScrollToAudit}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition flex items-center gap-1.5 cursor-pointer"
            >
              <span>Auditar Planilha</span>
              <ArrowUpRight className="w-4 h-4" />
            </button>
          )}

          {showNewAuditButton && !onScrollToAudit && (
            <Link
              to="/"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider shadow-sm transition flex items-center gap-1.5"
            >
              <span>+ Nova Auditoria</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};
