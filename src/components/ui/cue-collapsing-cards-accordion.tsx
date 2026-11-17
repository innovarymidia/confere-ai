"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { MercadoLivreLogo, ShopeeLogo } from "./marketplace-logos";

export interface RefundEvidenceCard {
  id: string;
  niche: string;
  recoveredAmount: string;
  platform: "Mercado Livre" | "Shopee";
  divergenceType: string;
  ordersCount: number;
  timeframe: string;
  quote: string;
  badge: string;
  accentGradient: string;
}

const DEFAULT_CARDS: RefundEvidenceCard[] = [
  {
    id: "case-1",
    niche: "Moda e Vestuário",
    recoveredAmount: "R$ 842,50",
    platform: "Mercado Livre",
    divergenceType: "Frete Cobrado a Mais",
    ordersCount: 29,
    timeframe: "Dinheiro na conta em 48h",
    quote: "A transportadora estava pesando vestidos de 250g como se fossem 1,5 kg. O suporte do Mercado Livre creditou o estorno na hora.",
    badge: "Estorno Concluído",
    accentGradient: "from-amber-500/20 via-indigo-600/10 to-transparent",
  },
  {
    id: "case-2",
    niche: "Eletrônicos e Acessórios",
    recoveredAmount: "R$ 1.290,00",
    platform: "Shopee",
    divergenceType: "Peso Cobrado Errado",
    ordersCount: 42,
    timeframe: "Crédito na Carteira",
    quote: "Subi a planilha de 60 dias da Shopee e achou mais de mil reais parados. Copiei a mensagem gerada pelo ConfereAI e devolveram o valor.",
    badge: "100% Recuperado",
    accentGradient: "from-orange-500/20 via-indigo-600/10 to-transparent",
  },
  {
    id: "case-3",
    niche: "Casa e Decoração",
    recoveredAmount: "R$ 640,00",
    platform: "Mercado Livre",
    divergenceType: "Frete de Devolução Anulado",
    ordersCount: 14,
    timeframe: "Devolução Revertida",
    quote: "Comprador devolveu por arrependimento e cobraram o frete de volta da minha conta. Reclamei com o texto do ConfereAI e estornaram.",
    badge: "Frete Anulado",
    accentGradient: "from-emerald-500/20 via-indigo-600/10 to-transparent",
  },
  {
    id: "case-4",
    niche: "Autopeças e Ferramentas",
    recoveredAmount: "R$ 2.450,00",
    platform: "Mercado Livre",
    divergenceType: "Comissão Acima do Combinado",
    ordersCount: 68,
    timeframe: "Conta Gold",
    quote: "Com a mudança das tabelas de 2026, vários anúncios continuaram cobrando tarifa antiga a maior. O ConfereAI pegou cada centavo.",
    badge: "Maior Volume",
    accentGradient: "from-indigo-600/20 via-violet-600/10 to-transparent",
  },
  {
    id: "case-5",
    niche: "Cosméticos e Skincare",
    recoveredAmount: "R$ 915,00",
    platform: "Shopee",
    divergenceType: "Taxas Indevidas Estornadas",
    ordersCount: 35,
    timeframe: "Estorno via Chat",
    quote: "O suporte pediu a lista dos pedidos com o valor da diferença. Em 2 dias úteis o saldo foi liberado para saque na minha conta.",
    badge: "Reembolsado",
    accentGradient: "from-rose-500/20 via-indigo-600/10 to-transparent",
  },
];

export function CueCollapsingCardsAccordion({
  cards = DEFAULT_CARDS,
  className,
}: {
  cards?: RefundEvidenceCard[];
  className?: string;
}) {
  const [activeId, setActiveId] = React.useState<string>(cards[0]?.id ?? "case-1");

  return (
    <section
      id="casos-reais"
      aria-label="Resultados Reais de Recuperação"
      className={cn("w-full max-w-5xl mx-auto", className)}
    >
      <div className="text-center max-w-2xl mx-auto mb-8">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs mb-3">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          Dinheiro de Volta no Caixa
        </span>
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Valores que outros lojistas receberam de volta
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">
          Toque nos cartões abaixo para ver os valores que caíram de volta na conta de quem conferiu os extratos com o ConfereAI.
        </p>
      </div>

      {/* Accordion Horizontal de Cards Colapsáveis */}
      <div className="flex flex-col md:flex-row gap-3 min-h-[480px] md:h-[370px] w-full">
        {cards.map((card) => {
          const isActive = activeId === card.id;

          return (
            <motion.div
              key={card.id}
              onClick={() => setActiveId(card.id)}
              onMouseEnter={() => setActiveId(card.id)}
              className={cn(
                "relative rounded-2xl md:rounded-3xl border transition-all duration-300 cursor-pointer overflow-hidden",
                isActive
                  ? "flex-[4] p-5 sm:p-6 bg-white border-orange-300 shadow-soft-lg ring-1 ring-orange-500/20 flex flex-col justify-between"
                  : "flex-none h-14 md:h-auto md:flex-1 bg-white/80 hover:bg-white border-slate-200/90 shadow-2xs hover:shadow-soft"
              )}
            >
              {/* Gradiente de fundo sutil */}
              <div
                className={cn(
                  "absolute inset-0 bg-gradient-to-br transition-opacity duration-500 pointer-events-none",
                  card.accentGradient,
                  isActive ? "opacity-100" : "opacity-30"
                )}
              />

              {isActive ? (
                /* =========================================================================
                   CARD ATIVO EXPANDIDO
                   ========================================================================= */
                <>
                  {/* Topo do Card com Logo da Plataforma */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-slate-900 text-white border border-slate-900 shadow-xs flex items-center gap-1.5 shrink-0">
                      {card.platform === "Mercado Livre" ? (
                        <MercadoLivreLogo className="w-3.5 h-3.5 rounded-xs" />
                      ) : (
                        <ShopeeLogo className="w-3.5 h-3.5 rounded-xs" />
                      )}
                      <span>{card.platform}</span>
                    </span>

                    <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      {card.badge}
                    </span>
                  </div>

                  {/* Conteúdo Central */}
                  <div className="relative z-10 my-auto py-2">
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25 }}
                    >
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                        {card.niche} • {card.divergenceType}
                      </span>
                      <div className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight mt-1 text-emerald-600">
                        +{card.recoveredAmount}
                      </div>
                      <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-slate-600 leading-relaxed font-medium bg-white/80 p-3 sm:p-3.5 rounded-2xl border border-slate-100 shadow-xs">
                        “{card.quote}”
                      </p>
                    </motion.div>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="relative z-10 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                    <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">
                      <strong>{card.ordersCount} pedidos</strong> estornados • {card.timeframe}
                    </span>
                    <span className="text-orange-600 font-extrabold text-[11px] flex items-center gap-1 shrink-0">
                      Comprovado <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </>
              ) : (
                /* =========================================================================
                   CARD COLAPSADO / FECHADO (Sem nenhuma sobreposição)
                   ========================================================================= */
                <>
                  {/* Visão Mobile: Barra horizontal limpa */}
                  <div className="md:hidden relative z-10 flex items-center justify-between h-full px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-white border border-slate-200 p-0.5 flex items-center justify-center shadow-2xs shrink-0">
                        {card.platform === "Mercado Livre" ? (
                          <MercadoLivreLogo className="w-full h-full" />
                        ) : (
                          <ShopeeLogo className="w-full h-full" />
                        )}
                      </div>
                      <span className="font-extrabold text-xs text-slate-800 truncate max-w-[150px]">
                        {card.niche}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-black text-xs text-emerald-600">
                        {card.recoveredAmount}
                      </span>
                      <span className="text-[10px] font-extrabold text-orange-700 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-100">
                        Ver
                      </span>
                    </div>
                  </div>

                  {/* Visão Desktop / Tablet: Coluna vertical perfeitamente distribuída */}
                  <div className="hidden md:flex relative z-10 flex-col items-center justify-between h-full py-5 px-1 text-center">
                    {/* Topo: Logo Oficial */}
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-200/80 p-1 flex items-center justify-center shadow-2xs shrink-0">
                      {card.platform === "Mercado Livre" ? (
                        <MercadoLivreLogo className="w-full h-full" />
                      ) : (
                        <ShopeeLogo className="w-full h-full" />
                      )}
                    </div>

                    {/* Centro: Nome do Nicho em writing-mode vertical nativo */}
                    <div className="my-auto py-2 flex items-center justify-center overflow-hidden max-h-[200px]">
                      <span className="[writing-mode:vertical-rl] rotate-180 text-xs font-black uppercase tracking-wider text-slate-700 select-none whitespace-nowrap">
                        {card.niche}
                      </span>
                    </div>

                    {/* Rodapé: Valor do Estorno em pílula verde */}
                    <div className="w-full px-2 pt-2 border-t border-slate-200/60 shrink-0">
                      <span className="text-[11px] font-black text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-1 rounded-lg block truncate shadow-2xs">
                        {card.recoveredAmount}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default CueCollapsingCardsAccordion;
