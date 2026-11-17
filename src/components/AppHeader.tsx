import React from "react";
import { Menu, Bell, SlidersHorizontal, ShieldCheck } from "lucide-react";

interface AppHeaderProps {
  title?: string;
  badge?: string;
  onOpenSettings?: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  title = "DASHBOARD",
  badge = "SISTEMA ATIVO",
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#F4F5FB]/90 backdrop-blur-md px-4 sm:px-6 py-3.5 border-b border-indigo-100/50">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Botão Menu Esquerda */}
        <button
          type="button"
          aria-label="Menu"
          className="w-10 h-10 rounded-2xl bg-white border border-indigo-100/80 shadow-soft flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Centro: Título e Badge */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1.5">
            <span className="text-[13px] font-black tracking-widest uppercase text-slate-900">
              {title}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60">
              <ShieldCheck className="w-3 h-3 text-indigo-500" />
              {badge}
            </span>
          </div>
          <span className="text-[10px] font-semibold text-slate-400 tracking-wider uppercase mt-0.5">
            CONFERE AI • GUARDIÃO DO SELLER
          </span>
        </div>

        {/* Direita: Ações (Notificação & Ajustes) */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Notificações"
            className="relative w-10 h-10 rounded-2xl bg-white border border-indigo-100/80 shadow-soft flex items-center justify-center text-slate-700 hover:text-indigo-600 hover:border-indigo-200 transition cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white animate-pulse" />
          </button>
          {onOpenSettings && (
            <button
              type="button"
              onClick={onOpenSettings}
              aria-label="Ajustes"
              className="w-10 h-10 rounded-2xl bg-white border border-indigo-100/80 shadow-soft hidden sm:flex items-center justify-center text-slate-700 hover:text-indigo-600 transition cursor-pointer"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
