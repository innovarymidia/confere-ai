import React from "react";
import { Check, ArrowRight } from "lucide-react";

interface MissionRoadmapProps {
  currentStep?: number;
  onAction?: () => void;
}

export const MissionRoadmap: React.FC<MissionRoadmapProps> = ({
  currentStep = 2,
  onAction,
}) => {
  const steps = [
    { num: 1, label: "Upload da Planilha", sub: "CSV ou XLSX" },
    { num: 2, label: "Cruzamento SKU", sub: "Cubagem & Tarifas" },
    { num: 3, label: "Diagnóstico", sub: "Relatório de Provas" },
    { num: 4, label: "Reembolso", sub: "Estorno na Conta" },
  ];

  return (
    <div id="roadmap-section" className="bg-white rounded-[28px] p-6 border border-indigo-100/70 shadow-soft">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
          MISSÃO ATIVA
        </span>
        <span className="text-xs font-extrabold text-indigo-600">
          75% COMPLETO
        </span>
      </div>

      <h3 className="text-xl font-black text-slate-900 tracking-tight mb-3">
        BLINDAGEM & RECUPERAÇÃO DE REPASSES
      </h3>

      {/* Barra de Progresso Suave */}
      <div className="w-full h-2 bg-indigo-50 rounded-full overflow-hidden mb-6">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-violet-600 rounded-full transition-all duration-700"
          style={{ width: "75%" }}
        />
      </div>

      {/* Stepper com nós conectados */}
      <div className="relative mb-6">
        {/* Linha conectora central */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-indigo-100 -translate-y-1/2 z-0" />

        <div className="relative z-10 grid grid-cols-4 gap-2 text-center">
          {steps.map((s) => {
            const isCompleted = s.num < currentStep;
            const isCurrent = s.num === currentStep;

            return (
              <div key={s.num} className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all ${
                    isCompleted
                      ? "bg-indigo-600 text-white shadow-soft"
                      : isCurrent
                      ? "bg-white border-2 border-indigo-600 text-indigo-600 shadow-glow-violet scale-110"
                      : "bg-white border border-indigo-100 text-slate-400"
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[3]" /> : s.num}
                </div>
                <span className="text-[11px] font-bold text-slate-800 mt-2 line-clamp-1">
                  {s.label}
                </span>
                <span className="text-[9px] font-medium text-slate-400">
                  {s.sub}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {onAction && (
        <button
          type="button"
          onClick={onAction}
          className="w-full py-3 rounded-2xl bg-indigo-50 hover:bg-indigo-100/80 text-indigo-700 font-extrabold text-xs uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer border border-indigo-200/60"
        >
          <span>Avançar na Auditoria</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};
