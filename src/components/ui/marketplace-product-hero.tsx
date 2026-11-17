"use client";
import * as React from "react";
import {
  UploadCloud,
  AlertTriangle,
  ArrowRight,
  Package,
  Percent,
  RotateCcw,
  Star,
  Zap,
} from "lucide-react";
import { type MarketplacePlatform } from "@/services/auditEngine";
import { cn } from "@/lib/utils";

interface MarketplaceProductHeroProps {
  platform: MarketplacePlatform;
  onPlatformChange: (p: MarketplacePlatform) => void;
  onFileSelect: (file: File) => void;
  onRunSample: () => void;
  loadingStep: string | null;
  errorMsg: string | null;
  className?: string;
}

export function MarketplaceProductHero({
  platform,
  onPlatformChange,
  onFileSelect,
  onRunSample,
  loadingStep,
  errorMsg,
  className,
}: MarketplaceProductHeroProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const [selectedAngle, setSelectedAngle] = React.useState<"frete" | "comissao" | "devolucao">("frete");

  const angles = [
    {
      id: "frete" as const,
      label: "Cubagem de Frete",
      icon: <Package className="w-3.5 h-3.5" />,
      highlight: "+R$ 35,00/ped",
      tagline: "Sensoreamento errado de peso na esteira",
    },
    {
      id: "comissao" as const,
      label: "Tarifas 2026",
      icon: <Percent className="w-3.5 h-3.5" />,
      highlight: "Taxa Fora da Faixa",
      tagline: "Custo operacional por unidade cobrado a maior",
    },
    {
      id: "devolucao" as const,
      label: "Estorno de Devolução",
      icon: <RotateCcw className="w-3.5 h-3.5" />,
      highlight: "Frete Reverso Incorreto",
      tagline: "Arrependimento que debitou saldo da conta",
    },
  ];

  return (
    <section
      id="auditoria"
      aria-label="Apresentação do Produto ConfereAI"
      className={cn("relative w-full max-w-6xl mx-auto pt-24 sm:pt-28 pb-12", className)}
    >
      {/* Marca d'água de tipografia de fundo inspirada no sneaker-product-hero */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 select-none pointer-events-none text-center w-full max-w-full overflow-hidden opacity-[0.035] -z-10">
        <span className="text-[64px] sm:text-[140px] md:text-[190px] font-black uppercase tracking-tighter text-slate-900 leading-none block">
          CONFEREAI
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* =========================================================================
            COLUNA ESQUERDA: COPY, PROVA SOCIAL E PONTOS DE VALOR
            ========================================================================= */}
        <div className="lg:col-span-6 space-y-6 text-left">
          {/* Badge Superior */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-indigo-100 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-700">
              Versão 2026 • Auditoria SKU a SKU
            </span>
          </div>

          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-[1.15]">
            Descubra em 10s quanto o marketplace{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600">
              cobrou a mais
            </span>{" "}
            das suas vendas.
          </h1>

          <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-medium">
            Suba seu extrato de repasses. O motor inteligente do <strong className="text-slate-900 font-bold">ConfereAI</strong> compara cada pedido contra o histórico do mesmo anúncio e identifica erros de cubagem e taxas duplicadas na hora.
          </p>

          {/* Social Proof Mini-Card */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex -space-x-2">
              {["seller-1", "seller-2", "seller-3", "seller-4"].map((s, i) => (
                <div
                  key={s}
                  className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-tr from-slate-200 to-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-700 shadow-xs"
                >
                  {["MG", "SP", "PR", "SC"][i]}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 text-amber-500">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
                <span className="text-xs font-black text-slate-800 ml-1">4.9/5</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium block">
                + de R$ 340.000 auditados por lojistas neste mês
              </span>
            </div>
          </div>

          {/* Seletor de Ângulos / Vazamentos (Inspirado nos ângulos do produto sneaker) */}
          <div className="pt-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2">
              Selecione o tipo de auditoria do scanner:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-2.5">
              {angles.map((ang) => (
                <button
                  key={ang.id}
                  type="button"
                  onClick={() => setSelectedAngle(ang.id)}
                  className={cn(
                    "p-2.5 rounded-2xl border text-left transition-all cursor-pointer",
                    selectedAngle === ang.id
                      ? "bg-white border-indigo-600 shadow-soft ring-1 ring-indigo-500/30"
                      : "bg-white/60 hover:bg-white border-slate-200/80 text-slate-600"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-indigo-600 mb-1">
                    {ang.icon}
                    <span className="text-[11px] font-black">{ang.highlight}</span>
                  </div>
                  <span className="text-[10px] font-bold text-slate-800 line-clamp-1 block">
                    {ang.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUNA DIREITA: O TERMINAL DO PRODUTO (Estágio Central Dropzone)
            ========================================================================= */}
        <div className="lg:col-span-6">
          <div className="relative bg-white rounded-3xl sm:rounded-[32px] p-5 sm:p-8 border border-slate-200/90 shadow-soft-lg">
            {/* Halo de iluminação de fundo */}
            <div className="absolute -top-12 -right-12 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Cabeçalho do Terminal: Seletor de Plataforma */}
            <div className="relative z-10 flex items-center justify-between mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                1. Selecione a plataforma:
              </span>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Client-Side Seguro
              </span>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => onPlatformChange("mercadolivre")}
                className={cn(
                  "py-3 px-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide border-2 transition cursor-pointer flex items-center justify-center gap-2",
                  platform === "mercadolivre"
                    ? "bg-amber-400 text-slate-950 border-amber-500 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <span>Mercado Livre</span>
                {platform === "mercadolivre" && (
                  <span className="w-2 h-2 rounded-full bg-slate-950" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onPlatformChange("shopee")}
                className={cn(
                  "py-3 px-4 rounded-2xl font-black text-xs sm:text-sm tracking-wide border-2 transition cursor-pointer flex items-center justify-center gap-2",
                  platform === "shopee"
                    ? "bg-orange-500 text-white border-orange-600 shadow-xs"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                )}
              >
                <span>Shopee</span>
                {platform === "shopee" && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </button>
            </div>

            {/* Área Drag & Drop Principal do Scanner */}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const file = e.dataTransfer.files?.[0];
                if (file) onFileSelect(file);
              }}
              className={cn(
                "relative z-10 flex flex-col items-center justify-center w-full min-h-[210px] h-auto py-6 sm:h-52 border-2 border-dashed rounded-2xl cursor-pointer transition p-4 sm:p-6 text-center",
                isDragging
                  ? "border-indigo-600 bg-indigo-50/70"
                  : "border-slate-300 bg-slate-50/60 hover:bg-slate-100/70 hover:border-indigo-300"
              )}
            >
              {loadingStep ? (
                <div className="space-y-3.5 w-full max-w-sm mx-auto">
                  <div className="relative flex items-center justify-center">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-glow-violet animate-pulse">
                      <Zap className="w-6 h-6 fill-white" />
                    </div>
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500"></span>
                    </span>
                  </div>

                  <div>
                    <p className="text-sm font-black text-slate-900 tracking-tight">{loadingStep}</p>
                    <p className="text-[11px] text-indigo-600 font-bold mt-0.5">
                      Auditoria client-side segura no seu navegador
                    </p>
                  </div>

                  {/* Barra de progresso animada */}
                  <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div className="bg-gradient-to-r from-indigo-600 via-violet-600 to-indigo-600 h-full rounded-full animate-pulse w-full" />
                  </div>

                  {/* Micro-contadores de status da varredura */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Varredura</span>
                      <span className="text-xs font-black text-slate-800">Linha a Linha</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Tabelas</span>
                      <span className="text-xs font-black text-indigo-600">Regras 2026</span>
                    </div>
                    <div className="p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                      <span className="text-[9px] uppercase font-bold text-slate-400 block">Seguranca</span>
                      <span className="text-xs font-black text-emerald-600">100% Local</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-3 border border-indigo-100 shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <span className="text-base font-extrabold text-slate-900">
                    Arraste sua planilha CSV ou XLSX
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    Extrato de liberações financeiras do {platform === "mercadolivre" ? "Mercado Livre" : "Shopee"}
                  </span>
                </>
              )}

              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                className="hidden"
                disabled={Boolean(loadingStep)}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onFileSelect(file);
                }}
              />
            </label>

            {errorMsg && (
              <div className="relative z-10 mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Ação de Teste Instantâneo */}
            <div className="relative z-10 mt-4 pt-3.5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500 font-medium">
                Sem a planilha agora?
              </span>
              <button
                type="button"
                disabled={Boolean(loadingStep)}
                onClick={onRunSample}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/80 transition flex items-center justify-center gap-2 cursor-pointer shadow-xs"
              >
                <span>Testar com dados de exemplo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MarketplaceProductHero;
