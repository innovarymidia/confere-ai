import React from "react";
import { Wifi, Sparkles } from "lucide-react";

interface ZenithCardProps {
  balance?: string;
  divergencesCount?: number;
  cardNumber?: string;
}

export const ZenithCard: React.FC<ZenithCardProps> = ({
  balance = "R$ 1.148,90",
  divergencesCount = 38,
  cardNumber = "4582 2456 7896 5412",
}) => {
  return (
    <div className="bg-white rounded-[28px] p-6 border border-indigo-100/70 shadow-soft relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          CAPITAL RETIDO NO MARKETPLACE
        </span>
        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100/70">
          <Sparkles className="w-3 h-3 text-indigo-500" />
          Aguardando Contestação
        </span>
      </div>

      {/* Cartão Estilizado (Inspiração Card Balance) */}
      <div className="relative rounded-2xl p-5 bg-gradient-to-tr from-slate-900 via-indigo-950 to-slate-900 text-white shadow-soft-lg overflow-hidden border border-indigo-900/40">
        {/* Glow de fundo */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-28 h-28 bg-violet-600/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4 relative z-10">
          {/* Chip dourado EMV */}
          <div className="w-9 h-7 rounded-md bg-gradient-to-br from-amber-200 via-amber-400 to-amber-500 border border-amber-300 shadow-sm flex items-center justify-center">
            <div className="w-6 h-4 border border-amber-600/40 rounded-xs grid grid-cols-2 gap-0.5 p-0.5">
              <div className="border-b border-r border-amber-600/40" />
              <div className="border-b border-amber-600/40" />
              <div className="border-r border-amber-600/40" />
              <div />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Wifi className="w-4 h-4 text-indigo-300 transform rotate-90" />
            <span className="text-[10px] font-black tracking-widest uppercase text-indigo-300">
              CONFERE PRIME
            </span>
          </div>
        </div>

        {/* Número do Cartão */}
        <div className="font-mono text-base tracking-widest text-slate-200 mb-3 relative z-10">
          {cardNumber}
        </div>

        {/* Rodapé do Cartão */}
        <div className="flex items-end justify-between relative z-10 text-xs">
          <div>
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
              Total Identificado
            </span>
            <span className="text-lg font-black text-white tracking-tight">
              {balance}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[9px] uppercase tracking-wider text-slate-400 block font-semibold">
              Divergências
            </span>
            <span className="text-xs font-bold text-indigo-300">
              {divergencesCount} Pedidos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
