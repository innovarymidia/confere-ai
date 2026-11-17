import React from "react";
import { Gem, Flame, Sparkles } from "lucide-react";

interface CrystalStreakProps {
  days?: number;
  label?: string;
  sublabel?: string;
}

export const CrystalStreak: React.FC<CrystalStreakProps> = ({
  days = 24,
  label = "DIAS DE BLINDAGEM",
  sublabel = "Auditorias semanais consistentes",
}) => {
  return (
    <div className="bg-white rounded-[28px] p-6 border border-indigo-100/70 shadow-soft flex flex-col justify-between relative overflow-hidden">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            SEQUÊNCIA DE AUDITORIA
          </span>
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/60">
            <Flame className="w-3 h-3 text-amber-500 fill-amber-500" />
            Ativo
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-4xl font-black text-slate-900 tracking-tight">
            {days}
          </span>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {label}
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">{sublabel}</p>
      </div>

      {/* Cristal / Emblema em pedestal suave */}
      <div className="my-3 flex items-center justify-center">
        <div className="relative flex items-center justify-center">
          {/* Halo de luz lavanda/violeta */}
          <div className="absolute w-24 h-24 rounded-full bg-indigo-500/15 blur-xl animate-pulse" />

          {/* Pedestal estilizado */}
          <div className="relative z-10 w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-100/90 to-white border border-indigo-200/80 shadow-soft-lg flex items-center justify-center">
            <Gem className="w-10 h-10 text-indigo-600 stroke-[1.5] filter drop-shadow-[0_4px_8px_rgba(99,102,241,0.4)]" />
            <Sparkles className="w-3.5 h-3.5 text-amber-400 absolute top-2 right-2 animate-bounce" />
          </div>
        </div>
      </div>

      <div className="text-center">
        <span className="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100/60 inline-block">
          Taxa Zero de Vazamento
        </span>
      </div>
    </div>
  );
};
