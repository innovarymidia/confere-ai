"use client";
import * as React from "react";
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
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

// Cores do ConfereAI: Indigo elétrico (#4f46e5) e Violeta (#7c3aed)
const PRIMARY_COLOR = "#4f46e5";
const ACCENT_COLOR = "#7c3aed";
const GRADIENT = `linear-gradient(125deg, ${PRIMARY_COLOR}, ${ACCENT_COLOR})`;
const BADGE_GRADIENT = `linear-gradient(120deg, ${PRIMARY_COLOR}, #6366f1)`;

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
  const gx = useTransform(mx, (v) => `${v * 100}%`);
  const gy = useTransform(my, (v) => `${v * 100}%`);
  const glare = useMotionTemplate`radial-gradient(180px circle at ${gx} ${gy}, rgba(255,255,255,0.45), transparent 60%)`;
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
        style={{
          rotateX: reduce ? 0 : rx,
          rotateY: reduce ? 0 : ry,
          z: reduce ? 0 : lift,
          transformStyle: "preserve-3d",
        }}
        className={cn(
          "relative flex h-full flex-col overflow-hidden rounded-3xl border bg-white p-6 text-slate-900 shadow-soft transition-colors",
          selected
            ? "border-transparent ring-2 ring-indigo-600"
            : plan.popular
            ? "border-indigo-300/80 shadow-soft-lg"
            : "border-slate-200/90"
        )}
      >
        {/* Luz de corrida no plano popular e anel constante no selecionado */}
        {(plan.popular || selected) && (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl"
          >
            <motion.span
              className="absolute left-1/2 top-1/2 aspect-square w-[250%] -translate-x-1/2 -translate-y-1/2"
              style={{
                background: `conic-gradient(from 0deg, transparent 0 60%, ${ACCENT_COLOR}, ${PRIMARY_COLOR}, transparent)`,
                opacity: selected ? 0.95 : 0.5,
              }}
              animate={reduce ? undefined : { rotate: 360 }}
              transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
            />
            <span className="absolute inset-[2px] rounded-[22px] bg-white" />
          </span>
        )}

        {!reduce && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute inset-0 rounded-3xl mix-blend-soft-light"
            style={{ background: glare }}
          />
        )}

        {plan.popular && (
          <motion.span
            style={{ transform: "translateZ(50px)", background: GRADIENT }}
            animate={reduce ? undefined : { y: [0, -3, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-0 right-4 z-10 inline-flex items-center gap-1.5 rounded-b-xl px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-md"
          >
            <Sparkles className="size-3.5 fill-white/20" aria-hidden /> Mais Escolhido
          </motion.span>
        )}

        <div className="relative z-10" style={{ transform: "translateZ(30px)" }}>
          <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
            {plan.name}
          </h3>
          <p className="mt-1 text-xs text-slate-500 font-medium">{plan.tagline}</p>
          <p
            className="mt-5 flex items-baseline gap-1"
            style={{ transform: "translateZ(24px)" }}
          >
            <span className="text-lg font-bold text-slate-400">{currency}</span>
            <span className="text-4xl sm:text-5xl font-black tracking-tight text-slate-900">
              <Roll value={price} dir={dir} />
            </span>
            <span className="ml-1 text-xs font-semibold text-slate-500">/ mês</span>
          </p>
          <p className="mt-1.5 h-4 text-[11px] font-bold text-slate-400">
            {billing === "yearly" && plan.monthly > 0
              ? `Cobrado ${currency}${plan.yearly * 12} ao ano (20% OFF)`
              : billing === "monthly" && plan.monthly > 0
              ? "Cobrança mensal no Pix/Cartão"
              : "Sem custo de assinatura"}
          </p>
        </div>

        <ul
          className="relative z-10 mt-6 flex-1 space-y-2.5 text-xs text-slate-600 font-medium"
          style={{ transform: "translateZ(14px)" }}
        >
          {plan.features.map((f, i) => (
            <motion.li
              key={f}
              className="flex items-start gap-2.5"
              initial={{ opacity: 0, x: reduce ? 0 : -8 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.15 + i * 0.05 }}
            >
              <span
                className="mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-white shadow-xs"
                style={{ background: GRADIENT }}
              >
                <Check className="size-2.5 stroke-[3.5]" aria-hidden />
              </span>
              <span className="leading-tight">{f}</span>
            </motion.li>
          ))}
        </ul>

        <motion.button
          type="button"
          onClick={onPick}
          aria-pressed={selected}
          whileTap={reduce ? undefined : { scale: 0.95 }}
          whileHover={reduce ? undefined : { y: -2 }}
          style={{ transform: "translateZ(36px)" }}
          className={cn(
            "relative mt-6 inline-flex min-h-12 w-full items-center justify-center gap-1.5 overflow-hidden rounded-2xl text-xs font-extrabold uppercase tracking-wider transition-all outline-none cursor-pointer",
            selected
              ? "text-white shadow-glow-violet"
              : "border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 hover:border-indigo-300"
          )}
        >
          {selected && (
            <motion.span
              layoutId="plan-cta"
              className="absolute inset-0"
              style={{ background: GRADIENT }}
              transition={{ type: "spring", stiffness: 300, damping: 24 }}
            />
          )}
          <span className="relative z-10 inline-flex items-center gap-1.5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={selected ? "s" : "n"}
                className="inline-flex items-center gap-1.5"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.15 }}
              >
                {selected && (
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    <motion.path
                      d="M5 12.5l4.5 4.5L19 7.5"
                      initial={{ pathLength: 0 }}
                      animate={{ pathLength: 1 }}
                      transition={{ delay: 0.1, duration: 0.3 }}
                    />
                  </svg>
                )}
                {selected ? "Plano Selecionado" : plan.cta ?? "Escolher Plano"}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.button>
      </motion.div>

      {selected && !reduce && (
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 rounded-3xl blur-2xl"
          style={{ background: GRADIENT }}
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.25, 0.45, 0.25] }}
          transition={{ duration: 2.4, repeat: Infinity }}
        />
      )}
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
        <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-600 font-medium">{subtitle}</p>

        {/* Toggle Mensal / Anual */}
        <div className="mt-6 inline-flex items-center gap-3">
          <div
            role="radiogroup"
            aria-labelledby={`${uid}-b`}
            onKeyDown={key}
            className="relative inline-grid grid-cols-2 rounded-full border border-slate-200 bg-white p-1 shadow-xs"
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
                  "relative min-h-10 min-w-24 rounded-full px-4 text-xs font-bold uppercase tracking-wider outline-none transition-colors cursor-pointer",
                  billing === o.id
                    ? "text-white"
                    : "text-slate-500 hover:text-slate-900"
                )}
              >
                {billing === o.id && (
                  <motion.span
                    layoutId="bill-pill"
                    className="absolute inset-0 rounded-full"
                    style={{ background: GRADIENT }}
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

          <motion.span
            animate={
              reduce
                ? undefined
                : billing === "yearly"
                ? { scale: [1, 1.15, 1], rotate: [0, -4, 0] }
                : { scale: 1 }
            }
            key={billing}
            transition={{ duration: 0.5 }}
            className="rounded-full px-3 py-1 text-xs font-black uppercase tracking-wider text-white shadow-xs"
            style={{ background: BADGE_GRADIENT }}
          >
            Economize 20%
          </motion.span>
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
