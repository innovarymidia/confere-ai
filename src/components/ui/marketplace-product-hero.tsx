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
      icon: <Package className="w-3.5 h-3.5 text-[#ff5900]" />,
      highlight: "+R$ 35,00 por pedido",
      tagline: "Sensoreamento errado de peso na esteira",
    },
    {
      id: "comissao" as const,
      label: "Tarifas Oficiais 2026",
      icon: <Percent className="w-3.5 h-3.5 text-[#ff5900]" />,
      highlight: "Taxa Fora da Faixa",
      tagline: "Custo operacional por unidade cobrado a maior",
    },
    {
      id: "devolucao" as const,
      label: "Estorno de Devolução",
      icon: <RotateCcw className="w-3.5 h-3.5 text-[#ff5900]" />,
      highlight: "Frete Reverso Incorreto",
      tagline: "Arrependimento que debitou saldo da conta",
    },
  ];

  return (
    <section
      id="auditoria"
      aria-label="Apresentação do Produto ConfereAI"
      className={cn("relative w-full max-w-[1200px] mx-auto pt-36 sm:pt-40 pb-12 scroll-mt-28 sm:scroll-mt-32", className)}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* =========================================================================
            COLUNA ESQUERDA: COPY, PROVA SOCIAL E PONTOS DE VALOR
            ========================================================================= */}
        <div className="lg:col-span-6 space-y-6 text-left">
          {/* Eyebrow Label com 6px tag no estilo Brex */}
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] bg-[#f3f3f7] border border-[#b9bbc6] px-2.5 py-1 rounded-[6px]">
              Tabelas Oficiais 2026: Conferência Pedido a Pedido
            </span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-[52px] font-semibold tracking-[-0.025em] leading-[1.12] text-[#000000]">
            Descubra em 10 segundos quanto o marketplace{" "}
            <span className="text-[#ff5900]">cobrou a mais</span> das suas vendas.
          </h1>

          <p className="text-base text-[#60646c] leading-relaxed max-w-lg font-normal tracking-[-0.01em]">
            Envie seu extrato de vendas e repasses. O <strong className="text-[#000000] font-semibold">ConfereAI</strong> audita cada pedido contra a tarifa e frete combinados do seu anúncio e identifica cobranças indevidas em segundos.
          </p>

          {/* Social Proof com tags 6px e borda Mist */}
          <div className="flex items-center gap-4 pt-1">
            <div className="flex -space-x-1.5">
              {["MG", "SP", "PR", "SC"].map((state) => (
                <div
                  key={state}
                  className="w-7 h-7 rounded-[6px] border border-[#b9bbc6] bg-[#f3f3f7] flex items-center justify-center text-[10px] font-medium text-[#000000]"
                >
                  {state}
                </div>
              ))}
            </div>
            <div>
              <div className="flex items-center gap-1 text-[#ff5900]">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current" />
                ))}
                <span className="text-xs font-semibold text-[#000000] ml-1">4.9/5</span>
              </div>
              <span className="text-xs text-[#60646c] tracking-[-0.01em] block">
                Mais de R$ 340.000 em estornos identificados neste mês
              </span>
            </div>
          </div>

          {/* Seletor de Erros Frequentes em Cards 12px do Brex */}
          <div className="pt-2">
            <span className="text-xs uppercase font-medium tracking-[-0.01em] text-[#6f737b] block mb-2.5">
              Vazamentos comuns identificados:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {angles.map((ang) => (
                <button
                  key={ang.id}
                  type="button"
                  onClick={() => setSelectedAngle(ang.id)}
                  className={cn(
                    "p-3 rounded-[12px] border text-left transition-all cursor-pointer",
                    selectedAngle === ang.id
                      ? "bg-[#ffffff] border-[#000000] text-[#000000]"
                      : "bg-[#f3f3f7] hover:bg-[#ffffff] border-[#b9bbc6] text-[#60646c]"
                  )}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    {ang.icon}
                    <span className="text-[11px] font-semibold text-[#000000]">{ang.highlight}</span>
                  </div>
                  <span className="text-xs font-medium text-[#000000] line-clamp-1 block tracking-[-0.01em]">
                    {ang.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* =========================================================================
            COLUNA DIREITA: ÁREA DE ENVIO DE EXTRATO (Painel Paper #ffffff com 12px)
            ========================================================================= */}
        <div className="lg:col-span-6">
          <div className="relative bg-[#ffffff] rounded-[12px] p-6 sm:p-8 border border-[#b9bbc6]">
            {/* Cabeçalho: Escolha da Plataforma com Logos Oficiais */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-medium uppercase tracking-[-0.01em] text-[#60646c]">
                1. Selecione o marketplace:
              </span>
              <span className="text-[11px] font-medium tracking-[-0.01em] text-[#000000] bg-[#f3f3f7] px-2.5 py-1 rounded-[6px] border border-[#b9bbc6] flex items-center gap-1">
                <Check className="w-3 h-3 text-[#ff5900]" />
                Privacidade 100% Local
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-5">
              <button
                type="button"
                onClick={() => onPlatformChange("mercadolivre")}
                className={cn(
                  "py-3 px-3.5 rounded-[12px] font-medium text-xs tracking-[-0.01em] border transition cursor-pointer flex items-center justify-center gap-2",
                  platform === "mercadolivre"
                    ? "bg-[#f3f3f7] text-[#000000] border-[#000000]"
                    : "bg-[#ffffff] text-[#60646c] border-[#b9bbc6] hover:bg-[#f3f3f7]"
                )}
              >
                <div className="w-5 h-5 rounded-[4px] p-0.5 flex items-center justify-center shrink-0">
                  <MercadoLivreLogo className="w-full h-full" />
                </div>
                <span>Mercado Livre</span>
                {platform === "mercadolivre" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5900] ml-auto hidden sm:inline-block" />
                )}
              </button>

              <button
                type="button"
                onClick={() => onPlatformChange("shopee")}
                className={cn(
                  "py-3 px-3.5 rounded-[12px] font-medium text-xs tracking-[-0.01em] border transition cursor-pointer flex items-center justify-center gap-2",
                  platform === "shopee"
                    ? "bg-[#f3f3f7] text-[#000000] border-[#000000]"
                    : "bg-[#ffffff] text-[#60646c] border-[#b9bbc6] hover:bg-[#f3f3f7]"
                )}
              >
                <div className="w-5 h-5 rounded-[4px] p-0.5 flex items-center justify-center shrink-0">
                  <ShopeeLogo className="w-full h-full" />
                </div>
                <span>Shopee</span>
                {platform === "shopee" && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[#ff5900] ml-auto hidden sm:inline-block" />
                )}
              </button>
            </div>

            {/* Área Principal de Envio do Extrato */}
            <label
              id="extrato-dropzone"
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
                "scroll-mt-36 relative flex flex-col items-center justify-center w-full min-h-[210px] h-auto py-6 border border-dashed rounded-[12px] cursor-pointer transition p-4 sm:p-6 text-center",
                isDragging
                  ? "border-[#ff5900] bg-[#f3f3f7]"
                  : "border-[#b9bbc6] bg-[#f3f3f7]/50 hover:bg-[#f3f3f7] hover:border-[#000000]"
              )}
            >
              {loadingStep ? (
                <div className="space-y-3.5 w-full max-w-sm mx-auto">
                  <div className="relative flex items-center justify-center">
                    <div className="w-10 h-10 rounded-[12px] bg-[#ff5900] text-white flex items-center justify-center font-bold">
                      <Zap className="w-5 h-5 fill-white text-white" />
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-semibold text-[#000000] tracking-[-0.01em]">{loadingStep}</p>
                    <p className="text-[11px] text-[#60646c] mt-0.5 tracking-[-0.01em]">
                      Processamento local em execução
                    </p>
                  </div>

                  {/* Barra de progresso */}
                  <div className="w-full bg-[#b9bbc6]/40 rounded-[6px] h-1.5 overflow-hidden">
                    <div className="bg-[#ff5900] h-full rounded-[6px] animate-pulse w-full" />
                  </div>

                  {/* Micro-contadores de status da conferência */}
                  <div className="grid grid-cols-3 gap-2 pt-1 text-center">
                    <div className="p-2 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6]">
                      <span className="text-[10px] uppercase text-[#8b8d98] block">Status</span>
                      <span className="text-xs font-semibold text-[#000000]">Analisando</span>
                    </div>
                    <div className="p-2 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6]">
                      <span className="text-[10px] uppercase text-[#8b8d98] block">Regras</span>
                      <span className="text-xs font-semibold text-[#ff5900]">Tabela 2026</span>
                    </div>
                    <div className="p-2 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6]">
                      <span className="text-[10px] uppercase text-[#8b8d98] block">Segurança</span>
                      <span className="text-xs font-semibold text-[#000000]">Seguro</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 mb-2.5">
                    <div className="w-10 h-10 rounded-[12px] bg-[#ffffff] border border-[#b9bbc6] text-[#000000] flex items-center justify-center">
                      <UploadCloud className="w-5 h-5 text-[#ff5900]" />
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-[#000000] tracking-[-0.01em]">
                    Solte aqui o extrato do {platform === "mercadolivre" ? "Mercado Livre" : "Shopee"}
                  </span>
                  <span className="text-xs text-[#60646c] mt-1 tracking-[-0.01em]">
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
              <div className="mt-3 p-3 rounded-[12px] bg-[#ffffff] border border-red-300 text-xs text-red-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Ação de Teste Instantâneo (Ghost Button Brex) */}
            <div className="mt-4 pt-3.5 border-t border-[#b9bbc6] flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-[#60646c] tracking-[-0.01em]">
                Sem o arquivo agora?
              </span>
              <button
                type="button"
                disabled={Boolean(loadingStep)}
                onClick={onRunSample}
                className="w-full sm:w-auto py-2 px-3.5 rounded-[12px] border border-[#b9bbc6] bg-[#ffffff] hover:bg-[#f3f3f7] text-[#000000] font-medium text-xs tracking-[-0.01em] transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Testar com dados de exemplo</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#ff5900]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default MarketplaceProductHero;
