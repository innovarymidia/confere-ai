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
  Check,
} from "lucide-react";
import { type MarketplacePlatform } from "@/services/auditEngine";
import { cn } from "@/lib/utils";
import { MercadoLivreLogo, ShopeeLogo } from "./marketplace-logos";

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
          {/* Eyebrow Label no estilo DESIGN.md */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
              ▲ TABELAS OFICIAIS 2026: CONFERÊNCIA PEDIDO A PEDIDO
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-[54px] font-normal tracking-[-0.05em] leading-[1.05] text-[#171717]">
            Descubra em 10s quanto o marketplace{" "}
            <span className="text-[#f97316] font-medium">
              cobrou a mais
            </span>{" "}
            das suas vendas.
          </h1>

          <p className="text-sm sm:text-base text-[#4d4d4d] leading-relaxed max-w-lg font-normal">
            Envie seu extrato de vendas e repasses. O <strong className="text-[#171717] font-medium">ConfereAI</strong> confere cada pedido contra a tarifa e frete combinados do seu anúncio e identifica cobranças indevidas em segundos.
          </p>

          {/* Social Proof Mini-Card com borda hairline do DESIGN.md */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex -space-x-1.5">
              {["MG", "SP", "PR", "SC"].map((state) => (
                <div
                  key={state}
                  className="w-7 h-7 rounded-[4px] border border-[#ebebeb] bg-[#fafafa] flex items-center justify-center text-[10px] font-mono font-medium text-[#171717]"
                >
                  {state}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 text-[#f97316]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
                <span className="text-xs font-mono font-semibold text-[#171717] ml-1">4.9/5</span>
              </div>
              <span className="text-[11px] font-mono text-[#666666] block">
                + de R$ 340.000 em estornos identificados neste mês
              </span>
            </div>
          </div>

          {/* Seletor de Erros Frequentes em Cards do DESIGN.md */}
          <div className="pt-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666] block mb-2.5">
              Vazamentos comuns identificados:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {angles.map((ang) => (
                <button
                  key={ang.id}
                  type="button"
                  onClick={() => setSelectedAngle(ang.id)}
                  className={cn(
                    "p-3 rounded-[6px] border text-left transition-all cursor-pointer",
                    selectedAngle === ang.id
                      ? "bg-white border-[#171717] shadow-subtle-2 text-[#171717]"
                      : "bg-[#fafafa] hover:bg-white border-[#ebebeb] text-[#666666]"
                  )}
                >
                  <div className="flex items-center gap-1.5 text-[#171717] mb-1">
                    {ang.icon}
                    <span className="text-[11px] font-mono font-medium text-[#f97316]">{ang.highlight}</span>
                  </div>
                  <span className="text-[11px] font-medium text-[#171717] line-clamp-1 block">
                    {ang.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUNA DIREITA: ÁREA DE ENVIO DE EXTRATO (Painel de Auditoria DESIGN.md)
            ========================================================================= */}
        <div className="lg:col-span-6">
          <div className="relative bg-white rounded-[6px] p-5 sm:p-7 border border-[#ebebeb] shadow-subtle">
            {/* Cabeçalho: Escolha da Plataforma com Logos Oficiais */}
            <div className="flex items-center justify-between mb-4">
              <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
                1. Selecione o marketplace:
              </span>
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#297a3a] bg-[#fafafa] px-2 py-0.5 rounded-[4px] border border-[#ebebeb] flex items-center gap-1">
                <Check className="w-3 h-3 text-[#297a3a]" />
                Privacidade 100% Local
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => onPlatformChange("mercadolivre")}
                className={cn(
                  "py-2.5 px-3 rounded-[6px] font-medium text-xs tracking-tight border transition cursor-pointer flex items-center justify-center gap-2",
                  platform === "mercadolivre"
                    ? "bg-[#fafafa] text-[#171717] border-[#171717] shadow-subtle-2"
                    : "bg-white text-[#666666] border-[#ebebeb] hover:bg-[#fafafa]"
                )}
              >
                <div className="w-5 h-5 rounded-[4px] p-0.5 flex items-center justify-center shrink-0">
                  <MercadoLivreLogo className="w-full h-full" />
                </div>
                <span>Mercado Livre</span>
                {platform === "mercadolivre" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#171717] ml-auto hidden sm:inline-block" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onPlatformChange("shopee")}
                className={cn(
                  "py-2.5 px-3 rounded-[6px] font-medium text-xs tracking-tight border transition cursor-pointer flex items-center justify-center gap-2",
                  platform === "shopee"
                    ? "bg-[#fafafa] text-[#171717] border-[#171717] shadow-subtle-2"
                    : "bg-white text-[#666666] border-[#ebebeb] hover:bg-[#fafafa]"
                )}
              >
                <div className="w-5 h-5 rounded-[4px] p-0.5 flex items-center justify-center shrink-0">
                  <ShopeeLogo className="w-full h-full" />
                </div>
                <span>Shopee</span>
                {platform === "shopee" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#171717] ml-auto hidden sm:inline-block" />
                )}
              </button>
            </div>

            {/* Área Principal de Envio do Extrato */}
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
                "relative flex flex-col items-center justify-center w-full min-h-[200px] h-auto py-6 sm:h-48 border border-dashed rounded-[6px] cursor-pointer transition p-4 sm:p-6 text-center",
                isDragging
                  ? "border-[#171717] bg-[#fafafa]"
                  : "border-[#c9c9c9] bg-[#fafafa]/50 hover:bg-[#fafafa] hover:border-[#171717]"
              )}
            >
              {loadingStep ? (
                <div className="space-y-3.5 w-full max-w-sm mx-auto">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-[6px] bg-[#171717] text-white flex items-center justify-center font-bold">
                      <Zap className="w-5 h-5 fill-white text-white" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-mono font-medium text-[#171717]">{loadingStep}</p>
                    <p className="text-[11px] font-mono text-[#666666] mt-0.5">
                      Processamento local em execução
                    </p>
                  </div>

                  {/* Barra de progresso do terminal */}
                  <div className="w-full bg-[#ebebeb] rounded-[2px] h-1.5 overflow-hidden">
                    <div className="bg-[#171717] h-full rounded-[2px] animate-pulse w-full" />
                  </div>

                  {/* Micro-contadores de status da conferência */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center font-mono">
                    <div className="p-2 rounded-[4px] bg-white border border-[#ebebeb]">
                      <span className="text-[9px] uppercase text-[#8f8f8f] block">Status</span>
                      <span className="text-[11px] font-medium text-[#171717]">Analisando</span>
                    </div>
                    <div className="p-2 rounded-[4px] bg-white border border-[#ebebeb]">
                      <span className="text-[9px] uppercase text-[#8f8f8f] block">Regras</span>
                      <span className="text-[11px] font-medium text-[#f97316]">Tabela 2026</span>
                    </div>
                    <div className="p-2 rounded-[4px] bg-white border border-[#ebebeb]">
                      <span className="text-[9px] uppercase text-[#8f8f8f] block">Segurança</span>
                      <span className="text-[11px] font-medium text-[#297a3a]">✓ Seguro</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-9 h-9 rounded-[6px] bg-white border border-[#ebebeb] text-[#171717] flex items-center justify-center">
                      <UploadCloud className="w-5 h-5 text-[#4d4d4d]" />
                    </div>
                  </div>
                  <span className="text-sm font-medium text-[#171717]">
                    Solte aqui o extrato do {platform === "mercadolivre" ? "Mercado Livre" : "Shopee"}
                  </span>
                  <span className="text-xs font-mono text-[#666666] mt-1">
                    Relatório oficial de vendas (.xlsx ou .csv)
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
              <div className="mt-3 p-3 rounded-[6px] bg-white border border-red-200 text-xs text-red-700 flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Ação de Teste Instantâneo (Ghost Button do DESIGN.md) */}
            <div className="mt-4 pt-3.5 border-t border-[#ebebeb] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs font-mono text-[#666666]">
                Sem o arquivo agora?
              </span>
              <button
                type="button"
                disabled={Boolean(loadingStep)}
                onClick={onRunSample}
                className="w-full sm:w-auto py-2 px-3.5 rounded-[6px] border border-[#ebebeb] bg-white hover:bg-[#fafafa] text-[#171717] font-medium text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Testar com dados de exemplo</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#f97316]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MarketplaceProductHero;
