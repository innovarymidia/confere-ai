"use client";
import * as React from "react";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
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
      className={cn("w-full max-w-[1200px] mx-auto", className)}
    >
      <div className="text-center max-w-2xl mx-auto mb-10">
        <span className="text-[12px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] bg-[#f3f3f7] border border-[#b9bbc6] px-2.5 py-1 rounded-[6px] inline-flex items-center gap-1.5 mb-2">
          Dinheiro Recuperado Comprovado
        </span>
        <h2 className="text-2xl sm:text-4xl font-semibold text-[#000000] tracking-[-0.025em] mt-2">
          Valores que outros lojistas receberam de volta
        </h2>
        <p className="mt-2 text-base text-[#60646c] font-normal leading-relaxed tracking-[-0.01em]">
          Toque nos cartões abaixo para conferir os valores que caíram de volta no caixa de quem auditou os extratos com o ConfereAI.
        </p>
      </div>

      {/* Accordion Horizontal de Cards Colapsáveis com 12px de raio */}
      <div className="flex flex-col md:flex-row gap-3 min-h-[480px] md:h-[370px] w-full">
        {cards.map((card) => {
          const isActive = activeId === card.id;

          return (
            <motion.div
              key={card.id}
              onClick={() => setActiveId(card.id)}
              onMouseEnter={() => setActiveId(card.id)}
              className={cn(
                "relative rounded-[12px] border transition-all duration-300 cursor-pointer overflow-hidden",
                isActive
                  ? "flex-[4] p-6 sm:p-7 bg-[#ffffff] border-[#000000] flex flex-col justify-between"
                  : "flex-none h-14 md:h-auto md:flex-1 bg-[#ffffff] hover:bg-[#f3f3f7] border-[#b9bbc6]"
              )}
            >
              {isActive ? (
                /* =========================================================================
                   CARD ATIVO EXPANDIDO
                   ========================================================================= */
                <>
                  {/* Topo do Card com Logo da Plataforma */}
                  <div className="relative z-10 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[-0.01em] px-2.5 py-1 rounded-[6px] bg-[#000000] text-white flex items-center gap-1.5 shrink-0">
                      {card.platform === "Mercado Livre" ? (
                        <MercadoLivreLogo className="w-3.5 h-3.5" />
                      ) : (
                        <ShopeeLogo className="w-3.5 h-3.5" />
                      )}
                      <span>{card.platform}</span>
                    </span>

                    <span className="text-[11px] font-semibold text-[#000000] bg-[#f3f3f7] px-2.5 py-1 rounded-[6px] border border-[#b9bbc6] flex items-center gap-1 shrink-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ff5900]" />
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
                      <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c] block">
                        {card.niche}: {card.divergenceType}
                      </span>
                      <div className="text-2xl sm:text-4xl font-semibold tracking-[-0.025em] mt-1 text-[#000000]">
                        +{card.recoveredAmount}
                      </div>
                      <p className="mt-3 text-xs sm:text-sm text-[#60646c] leading-relaxed font-normal bg-[#f3f3f7] p-3.5 rounded-[12px] border border-[#b9bbc6]">
                        “{card.quote}”
                      </p>
                    </motion.div>
                  </div>

                  {/* Rodapé do Card */}
                  <div className="relative z-10 flex items-center justify-between text-xs pt-3 border-t border-[#b9bbc6]">
                    <span className="text-[#60646c] text-[11px] tracking-[-0.01em]">
                      <strong className="text-[#000000]">{card.ordersCount} pedidos</strong> estornados, {card.timeframe}
                    </span>
                    <span className="text-[11px] font-semibold uppercase tracking-[-0.01em] text-[#000000] flex items-center gap-1 shrink-0">
                      Comprovado <ArrowUpRight className="w-3.5 h-3.5 text-[#ff5900]" />
                    </span>
                  </div>
                </>
              ) : (
                /* =========================================================================
                   CARD COLAPSADO / FECHADO
                   ========================================================================= */
                <>
                  {/* Visão Mobile: Barra horizontal limpa */}
                  <div className="md:hidden relative z-10 flex items-center justify-between h-full px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6] p-0.5 flex items-center justify-center shrink-0">
                        {card.platform === "Mercado Livre" ? (
                          <MercadoLivreLogo className="w-full h-full" />
                        ) : (
                          <ShopeeLogo className="w-full h-full" />
                        )}
                      </div>
                      <span className="font-medium text-xs text-[#000000] truncate max-w-[150px]">
                        {card.niche}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-[#000000]">
                        {card.recoveredAmount}
                      </span>
                      <span className="text-[10px] text-[#000000] bg-[#f3f3f7] px-2 py-0.5 rounded-[6px] border border-[#b9bbc6]">
                        Ver
                      </span>
                    </div>
                  </div>

                  {/* Visão Desktop: Coluna vertical */}
                  <div className="hidden md:flex relative z-10 flex-col items-center justify-between h-full py-5 px-1 text-center">
                    {/* Topo: Logo Oficial */}
                    <div className="w-9 h-9 rounded-[6px] bg-[#ffffff] border border-[#b9bbc6] p-1 flex items-center justify-center shrink-0">
                      {card.platform === "Mercado Livre" ? (
                        <MercadoLivreLogo className="w-full h-full" />
                      ) : (
                        <ShopeeLogo className="w-full h-full" />
                      )}
                    </div>

                    {/* Centro: Nome do Nicho */}
                    <div className="my-auto py-2 flex items-center justify-center overflow-hidden max-h-[200px]">
                      <span className="[writing-mode:vertical-rl] rotate-180 text-xs uppercase font-medium tracking-[-0.01em] text-[#60646c] select-none whitespace-nowrap">
                        {card.niche}
                      </span>
                    </div>

                    {/* Rodapé: Valor do Estorno */}
                    <div className="w-full px-2 pt-2 border-t border-[#b9bbc6] shrink-0">
                      <span className="text-[11px] font-semibold text-[#000000] bg-[#f3f3f7] border border-[#b9bbc6] px-2 py-1 rounded-[6px] block truncate">
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
