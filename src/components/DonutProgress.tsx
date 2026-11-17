import React from "react";

interface DonutProgressProps {
  percentage?: number;
  label?: string;
  breakdown?: {
    label: string;
    value: string | number;
    color: string;
  }[];
}

export const DonutProgress: React.FC<DonutProgressProps> = ({
  percentage = 78,
  label = "RECUPERABILIDADE",
  breakdown = [
    { label: "Frete Cubado", value: "78%", color: "bg-indigo-600" },
    { label: "Comissão Fora da Faixa", value: "65%", color: "bg-violet-400" },
    { label: "Devoluções c/ Saldo Neg.", value: "80%", color: "bg-indigo-400" },
    { label: "Saúde Geral dos Repasses", value: "72%", color: "bg-slate-400" },
  ],
}) => {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="bg-white rounded-[28px] p-6 border border-indigo-100/70 shadow-soft">
      <div className="flex items-center justify-between mb-4">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          EFICÁCIA DE AUDITORIA
        </span>
        <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100/60">
          Alta Precisão
        </span>
      </div>

      <div className="flex items-center gap-6">
        {/* Gráfico Donut Circular SVG */}
        <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
            {/* Trilha de fundo */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-indigo-100/70"
              strokeWidth="9"
              stroke="currentColor"
              fill="transparent"
            />
            {/* Anel de progresso */}
            <circle
              cx="50"
              cy="50"
              r={radius}
              className="text-indigo-600 transition-all duration-1000 ease-out"
              strokeWidth="9"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              stroke="currentColor"
              fill="transparent"
            />
          </svg>

          {/* Texto Central */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-2xl font-black text-slate-900 tracking-tight leading-none">
              {percentage}%
            </span>
            <span className="text-[8px] font-extrabold uppercase tracking-wider text-slate-400 mt-1">
              {label}
            </span>
          </div>
        </div>

        {/* Lista de Metas / Breakdown */}
        <div className="flex-1 space-y-2">
          {breakdown.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-slate-600 font-medium text-[11px]">{item.label}</span>
              </div>
              <span className="font-bold text-slate-800 text-[11px]">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
