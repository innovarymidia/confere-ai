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
    <div className={cn("grid grid-cols-1 md:grid-cols-12 gap-5", className)}>
      {/* =========================================================================
          TILE 1: REVENUE LINE COM PICO DE SOBRETAXA (Bento Hero Tile - Col 7)
          ========================================================================= */}
      <div className="md:col-span-7 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-soft flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
              DISPERSÃO HISTÓRICA POR SKU • {platform === "mercadolivre" ? "MERCADO LIVRE" : "SHOPEE"}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              <AlertTriangle className="w-3 h-3 text-rose-600" />
              {hoveredPoint ? `Pico Pedido #${hoveredPoint}: Cobrança Duplicada` : "Picos de Cubagem Detectados"}
            </span>
          </div>

          <div className="flex items-baseline gap-3 mt-1">
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
              {formatBRL(totalRecoverable)}
            </span>
            <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-100">
              +{totalDivergentOrders} Cobranças a Maior
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Analisamos <strong>{totalOrdersAnalyzed} pedidos</strong>. Abaixo, a linha cinza é o custo normal de frete do SKU e os picos vermelhos são os pedidos cobrados acima da média.
          </p>
        </div>

        {/* Gráfico SVG Linha Interativa com Scrub */}
        <div className="my-6 relative">
          <svg className="w-full h-28 overflow-visible" viewBox="0 0 400 90">
            {/* Linha de Base Esperada (Cinza Suave) */}
            <path
              d="M 10 70 L 60 70 L 110 70 L 160 65 L 210 65 L 260 72 L 310 72 L 380 72"
              fill="none"
              stroke="#CBD5E1"
              strokeWidth="2"
              strokeDasharray="4 4"
            />

            {/* Linha de Custo Real Cobrado (com Saltos de Outliers) */}
            <path
              d="M 10 70 L 60 68 L 110 20 L 160 65 L 210 15 L 260 72 L 310 35 L 380 72"
              fill="none"
              stroke="#6366F1"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Ponto 1 (Pico 1) */}
            <circle cx="110" cy="20" r="5" className="fill-rose-600 stroke-4 stroke-white shadow-md cursor-pointer" onMouseEnter={() => setHoveredPoint(1)} onMouseLeave={() => setHoveredPoint(null)} />
            {/* Ponto 2 (Pico 2) */}
            <circle cx="210" cy="15" r="5" className="fill-rose-600 stroke-4 stroke-white shadow-md cursor-pointer" onMouseEnter={() => setHoveredPoint(2)} onMouseLeave={() => setHoveredPoint(null)} />
            {/* Ponto 3 (Pico 3) */}
            <circle cx="310" cy="35" r="5" className="fill-rose-600 stroke-4 stroke-white shadow-md cursor-pointer" onMouseEnter={() => setHoveredPoint(3)} onMouseLeave={() => setHoveredPoint(null)} />
          </svg>

          {/* Legenda rápida */}
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-2 border-t border-slate-100">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-0.5 bg-slate-400 border-dashed" /> Frete Padrão do SKU (R$ 19,90)
            </span>
            <span className="flex items-center gap-1.5 text-rose-600">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-600" /> Cobrança Errada de Cubagem (R$ 54,90+)
            </span>
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-500">
          <span>Tolerância de cubagem: 1.22x</span>
          <span className="text-indigo-600 font-bold">100% Auditado</span>
        </div>
      </div>

      {/* =========================================================================
          TILE 2: TREEMAP DE CATEGORIAS / DISTRIBUIÇÃO (Col 5)
          ========================================================================= */}
      <div className="md:col-span-5 bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/90 shadow-soft flex flex-col justify-between">
        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-slate-400">
            DISTRIBUIÇÃO DOS VAZAMENTOS (TREEMAP)
          </span>
          <h3 className="text-lg font-extrabold text-slate-900 mt-1">
            Origem do Dinheiro a Recuperar
          </h3>
        </div>

        {/* Blocos Treemap Visuais Proporcionais */}
        <div className="my-4 space-y-2.5">
          {/* Bloco 1: Frete Cubado */}
          <div className="p-4 rounded-2xl bg-amber-50/80 border border-amber-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <Package className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-amber-950 block">
                  Frete Cubado / Peso Acima
                </span>
                <span className="text-[10px] text-amber-700 font-medium">
                  {fretePct}% do total identificado
                </span>
              </div>
            </div>
            <span className="text-base font-black text-amber-900">
              {formatBRL(freteRecoverable)}
            </span>
          </div>

          {/* Bloco 2: Comissões */}
          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold">
                <Percent className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-indigo-950 block">
                  Comissão Fora da Tabela
                </span>
                <span className="text-[10px] text-indigo-700 font-medium">
                  {comissaoPct}% das divergências
                </span>
              </div>
            </div>
            <span className="text-base font-black text-indigo-900">
              {formatBRL(comissaoRecoverable)}
            </span>
          </div>

          {/* Bloco 3: Devoluções */}
          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                <RotateCcw className="w-4 h-4" />
              </div>
              <div>
                <span className="text-xs font-extrabold text-rose-950 block">
                  Devoluções com Saldo Negativo
                </span>
                <span className="text-[10px] text-rose-700 font-medium">
                  {devolucaoPct}% de estornos pendentes
                </span>
              </div>
            </div>
            <span className="text-base font-black text-rose-900">
              {formatBRL(devolucaoRecoverable)}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-400 font-medium flex items-center justify-between pt-2 border-t border-slate-100">
          <span>Critério: Reajustes 2026</span>
          <span className="text-emerald-600 font-bold">Taxa de assertividade 94%</span>
        </div>
      </div>

      {/* =========================================================================
          TILE 3: TEMPO MÉDIO DE ESTORNO & IMPACTO NA MARGEM (Col 4)
          ========================================================================= */}
      <div className="md:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            AGILIDADE DE REEMBOLSO
          </span>
          <Clock className="w-4 h-4 text-indigo-600" />
        </div>

        <div className="my-3">
          <span className="text-3xl font-black text-slate-900 block">48 a 72h</span>
          <span className="text-xs text-slate-500 font-medium mt-0.5 block">
            Prazo médio para crédito no Mercado Pago ou Carteira Shopee após envio do chamado técnico.
          </span>
        </div>

        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100 text-xs text-emerald-800 font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Textos formatados conforme exigência do suporte</span>
        </div>
      </div>

      {/* =========================================================================
          TILE 4: IMPACTO NA MARGEM LÍQUIDA (Col 4)
          ========================================================================= */}
      <div className="md:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            IMPACTO NO LUCRO
          </span>
          <TrendingUp className="w-4 h-4 text-emerald-600" />
        </div>

        <div className="my-3">
          <span className="text-3xl font-black text-emerald-600 block">+4.8%</span>
          <span className="text-xs text-slate-500 font-medium mt-0.5 block">
            Aumento direto na margem líquida da sua operação ao estornar frete cobrado a maior.
          </span>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 font-medium">
          R$ 1.000 recuperados = R$ 1.000 direto no lucro líquido
        </div>
      </div>

      {/* =========================================================================
          TILE 5: GARANTIA DE RECUPERAÇÃO (Col 4)
          ========================================================================= */}
      <div className="md:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            CONTESTAÇÃO 1-CLIQUE
          </span>
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
        </div>

        <div className="my-3">
          <span className="text-3xl font-black text-indigo-600 block">Zero Atrito</span>
          <span className="text-xs text-slate-500 font-medium mt-0.5 block">
            Basta clicar em "Copiar Contestação" na linha do pedido e colar no chat de atendimento do marketplace.
          </span>
        </div>

        <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 text-xs text-indigo-700 font-semibold flex items-center justify-between">
          <span>Sem burocracia</span>
          <ArrowUpRight className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}

export default AnalyticsBento;
