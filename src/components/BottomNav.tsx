import React from "react";
import { Home, BarChart2, BookOpen, User, Sparkles } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

interface BottomNavProps {
  onCenterAction?: () => void;
  centerActionLabel?: string;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  onCenterAction,
  centerActionLabel = "Nova Auditoria",
}) => {
  const location = useLocation();
  const isHome = location.pathname === "/";

  return (
    <div className="fixed bottom-4 inset-x-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav
        aria-label="Navegação Principal"
        className="pointer-events-auto bg-white/95 backdrop-blur-xl border border-indigo-100/90 shadow-soft-lg rounded-full px-5 py-2.5 flex items-center gap-6 sm:gap-10"
      >
        {/* Home */}
        <Link
          to="/"
          className={`flex flex-col items-center gap-0.5 transition ${
            isHome ? "text-indigo-600 font-bold" : "text-slate-400 hover:text-slate-600"
          }`}
        >
          <div
            className={`p-1.5 rounded-xl transition ${
              isHome ? "bg-indigo-50 text-indigo-600" : ""
            }`}
          >
            <Home className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold">Início</span>
        </Link>

        {/* Analytics / Stats */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("analytics-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <div className="p-1.5 rounded-xl">
            <BarChart2 className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold">Métricas</span>
        </button>

        {/* Center Floating Elevated Diamond Button */}
        <div className="relative -top-5">
          <button
            type="button"
            onClick={onCenterAction}
            title={centerActionLabel}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white shadow-glow-violet ring-4 ring-[#F4F5FB] flex items-center justify-center transform hover:scale-105 active:scale-95 transition cursor-pointer"
          >
            <Sparkles className="w-6 h-6 fill-white/20" />
          </button>
        </div>

        {/* Roadmap / Journal */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("roadmap-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <div className="p-1.5 rounded-xl">
            <BookOpen className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold">Missão</span>
        </button>

        {/* Perfil / Status */}
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById("profile-section");
            el?.scrollIntoView({ behavior: "smooth" });
          }}
          className="flex flex-col items-center gap-0.5 text-slate-400 hover:text-slate-600 transition cursor-pointer"
        >
          <div className="p-1.5 rounded-xl">
            <User className="w-5 h-5" />
          </div>
          <span className="text-[10px] uppercase tracking-wider font-semibold">Perfil</span>
        </button>
      </nav>
    </div>
  );
};
