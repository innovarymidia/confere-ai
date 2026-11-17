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
                "relative rounded-2xl md:rounded-3xl border transition-all duration-500 cursor-pointer overflow-hidden flex flex-col justify-between",
                isActive
                  ? "flex-[4] p-5 sm:p-6 bg-white border-indigo-300 shadow-soft-lg ring-1 ring-indigo-500/20"
                  : "flex-none h-14 md:h-auto md:flex-1 p-3.5 md:p-6 bg-white/70 hover:bg-white border-slate-200/80 shadow-xs justify-center md:justify-between"
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

              {/* Topo do Card com Logo da Plataforma */}
              <div className={cn("relative z-10 flex items-center justify-between", !isActive && "md:flex")}>
                <span
                  className={cn(
                    "text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full border transition-colors shrink-0 flex items-center gap-1.5",
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 shadow-xs"
                      : "bg-white text-slate-700 border-slate-200"
                  )}
                >
                  {card.platform === "Mercado Livre" ? (
                    <MercadoLivreLogo className="w-3.5 h-3.5 rounded-xs" />
                  ) : (
                    <ShopeeLogo className="w-3.5 h-3.5 rounded-xs" />
                  )}
                  <span>{card.platform}</span>
                </span>

                {isActive ? (
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1 shrink-0">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    {card.badge}
                  </span>
                ) : (
                  <span className="md:hidden font-extrabold text-xs text-slate-700 tracking-tight line-clamp-1 px-2">
                    {card.niche}
                  </span>
                )}
              </div>

              {/* Conteúdo Central */}
              <div className="relative z-10 my-auto">
                {isActive ? (
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
                ) : (
                  <div className="flex items-center justify-end md:flex-col md:justify-center h-full">
                    <span className="hidden md:block md:-rotate-90 md:whitespace-nowrap font-extrabold text-sm text-slate-700 tracking-tight">
                      {card.niche}
                    </span>
                    <span className="font-black text-emerald-600 text-xs sm:text-sm md:mt-6 shrink-0">
                      {card.recoveredAmount}
                    </span>
                  </div>
                )}
              </div>

              {/* Rodapé do Card */}
              {isActive ? (
                <div className="relative z-10 flex items-center justify-between text-xs pt-3 border-t border-slate-100">
                  <span className="text-slate-500 font-semibold text-[11px] sm:text-xs">
                    <strong>{card.ordersCount} pedidos</strong> contestados • {card.timeframe}
                  </span>
                  <span className="text-indigo-600 font-extrabold text-[11px] flex items-center gap-1 shrink-0">
                    Comprovado <ArrowUpRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ) : (
                <div className="relative z-10 hidden md:block pt-3 border-t border-slate-100 text-center">
                  <span className="text-[10px] text-slate-400 font-bold">
                    Ver caso
                  </span>
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

export default CueCollapsingCardsAccordion;
