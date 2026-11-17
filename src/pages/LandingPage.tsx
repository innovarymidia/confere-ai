import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Percent,
  RotateCcw,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  runMarketplaceAuditAndSave,
  buildSampleCsvFile,
  type MarketplacePlatform,
} from "../services/auditEngine";
import { LiquidGlassNavbar } from "../components/ui/liquid-glass-navbar";
import { MarketplaceProductHero } from "../components/ui/marketplace-product-hero";
import { CueCollapsingCardsAccordion } from "../components/ui/cue-collapsing-cards-accordion";
import { PricingPlanTilt } from "../components/ui/pricing-plan-tilt";
import { CheckoutModal } from "../components/ui/checkout-modal";

export function LandingPage() {
  const navigate = useNavigate();
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [platform, setPlatform] = useState<MarketplacePlatform>("mercadolivre");
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<"pro" | "escala">("pro");
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "yearly">("monthly");

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setLoadingStep("Lendo seu extrato de vendas e pedidos...");

    try {
      const timer1 = setTimeout(() => {
        setLoadingStep("Comparando o frete cobrado em cada produto...");
      }, 450);
      const timer2 = setTimeout(() => {
        setLoadingStep("Localizando cobranças indevidas e valores a recuperar...");
      }, 900);

      const result = await runMarketplaceAuditAndSave(file, platform, supabase);

      clearTimeout(timer1);
      clearTimeout(timer2);
      navigate(`/resultado/${result.auditId}`);
    } catch (err) {
      setLoadingStep(null);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível ler a planilha. Envie o extrato oficial baixado diretamente do painel do Mercado Livre ou Shopee."
      );
    }
  };

  const handleRunSampleAudit = () => {
    const sampleFile = buildSampleCsvFile(platform);
    processFile(sampleFile);
  };

  const scrollToDropzone = () => {
    const el = document.getElementById("auditoria");
    el?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-800">
      {/* 1. Liquid Glass Navbar (Inspirado no @gughigug/liquid-glass-navbar) */}
      <LiquidGlassNavbar onAuditClick={scrollToDropzone} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 space-y-16 sm:space-y-24">
        {/* 2. Sneaker-Inspired Product Hero (Inspirado no @kedhareswer/sneaker-product-hero) */}
        <div ref={dropzoneRef}>
          <MarketplaceProductHero
            platform={platform}
            onPlatformChange={setPlatform}
            onFileSelect={processFile}
            onRunSample={handleRunSampleAudit}
            loadingStep={loadingStep}
            errorMsg={errorMsg}
          />
        </div>

        {/* 3. Os 3 Vazamentos Silenciosos de Lucro */}
        <section id="vazamentos" className="pt-6">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[11px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
              Auditoria Cirúrgica
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight mt-3">
              Onde o lojista perde de 2% a 7% do lucro sem ver?
            </h2>
            <p className="text-sm text-slate-600 mt-2 font-medium">
              Os sistemas de gestão mostram quanto você faturou, mas nenhum confere se o marketplace descontou a comissão e o frete corretos na hora de pagar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-4 border border-amber-200/60">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                Vazamento 01
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-3">
                Erro de Peso e Medida no Frete
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                Nos centros de triagem e envio, produtos pequenos são pesados com pressa e registrados com peso muito acima do real, cobrando frete de 3 kg num produto de 300g. O ConfereAI cruza com o frete padrão do seu anúncio e identifica quando você pagou a mais.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft">
              <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold mb-4 border border-indigo-200/60">
                <Percent className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                Vazamento 02
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-3">
                Comissão e Tarifas Fora da Tabela 2026
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                Com as mudanças de tabelas na Shopee e no Mercado Livre, pequenas variações no preço de venda fazem a plataforma cobrar comissão acima da alíquota correta ou aplicar tarifa fixa duplicada sem você notar.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-soft">
              <div className="w-10 h-10 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold mb-4 border border-rose-200/60">
                <RotateCcw className="w-5 h-5 text-rose-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full">
                Vazamento 03
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-3">
                Devoluções que Deixaram Prejuízo
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed font-medium">
                Vendas devolvidas por arrependimento do comprador que terminaram com saldo negativo no seu extrato devido à cobrança indevida de frete reverso ou falta de estorno integral da comissão pelo marketplace.
              </p>
            </div>
          </div>
        </section>

        {/* 4. Cue Collapsing Cards Accordion (Inspirado no @aloksivastava1025/cue-collapsing-cards-accordion) */}
        <CueCollapsingCardsAccordion />

        {/* 5. Tabela de Preços Dinâmica 3D Tilt (PricingPlanTilt) */}
        <section id="planos">
          <PricingPlanTilt
            title="Escolha o Plano Ideal para a Sua Operação"
            subtitle="Você só paga se encontrar dinheiro para recuperar. Cancele com 1 clique quando quiser."
            onSelect={(planId, billing) => {
              if (planId === "free") {
                scrollToDropzone();
              } else {
                setSelectedPlanId(planId as "pro" | "escala");
                setSelectedBilling(billing);
                setIsCheckoutOpen(true);
              }
            }}
          />
        </section>

        {/* 6. CTA Final de Conversão */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-soft text-center mb-16">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Pronto para recuperar o que é seu por direito?
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mt-2 leading-relaxed font-medium">
            O diagnóstico gratuito roda em 10 segundos no seu navegador. Veja o número exato das cobranças a maior e comprove na sua conta antes de pagar qualquer valor.
          </p>

          <button
            type="button"
            onClick={scrollToDropzone}
            className="mt-6 py-3.5 sm:py-4 px-6 sm:px-8 w-full sm:w-auto rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs sm:text-sm uppercase tracking-wider shadow-md transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            Auditar Minha Planilha Agora (Grátis)
          </button>
        </section>
      </main>

      {/* Modal de Checkout Pix Transparente com Escolha de Plano e Ciclo */}
      <CheckoutModal
        key={`${isCheckoutOpen}-${selectedPlanId}-${selectedBilling}`}
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        initialPlanId={selectedPlanId}
        initialBilling={selectedBilling}
        onSuccess={() => {
          navigate("/historico");
        }}
      />

      {/* Rodapé Corporativo B2B */}
      <footer className="border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500">
        <p className="font-bold text-slate-700">
          ConfereAI | Auditoria Financeira Independente para Vendedores de E-commerce
        </p>
        <p className="mt-1">
          Não possuímos vínculo societário direto com Mercado Livre ou Shopee.
        </p>
      </footer>
    </div>
  );
}
