"use client";
import * as React from "react";
import {
  TrendingUp,
  Package,
  Percent,
  RotateCcw,
  Clock,
  CheckCircle2,
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
  className,
}: AnalyticsBentoProps) {
  const [hoveredPoint, setHoveredPoint] = React.useState<number | null>(null);

  const fretePct = totalRecoverable > 0 ? Math.round((freteRecoverable / totalRecoverable) * 100) : 0;
  const comissaoPct = totalRecoverable > 0 ? Math.round((comissaoRecoverable / totalRecoverable) * 100) : 0;
  const devolucaoPct = totalRecoverable > 0 ? 100 - fretePct - comissaoPct : 0;

  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-12 gap-4", className)}>
      {/* =========================================================================
          TILE 1: REVENUE LINE COM PICO DE SOBRETAXA (Bento Hero Tile: Col 7)
          ========================================================================= */}
      <div className="lg:col-span-7 bg-white rounded-[6px] p-5 sm:p-6 border border-[#ebebeb] shadow-subtle flex flex-col justify-between">
        <div>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              {platform === "mercadolivre" ? (
                <MercadoLivreLogo className="w-4 h-4 rounded-[2px]" />
              ) : (
                <ShopeeLogo className="w-4 h-4 rounded-[2px]" />
              )}
              <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
                HISTÓRICO DE FRETE POR PRODUTO: {platform === "mercadolivre" ? "MERCADO LIVRE" : "SHOPEE"}
              </span>
            </div>
            <span className="inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.071em] px-2 py-0.5 rounded-[4px] bg-[#171717] text-white self-start sm:self-auto">
              <AlertTriangle className="w-3 h-3 text-white" />
              {hoveredPoint ? `Sobrepreço no Pedido #${hoveredPoint}` : "Cobranças a Maior"}
            </span>
          </div>

          <div className="flex flex-wrap items-baseline gap-2 sm:gap-3 mt-1">
            <span className="font-mono text-3xl sm:text-5xl font-normal tracking-tight text-[#171717]">
              {formatBRL(totalRecoverable)}
            </span>
            <span className="font-mono text-xs text-[#297a3a] bg-[#297a3a]/10 px-2 py-0.5 rounded-[4px] border border-[#297a3a]/20">
              +{totalDivergentOrders} Cobranças a Maior
            </span>
          </div>
          <p className="text-xs text-[#4d4d4d] mt-1.5 font-normal leading-relaxed">
            Conferimos <strong className="text-[#171717]">{totalOrdersAnalyzed} pedidos</strong> da sua conta. A linha cinza mostra o frete normal do produto e os pontos destacados indicam onde cobraram valor a mais de você.
          </p>
        </div>

        {/* Gráfico SVG Linha Interativa com Scrub */}
        <div className="my-5 relative">
          <svg className="w-full h-24 overflow-visible" viewBox="0 0 400 90">
            {/* Linha de Base Esperada (Hairline Cinza) */}
            <path
              d="M 10 70 L 60 70 L 110 70 L 160 65 L 210 65 L 260 72 L 310 72 L 380 72"
              fill="none"
              stroke="#ebebeb"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Linha de Custo Real Cobrado */}
            <path
              d="M 10 70 L 60 68 L 110 20 L 160 65 L 210 15 L 260 72 L 310 35 L 380 72"
              fill="none"
              stroke="#171717"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Ponto 1 */}
            <circle cx="110" cy="20" r="4.5" className="fill-[#171717] stroke-2 stroke-white cursor-pointer" onMouseEnter={() => setHoveredPoint(1)} onMouseLeave={() => setHoveredPoint(null)} />
            {/* Ponto 2 */}
            <circle cx="210" cy="15" r="4.5" className="fill-[#171717] stroke-2 stroke-white cursor-pointer" onMouseEnter={() => setHoveredPoint(2)} onMouseLeave={() => setHoveredPoint(null)} />
            {/* Ponto 3 */}
            <circle cx="310" cy="35" r="4.5" className="fill-[#171717] stroke-2 stroke-white cursor-pointer" onMouseEnter={() => setHoveredPoint(3)} onMouseLeave={() => setHoveredPoint(null)} />
          </svg>

          {/* Legenda rápida */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 font-mono text-[11px] text-[#666666] pt-2 border-t border-[#ebebeb]">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-[#8f8f8f] border-dashed" /> Frete Normal do Produto (R$ 19,90)
            </span>
            <span className="flex items-center gap-1.5 text-[#171717]">
              <span className="w-2 h-2 rounded-full bg-[#171717]" /> Frete Cobrado a Mais por Erro (R$ 54,90+)
            </span>
          </div>
        </div>

        <div className="pt-2.5 border-t border-[#ebebeb] flex items-center justify-between font-mono text-[11px] text-[#666666]">
          <span>Conferência automática por anúncio</span>
          <span className="text-[#297a3a]">Conferência Concluída</span>
        </div>
      </div>

      {/* =========================================================================
          TILE 2: DISTRIBUIÇÃO DOS VAZAMENTOS (Col 5)
          ========================================================================= */}
      <div className="lg:col-span-5 bg-white rounded-[6px] p-5 sm:p-6 border border-[#ebebeb] shadow-subtle flex flex-col justify-between">
        <div>
          <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
            DIVISÃO DOS VALORES A RECUPERAR
          </span>
          <h3 className="text-base font-medium text-[#171717] tracking-tight mt-1">
            Origem do Dinheiro a Recuperar
          </h3>
        </div>

        {/* Blocos Visuais Proporcionais */}
        <div className="my-4 space-y-2">
          {/* Bloco 1: Frete e Peso Cobrados a Maior */}
          <div className="p-3 rounded-[6px] bg-[#fafafa] border border-[#ebebeb] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[4px] bg-white border border-[#ebebeb] text-[#171717] flex items-center justify-center">
                <Package className="w-3.5 h-3.5 text-[#171717]" />
              </div>
              <div>
                <span className="text-xs font-medium text-[#171717] block">
                  Frete e Peso Cobrados a Mais
                </span>
                <span className="font-mono text-[10px] text-[#666666]">
                  {fretePct}% do total identificado
                </span>
              </div>
            </div>
            <span className="font-mono text-xs text-[#171717]">
              {formatBRL(freteRecoverable)}
            </span>
          </div>

          {/* Bloco 2: Comissões */}
          <div className="p-3 rounded-[6px] bg-[#fafafa] border border-[#ebebeb] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[4px] bg-white border border-[#ebebeb] text-[#171717] flex items-center justify-center">
                <Percent className="w-3.5 h-3.5 text-[#171717]" />
              </div>
              <div>
                <span className="text-xs font-medium text-[#171717] block">
                  Comissão Cobrada Acima da Tabela
                </span>
                <span className="font-mono text-[10px] text-[#666666]">
                  {comissaoPct}% das divergências
                </span>
              </div>
            </div>
            <span className="font-mono text-xs text-[#171717]">
              {formatBRL(comissaoRecoverable)}
            </span>
          </div>

          {/* Bloco 3: Devoluções */}
          <div className="p-3 rounded-[6px] bg-[#fafafa] border border-[#ebebeb] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-[4px] bg-white border border-[#ebebeb] text-[#171717] flex items-center justify-center">
                <RotateCcw className="w-3.5 h-3.5 text-[#171717]" />
              </div>
              <div>
                <span className="text-xs font-medium text-[#171717] block">
                  Devoluções que Deixaram Prejuízo
                </span>
                <span className="font-mono text-[10px] text-[#666666]">
                  {devolucaoPct}% de estornos pendentes
                </span>
              </div>
            </div>
            <span className="font-mono text-xs text-[#171717]">
              {formatBRL(devolucaoRecoverable)}
            </span>
          </div>
        </div>

        <div className="font-mono text-[11px] text-[#666666] flex items-center justify-between pt-2 border-t border-[#ebebeb]">
          <span>Tabelas Oficiais 2026</span>
          <span className="text-[#297a3a]">Contestação Comprovada</span>
        </div>
      </div>

      {/* =========================================================================
          TILE 3: TEMPO MÉDIO DE ESTORNO E IMPACTO NA MARGEM (Col 4)
          ========================================================================= */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-4 bg-white rounded-[6px] p-5 sm:p-6 border border-[#ebebeb] shadow-subtle flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
            AGILIDADE DE REEMBOLSO
          </span>
          <Clock className="w-3.5 h-3.5 text-[#171717]" />
        </div>

        <div className="my-3">
          <span className="font-mono text-2xl font-normal text-[#171717] block">48 a 72h</span>
          <span className="text-xs text-[#4d4d4d] font-normal mt-1 block leading-relaxed">
            Prazo médio para o marketplace estornar o valor diretamente no seu saldo após você enviar a contestação no chat de suporte.
          </span>
        </div>

        <div className="p-2.5 bg-[#fafafa] rounded-[4px] border border-[#ebebeb] font-mono text-[11px] text-[#297a3a] flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-[#297a3a] shrink-0" />
          <span>Mensagem pronta com dados exigidos pelo suporte</span>
        </div>
      </div>

      {/* =========================================================================
          TILE 4: IMPACTO NA MARGEM LÍQUIDA (Col 4)
          ========================================================================= */}
      <div className="col-span-1 sm:col-span-6 lg:col-span-4 bg-white rounded-[6px] p-5 sm:p-6 border border-[#ebebeb] shadow-subtle flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
            IMPACTO NO LUCRO
          </span>
          <TrendingUp className="w-3.5 h-3.5 text-[#297a3a]" />
        </div>

        <div className="my-3">
          <span className="font-mono text-2xl font-normal text-[#297a3a] block">+4.8%</span>
          <span className="text-xs text-[#4d4d4d] font-normal mt-1 block leading-relaxed">
            Cada real recuperado volta 100% para o seu caixa, sem custo extra de mercadoria.
          </span>
        </div>

        <div className="p-2.5 bg-[#fafafa] rounded-[4px] border border-[#ebebeb] font-mono text-[11px] text-[#4d4d4d]">
          R$ 1.000 recuperados = R$ 1.000 direto no seu caixa
        </div>
      </div>

      {/* =========================================================================
          TILE 5: RECUPERAÇÃO RÁPIDA NO SUPORTE (Col 4)
          ========================================================================= */}
      <div className="col-span-1 sm:col-span-12 lg:col-span-4 bg-white rounded-[6px] p-5 sm:p-6 border border-[#ebebeb] shadow-subtle flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
            RECUPERAÇÃO RÁPIDA NO SUPORTE
          </span>
          <ShieldCheck className="w-3.5 h-3.5 text-[#171717]" />
        </div>

        <div className="my-3">
          <span className="font-mono text-2xl font-normal text-[#171717] block">Zero Atrito</span>
          <span className="text-xs text-[#4d4d4d] font-normal mt-1 block leading-relaxed">
            Basta clicar em "Copiar Contestação" e colar na conversa com o atendente do marketplace para receber o estorno na hora.
          </span>
        </div>

        <div className="p-2.5 bg-[#fafafa] rounded-[4px] border border-[#ebebeb] font-mono text-[11px] text-[#171717] flex items-center justify-between">
          <span>Sem burocracia</span>
          <ArrowUpRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsBento;
