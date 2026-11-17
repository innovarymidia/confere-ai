"use client";
import * as React from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Plan {
  id: string;
  name: string;
  tagline: string;
  /** Preço por mês na cobrança mensal */
  monthly: number;
  /** Preço por mês na cobrança anual */
  yearly: number;
  features: string[];
  popular?: boolean;
  cta?: string;
}

export interface PricingPlanTiltProps {
  plans?: Plan[];
  currency?: string;
  title?: string;
  subtitle?: string;
  /** ID do plano que começa selecionado */
  defaultPlanId?: string;
  onSelect?: (planId: string, billing: "monthly" | "yearly") => void;
  className?: string;
}

/** Dígitos rolam para cima ou para baixo quando o número muda */
function Roll({ value, dir }: { value: number; dir: 1 | -1 }) {
  const reduce = useReducedMotion();
  return (
    <span className="inline-flex tabular-nums" aria-label={String(value)}>
      {String(value)
        .split("")
        .map((d, i, a) => (
          <span
            key={a.length - i}
            className="relative inline-block h-[1.1em] overflow-hidden"
            aria-hidden
          >
            <AnimatePresence mode="popLayout" initial={false} custom={dir}>
              <motion.span
                key={d}
                className="inline-block"
                initial={{ y: reduce ? 0 : `${dir * 110}%`, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: reduce ? 0 : `${-dir * 110}%`, opacity: 0 }}
                transition={{
                  type: "spring",
                  stiffness: 260,
                  damping: 22,
                  delay: i * 0.04,
                }}
              >
                {d}
              </motion.span>
            </AnimatePresence>
          </span>
        ))}
    </span>
  );
}

function PlanCard({
  plan,
  billing,
  dir,
  currency,
  selected,
  dim,
  onPick,
}: {
  plan: Plan;
  billing: "monthly" | "yearly";
  dir: 1 | -1;
  currency: string;
  selected: boolean;
  dim: boolean;
  onPick: () => void;
}) {
  const reduce = useReducedMotion();
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const rx = useSpring(useTransform(my, [0, 1], [11, -11]), {
    stiffness: 160,
    damping: 14,
  });
  const ry = useSpring(useTransform(mx, [0, 1], [-13, 13]), {
    stiffness: 160,
    damping: 14,
  });
  const lift = useSpring(0, { stiffness: 200, damping: 16 });
  const price = billing === "yearly" ? plan.yearly : plan.monthly;

  return (
    <motion.li
      className="relative list-none"
      style={{ perspective: 900 }}
      onPointerMove={(e) => {
        if (e.pointerType === "touch") return;
        const b = e.currentTarget.getBoundingClientRect();
        mx.set((e.clientX - b.left) / b.width);
        my.set((e.clientY - b.top) / b.height);
        lift.set(40);
      }}
      onPointerLeave={() => {
        mx.set(0.5);
        my.set(0.5);
        lift.set(0);
      }}
      animate={{ opacity: dim ? 0.75 : 1, scale: dim ? 0.98 : 1 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        onClick={onPick}
        style={{
          rotateX: reduce ? 0 : rx,
          rotateY: reduce ? 0 : ry,
          z: reduce ? 0 : lift,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-[6px] border bg-white p-6 text-[#171717] shadow-subtle transition-colors cursor-pointer",
          selected
            ? "border-[#171717] ring-1 ring-[#171717]"
            : plan.popular
              ? "border-[#171717]/40 shadow-subtle"
              : "border-[#ebebeb]"
        )}
      >
        {plan.popular && (
          <span
            className="absolute top-3 right-4 z-10 inline-flex items-center gap-1 font-mono text-[11px] uppercase tracking-[0.071em] px-2 py-0.5 rounded-[4px] bg-[#171717] text-white shadow-subtle"
          >
            <Sparkles className="size-3 text-white/80" aria-hidden /> Mais Escolhido
          </span>
        )}

        <div className="relative z-10">
          <h3 className="text-base font-medium text-[#171717] tracking-tight">
            {plan.name}
          </h3>
          <p className="mt-1 text-xs text-[#666666] font-normal">{plan.tagline}</p>
          <p className="mt-4 flex items-baseline gap-1">
            <span className="font-mono text-xs text-[#666666]">{currency}</span>
            <span className="font-mono text-3xl sm:text-4xl font-normal tracking-tight text-[#171717]">
              <Roll value={price} dir={dir} />
            </span>
            <span className="ml-1 font-mono text-xs text-[#666666]">/ mês</span>
          </p>
          <p className="mt-1 h-4 font-mono text-[11px] text-[#8f8f8f]">
            {billing === "yearly" && plan.monthly > 0
              ? `Cobrado ${currency}${plan.yearly * 12} ao ano (20% OFF)`
              : billing === "monthly" && plan.monthly > 0
                ? "Cobrança mensal no Pix ou Cartão"
                : "Sem custo de assinatura"}
          </p>
        </div>

        <ul className="relative z-10 mt-6 flex-1 space-y-2.5 text-xs text-[#4d4d4d] font-normal">
          {plan.features.map((f, i) => (
            <motion.li
              key={f}
              className="flex items-start gap-2.5"
              initial={{ opacity: 0, x: reduce ? 0 : -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <span className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full bg-[#fafafa] border border-[#ebebeb] text-[#171717]">
                <Check className="size-2.5 stroke-[2.5]" aria-hidden />
              </span>
              <span className="leading-tight">{f}</span>
            </motion.li>
          ))}
        </ul>

        <motion.button
          type="button"
          onClick={onPick}
          aria-pressed={selected}
          whileTap={reduce ? undefined : { scale: 0.98 }}
          className={cn(
            "relative mt-6 inline-flex min-h-10 w-full items-center justify-center gap-1.5 rounded-[6px] text-xs font-medium uppercase tracking-wider transition-all outline-none cursor-pointer",
            selected
              ? "bg-[#171717] hover:bg-[#000000] text-white shadow-subtle"
              : "border border-[#ebebeb] bg-white text-[#171717] hover:bg-[#fafafa] hover:border-[#171717]"
          )}
        >
          <span className="relative z-10 inline-flex items-center gap-1.5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={selected ? "s" : "n"}
                className="inline-flex items-center gap-1.5"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.15 }}
              >
                {selected && (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <motion.path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.05, duration: 0.2 }}
                    />
                  </svg>
                )}
                {selected ? "Plano Selecionado" : plan.cta ?? "Escolher Plano"}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>
      </motion.div>
    </motion.li>
  );
}

const DEFAULT_CONFERE_PLANS: Plan[] = [
  {
    id: "free",
    name: "Starter Grátis",
    tagline: "Para validar na hora",
    monthly: 0,
    yearly: 0,
    features: [
      "Conferência gratuita de 1 extrato",
      "Diagnóstico do valor total a recuperar",
      "2 pedidos abertos para conferência",
      "100% Seguro e Privado",
    ],
    cta: "Conferir Grátis",
  },
  {
    id: "pro",
    name: "Pro Seller",
    tagline: "O plano mais escolhido por lojistas",
    monthly: 67,
    yearly: 54,
    popular: true,
    features: [
      "Conferências ilimitadas de Mercado Livre e Shopee",
      "100% dos pedidos e produtos liberados",
      "Mensagens prontas para enviar ao suporte",
      "Filtros de frete e tarifas oficiais 2026",
      "Acompanhe cada valor devolvido ao caixa",
      "Liberação imediata no Pix",
    ],
    cta: "Liberar Tudo (R$ 67)",
  },
  {
    id: "escala",
    name: "Operação Escala",
    tagline: "Para quem tem múltiplas contas",
    monthly: 147,
    yearly: 118,
    features: [
      "Tudo incluído no plano Pro Seller",
      "Até 5 contas ou lojas conferidas",
      "Exportação em planilha para controle financeiro",
      "Comparativo de frete e peso cobrado",
      "Canal prioritário de suporte no WhatsApp",
    ],
    cta: "Assinar Operação Escala",
  },
];

export function PricingPlanTilt({
  plans = DEFAULT_CONFERE_PLANS,
  currency = "R$",
  title = "Planos Transparentes para o Seu Negócio",
  subtitle = "Você só paga se tiver dinheiro para recuperar. Cancele com 1 clique quando quiser.",
  defaultPlanId = "pro",
  onSelect,
  className,
}: PricingPlanTiltProps) {
  const reduce = useReducedMotion();
  const uid = React.useId();
  const [billing, setBilling] = React.useState<"monthly" | "yearly">("monthly");
  const [dir, setDir] = React.useState<1 | -1>(1);
  const [sel, setSel] = React.useState<string | null>(defaultPlanId ?? null);

  const choose = (b: "monthly" | "yearly") => {
    if (b === billing) return;
    setDir(b === "yearly" ? -1 : 1);
    setBilling(b);
  };

  const opts: { id: "monthly" | "yearly"; label: string }[] = [
    { id: "monthly", label: "Mensal" },
    { id: "yearly", label: "Anual" },
  ];

  const key = (e: React.KeyboardEvent) => {
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) {
      e.preventDefault();
      choose(billing === "monthly" ? "yearly" : "monthly");
    }
  };

  return (
    <section aria-label={title} className={cn("relative w-full max-w-5xl mx-auto", className)}>
      <div className="relative text-center max-w-2xl mx-auto">
        <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
          Investimento Transparente
        </span>
        <h2 className="text-2xl sm:text-4xl font-normal text-[#171717] tracking-[-0.05em] mt-2">
          {title}
        </h2>
        <p className="mt-2 text-sm text-[#4d4d4d] font-normal leading-relaxed">{subtitle}</p>

        {/* Toggle Mensal / Anual */}
        <div className="mt-6 inline-flex items-center gap-3">
          <div
            role="radiogroup"
            aria-labelledby={`${uid}-b`}
            onKeyDown={key}
            className="relative inline-grid grid-cols-2 rounded-full border border-[#ebebeb] bg-white p-1 shadow-subtle-2"
          >
            <span id={`${uid}-b`} className="sr-only">
              Período de cobrança
            </span>
            {opts.map((o) => (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={billing === o.id}
                tabIndex={billing === o.id ? 0 : -1}
                onClick={() => choose(o.id)}
                className={cn(
                  "relative min-h-9 min-w-24 rounded-full px-4 font-mono text-[11px] uppercase tracking-[0.071em] outline-none transition-colors cursor-pointer",
                  billing === o.id
                    ? "text-white"
                    : "text-[#666666] hover:text-[#171717]"
                )}
              >
                {billing === o.id && (
                  <motion.span
                    layoutId="bill-pill"
                    className="absolute inset-0 rounded-full bg-[#171717]"
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 380, damping: 20 }
                    }
                  />
                )}
                <span className="relative z-10">{o.label}</span>
              </button>
            ))}
          </div>

          <span
            className="rounded-full px-2.5 py-0.5 font-mono text-[11px] uppercase tracking-[0.071em] text-[#297a3a] bg-[#297a3a]/10 border border-[#297a3a]/20"
          >
            Economize 20%
          </span>
        </div>
      </div>

      {/* Grid com os 3 cards 3D tilt */}
      <ul className="relative mt-10 grid items-stretch gap-6 grid-cols-1 md:grid-cols-3">
        {plans.map((p) => (
          <PlanCard
            key={p.id}
            plan={p}
            billing={billing}
            dir={dir}
            currency={currency}
            selected={sel === p.id}
            dim={!!sel && sel !== p.id}
            onPick={() => {
              setSel(p.id);
              onSelect?.(p.id, billing);
            }}
          />
        ))}
      </ul>
    </section>
  );
}

export default PricingPlanTilt;
