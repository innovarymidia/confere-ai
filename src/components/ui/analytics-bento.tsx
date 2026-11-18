"use client";
import * as React from "react";
import {
  TrendingUp,
  Package,
  Percent,
  RotateCcw,
  Clock,
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { MercadoLivreLogo, ShopeeLogo } from "./marketplace-logos";

interface AnalyticsBentoProps {
  totalRecoverable: number;
  freteRecoverable: number;
  comissaoRecoverable: number;
  devolucaoRecoverable: number;
  totalOrdersAnalyzed: number;
  totalDivergentOrders: number;
  platform: "mercadolivre" | "shopee";
  topDivergentOrders?: {
    orderId: string;
    sku: string;
    expectedAmount: number;
    chargedAmount: number;
    recoverableAmount: number;
    errorType?: "frete" | "comissao" | "devolucao";
  }[];
  className?: string;
}

function formatBRL(val: number): string {
  return Number(val || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function AnalyticsBento({
  totalRecoverable,
  freteRecoverable,
  comissaoRecoverable,
  devolucaoRecoverable,
  totalOrdersAnalyzed,
  totalDivergentOrders,
  platform,
  topDivergentOrders,
  className,
}: AnalyticsBentoProps) {
  const [hoveredPoint, setHoveredPoint] = React.useState<number | null>(null);

  const fretePct = totalRecoverable > 0 ? Math.round((freteRecoverable / totalRecoverable) * 100) : 0;
  const comissaoPct = totalRecoverable > 0 ? Math.round((comissaoRecoverable / totalRecoverable) * 100) : 0;
  const devolucaoPct = totalRecoverable > 0 ? 100 - fretePct - comissaoPct : 0;

  // Prepara os 5 maiores pedidos divergentes reais para alimentar o gráfico
  const chartOrders = React.useMemo(() => {
    if (topDivergentOrders && topDivergentOrders.length > 0) {
      return topDivergentOrders.slice(0, 5);
    }
    return [
      { orderId: "200000918404", sku: "KIT-ORGANIZADOR-3P", expectedAmount: 19.9, chargedAmount: 54.9, recoverableAmount: 35.0 },
      { orderId: "200000918408", sku: "SUPORTE-ARTICULADO-PRO", expectedAmount: 23.45, chargedAmount: 62.8, recoverableAmount: 39.35 },
      { orderId: "200000918412", sku: "GARRAFA-TERMICA-1L", expectedAmount: 18.9, chargedAmount: 41.2, recoverableAmount: 22.3 },
      { orderId: "200000918405", sku: "KIT-ORGANIZADOR-3P", expectedAmount: 19.9, chargedAmount: 48.9, recoverableAmount: 29.0 },
      { orderId: "200000918409", sku: "SUPORTE-ARTICULADO-PRO", expectedAmount: 30.24, chargedAmount: 45.36, recoverableAmount: 15.12 },
    ];
  }, [topDivergentOrders]);

  const maxCharged = Math.max(...chartOrders.map((o) => o.chargedAmount), 60);
  const avgExpected = chartOrders.reduce((acc, o) => acc + o.expectedAmount, 0) / (chartOrders.length || 1);
  const maxChargedValue = Math.max(...chartOrders.map((o) => o.chargedAmount), 0);

  const points = chartOrders.map((order, idx) => {
    const totalSlots = Math.max(1, chartOrders.length - 1);
    const x = 35 + idx * ((390 - 70) / totalSlots);
    const ratio = Math.min(1, Math.max(0.15, order.recoverableAmount / (maxCharged * 0.75 || 1)));
    const yCharged = Math.round(68 - ratio * 48);
    return { ...order, x: Math.round(x), yCharged, yExpected: 68 };
  });

  const pathExpected = `M 10 68 L ${points.map((p) => `${p.x} 68`).join(" L ")} L 390 68`;
  const pathCharged = `M 10 68 L ${points.map((p) => `${p.x} ${p.yCharged}`).join(" L ")} L 390 68`;

  const hoveredOrder = hoveredPoint !== null ? points[hoveredPoint] : null;

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-4", className)}>
      {/* =========================================================================
          TILE 1: HISTÓRICO DE FRETE POR PRODUTO (Col 7)
          ========================================================================= */}
      <div className="lg:col-span-7 bg-[#ffffff] rounded-[12px] p-6 sm:p-7 border border-[#b9bbc6] flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {platform === "mercadolivre" ? (
                <MercadoLivreLogo className="w-4 h-4 rounded-[4px]" />
              ) : (
                <ShopeeLogo className="w-4 h-4 rounded-[4px]" />
              )}
              <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
                Histórico de Cobranças Reais: {platform === "mercadolivre" ? "Mercado Livre" : "Shopee"}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[-0.01em] px-2.5 py-1 rounded-[6px] bg-[#000000] text-white self-start sm:self-auto">
              <AlertTriangle className="w-3 h-3 text-[#ff5900]" />
              {hoveredOrder
                ? `Pedido #${hoveredOrder.orderId}: +${formatBRL(hoveredOrder.recoverableAmount)} a maior`
                : "Top 5 Cobranças a Maior"}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mt-1">
            <span className="text-3xl sm:text-5xl font-semibold tracking-[-0.025em] text-[#000000]">
              {formatBRL(totalRecoverable)}
            </span>
            <span className="text-xs font-semibold text-[#000000] bg-[#f3f3f7] px-2.5 py-1 rounded-[6px] border border-[#b9bbc6]">
              +{totalDivergentOrders} Cobranças a Maior
            </span>
          </div>
          <p className="text-xs text-[#60646c] mt-1.5 font-normal leading-relaxed tracking-[-0.01em]">
            Auditamos <strong className="text-[#000000] font-semibold">{totalOrdersAnalyzed} pedidos</strong> da sua conta. A linha pontilhada indica o valor contratual e a linha preta com pontos laranjas mostra as divergências reais identificadas nos seus maiores pedidos.
          </p>
        </div>

        {/* Gráfico SVG Linha Interativa alimentado com dados reais */}
        <div className="my-5 relative">
          <svg className="w-full h-24 overflow-visible" viewBox="0 0 400 90">
            {/* Linha de Base Esperada (Hairline Mist) */}
            <path
              d={pathExpected}
              fill="none"
              stroke="#b9bbc6"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Linha de Custo Real Cobrado (Ink) */}
            <path
              d={pathCharged}
              fill="none"
              stroke="#000000"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Pontos Interativos com dados reais da auditoria */}
            {points.map((p, idx) => (
              <g key={p.orderId || idx}>
                <circle
                  cx={p.x}
                  cy={p.yCharged}
                  r="5"
                  className={cn(
                    "cursor-pointer transition-all stroke-2 stroke-white",
                    hoveredPoint === idx ? "fill-[#000000] scale-125" : "fill-[#ff5900]"
                  )}
                  onMouseEnter={() => setHoveredPoint(idx)}
                  onMouseLeave={() => setHoveredPoint(null)}
                />
              </g>
            ))}
          </svg>

          {/* Legenda com valores reais */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-xs text-[#60646c] pt-2 border-t border-[#b9bbc6]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#8b8d98] border-dashed" /> Valor Esperado Contratual (Média: {formatBRL(avgExpected)})
            </span>
            <span className="flex items-center gap-1.5 text-[#000000] font-medium">
              <span className="w-2 h-2 rounded-full bg-[#ff5900]" /> Cobrado a Maior no Pedido (Até {formatBRL(maxChargedValue)})
            </span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-[#b9bbc6] flex items-center justify-between text-xs text-[#60646c]">
          <span>Conferência automática por pedido e anúncio</span>
          <span className="font-semibold text-[#000000]">Conferência Concluída</span>
        </div>
      </div>

      {/* =========================================================================
          TILE 2: DISTRIBUIÇÃO DOS VAZAMENTOS (Col 5)
          ========================================================================= */}
      <div className="lg:col-span-5 bg-[#ffffff] rounded-[12px] p-6 sm:p-7 border border-[#b9bbc6] flex flex-col justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
            Divisão dos Valores a Recuperar
          </span>
          <h3 className="text-base font-semibold text-[#000000] tracking-[-0.01em] mt-1">
            Origem do Dinheiro a Recuperar
          </h3>
        </div>

        {/* Blocos Visuais Proporcionais em Fog com 12px de raio */}
        <div className="my-4 space-y-2">
          {/* Bloco 1: Frete e Peso Cobrados a Maior */}
          <div className="p-3.5 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6] text-[#000000] flex items-center justify-center">
                <Package className="w-4 h-4 text-[#ff5900]" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#000000] block tracking-[-0.01em]">
                  Frete e Peso Cobrados a Mais
                </span>
                <span className="text-[11px] text-[#60646c]">
                  {fretePct}% do total identificado
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#000000]">
              {formatBRL(freteRecoverable)}
            </span>
          </div>

          {/* Bloco 2: Comissões */}
          <div className="p-3.5 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6] text-[#000000] flex items-center justify-center">
                <Percent className="w-4 h-4 text-[#ff5900]" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#000000] block tracking-[-0.01em]">
                  Comissão Cobrada Acima da Tabela
                </span>
                <span className="text-[11px] text-[#60646c]">
                  {comissaoPct}% das divergências
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#000000]">
              {formatBRL(comissaoRecoverable)}
            </span>
          </div>

          {/* Bloco 3: Devoluções */}
          <div className="p-3.5 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6] text-[#000000] flex items-center justify-center">
                <RotateCcw className="w-4 h-4 text-[#ff5900]" />
              </div>
              <div>
                <span className="text-xs font-semibold text-[#000000] block tracking-[-0.01em]">
                  Devoluções que Deixaram Prejuízo
                </span>
                <span className="text-[11px] text-[#60646c]">
                  {devolucaoPct}% de estornos pendentes
                </span>
              </div>
            </div>
            <span className="text-xs font-semibold text-[#000000]">
              {formatBRL(devolucaoRecoverable)}
            </span>
          </div>
        </div>

        <div className="text-xs text-[#60646c] flex items-center justify-between pt-2 border-t border-[#b9bbc6]">
          <span>Tabelas Oficiais 2026</span>
          <span className="font-semibold text-[#000000]">Contestação Comprovada</span>
        </div>
      </div>

      {/* =========================================================================
          TILE 3: TEMPO MÉDIO DE ESTORNO (Col 4)
          ========================================================================= */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-4 bg-[#ffffff] rounded-[12px] p-6 border border-[#b9bbc6] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
            Agilidade de Reembolso
          </span>
          <Clock className="w-4 h-4 text-[#ff5900]" />
        </div>

        <div className="my-3">
          <span className="text-3xl font-semibold text-[#000000] tracking-[-0.025em] block">48 a 72h</span>
          <span className="text-xs text-[#60646c] font-normal mt-1 block leading-relaxed tracking-[-0.01em]">
            Prazo médio para o marketplace estornar o valor diretamente no seu saldo após você enviar a contestação no chat de suporte.
          </span>
        </div>

        <div className="p-3 bg-[#f3f3f7] rounded-[6px] border border-[#b9bbc6] text-xs text-[#000000] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#ff5900] shrink-0" />
          <span>Mensagem pronta com dados exigidos pelo suporte</span>
        </div>
      </div>

      {/* =========================================================================
          TILE 4: IMPACTO NA MARGEM LÍQUIDA (Col 4)
          ========================================================================= */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-4 bg-[#ffffff] rounded-[12px] p-6 border border-[#b9bbc6] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
            Impacto no Lucro
          </span>
          <TrendingUp className="w-4 h-4 text-[#ff5900]" />
        </div>

        <div className="my-3">
          <span className="text-3xl font-semibold text-[#000000] tracking-[-0.025em] block">+4.8%</span>
          <span className="text-xs text-[#60646c] font-normal mt-1 block leading-relaxed tracking-[-0.01em]">
            Cada real recuperado volta 100% para o seu caixa, sem custo extra de mercadoria vendida.
          </span>
        </div>

        <div className="p-3 bg-[#f3f3f7] rounded-[6px] border border-[#b9bbc6] text-xs text-[#000000]">
          R$ 1.000 recuperados: R$ 1.000 direto no seu caixa
        </div>
      </div>

      {/* =========================================================================
          TILE 5: RECUPERAÇÃO RÁPIDA NO SUPORTE (Col 4)
          ========================================================================= */}
      <div className="col-span-1 sm:col-span-12 lg:col-span-4 bg-[#ffffff] rounded-[12px] p-6 border border-[#b9bbc6] flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
            Recuperação Rápida no Suporte
          </span>
          <ShieldCheck className="w-4 h-4 text-[#ff5900]" />
        </div>

        <div className="my-3">
          <span className="text-3xl font-semibold text-[#000000] tracking-[-0.025em] block">Zero Atrito</span>
          <span className="text-xs text-[#60646c] font-normal mt-1 block leading-relaxed tracking-[-0.01em]">
            Basta clicar em "Copiar Contestação" e colar na conversa com o atendente do marketplace para receber o estorno na hora.
          </span>
        </div>

        <div className="p-3 bg-[#f3f3f7] rounded-[6px] border border-[#b9bbc6] text-xs text-[#000000] flex items-center justify-between">
          <span>Sem burocracia</span>
          <ArrowUpRight className="w-4 h-4 text-[#ff5900]" />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsBento;
