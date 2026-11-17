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
import { ConfereAiLogo } from "../components/ui/marketplace-logos";

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
    <div className="min-h-screen bg-[#fafafa] text-[#171717]">
      {/* 1. Liquid Glass Navbar */}
      <LiquidGlassNavbar onAuditClick={scrollToDropzone} />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 space-y-20 sm:space-y-28">
        {/* 2. Marketplace Product Hero */}
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
        <section id="vazamentos" className="pt-4">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
              Auditoria de Precisão
            </span>
            <h2 className="text-2xl sm:text-4xl font-normal text-[#171717] tracking-[-0.05em] mt-2">
              Onde o lojista perde de 2% a 7% do lucro sem ver?
            </h2>
            <p className="text-sm text-[#4d4d4d] mt-2 font-normal leading-relaxed">
              Os sistemas de gestão mostram quanto você faturou, mas nenhum confere se o marketplace descontou a comissão e o frete corretos na hora de pagar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white rounded-[6px] p-6 border border-[#ebebeb] shadow-subtle flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-[6px] bg-[#fafafa] border border-[#ebebeb] text-[#171717] flex items-center justify-center mb-4">
                  <Package className="w-4 h-4 text-[#171717]" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
                  Vazamento 01
                </span>
                <h3 className="text-base font-medium text-[#171717] mt-2 tracking-tight">
                  Erro de Peso e Medida no Frete
                </h3>
                <p className="text-xs text-[#4d4d4d] mt-2 leading-relaxed font-normal">
                  Nos centros de triagem e envio, produtos pequenos são pesados com pressa e registrados com peso muito acima do real, cobrando frete de 3 kg num produto de 300g. O ConfereAI cruza com o frete padrão do seu anúncio e identifica quando você pagou a mais.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[6px] p-6 border border-[#ebebeb] shadow-subtle flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-[6px] bg-[#fafafa] border border-[#ebebeb] text-[#171717] flex items-center justify-center mb-4">
                  <Percent className="w-4 h-4 text-[#171717]" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
                  Vazamento 02
                </span>
                <h3 className="text-base font-medium text-[#171717] mt-2 tracking-tight">
                  Comissão e Tarifas Fora da Tabela 2026
                </h3>
                <p className="text-xs text-[#4d4d4d] mt-2 leading-relaxed font-normal">
                  Com as mudanças de tabelas na Shopee e no Mercado Livre, pequenas variações no preço de venda fazem a plataforma cobrar comissão acima da alíquota correta ou aplicar tarifa fixa duplicada sem você notar.
                </p>
              </div>
            </div>

            <div className="bg-white rounded-[6px] p-6 border border-[#ebebeb] shadow-subtle flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded-[6px] bg-[#fafafa] border border-[#ebebeb] text-[#171717] flex items-center justify-center mb-4">
                  <RotateCcw className="w-4 h-4 text-[#171717]" />
                </div>
                <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
                  Vazamento 03
                </span>
                <h3 className="text-base font-medium text-[#171717] mt-2 tracking-tight">
                  Devoluções que Deixaram Prejuízo
                </h3>
                <p className="text-xs text-[#4d4d4d] mt-2 leading-relaxed font-normal">
                  Vendas devolvidas por arrependimento do comprador que terminaram com saldo negativo no seu extrato devido à cobrança indevida de frete reverso ou falta de estorno integral da comissão pelo marketplace.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Cue Collapsing Cards Accordion */}
        <CueCollapsingCardsAccordion />

        {/* 5. Tabela de Preços Dinâmica */}
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
        <section className="bg-white rounded-[6px] p-8 sm:p-12 border border-[#ebebeb] shadow-subtle text-center mb-16">
          <span className="font-mono text-[11px] uppercase tracking-[0.071em] text-[#666666]">
            Diagnóstico Imediato
          </span>
          <h2 className="text-2xl sm:text-3xl font-normal text-[#171717] tracking-[-0.05em] mt-2">
            Pronto para recuperar o que é seu por direito?
          </h2>
          <p className="text-sm text-[#4d4d4d] max-w-xl mx-auto mt-2 leading-relaxed font-normal">
            O diagnóstico gratuito roda em 10 segundos no seu navegador. Veja o número exato das cobranças a maior e comprove na sua conta antes de pagar qualquer valor.
          </p>

          <button
            type="button"
            onClick={scrollToDropzone}
            className="mt-6 py-3 px-8 w-full sm:w-auto rounded-[6px] bg-[#171717] hover:bg-[#000000] text-white font-medium text-sm transition-all cursor-pointer shadow-subtle"
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
      <footer className="border-t border-[#ebebeb] py-10 px-4 text-center text-xs text-[#666666] bg-[#fafafa]">
        <ConfereAiLogo className="h-7 w-auto mx-auto mb-3" />
        <p className="font-medium text-[#171717]">
          ConfereAI: Auditoria Financeira Independente para Vendedores de E-commerce
        </p>
        <p className="font-mono text-[11px] text-[#8f8f8f] mt-1.5">
          Não possuímos vínculo societário direto com Mercado Livre ou Shopee.
        </p>
      </footer>
    </div>
  );
}
