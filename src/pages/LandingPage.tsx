import { useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import {
  Package,
  Percent,
  RotateCcw,
  ArrowRight,
  ShieldCheck,
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
import { PrivacyModal } from "../components/ui/privacy-modal";
import { ConfereAiLogo } from "../components/ui/marketplace-logos";

export function LandingPage() {
  const navigate = useNavigate();
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [platform, setPlatform] = useState<MarketplacePlatform>("mercadolivre");
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<"pro" | "escala">("pro");
  const [selectedBilling, setSelectedBilling] = useState<"monthly" | "yearly">(
    "monthly"
  );

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setLoadingStep("Lendo seu extrato de vendas e pedidos...");

    try {
      const timer1 = setTimeout(() => {
        setLoadingStep("Comparando o frete cobrado em cada produto...");
      }, 450);
      const timer2 = setTimeout(() => {
        setLoadingStep(
          "Localizando cobranças indevidas e valores a recuperar..."
        );
      }, 900);

      const result = await runMarketplaceAuditAndSave(
        file,
        platform,
        supabase
      );

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
    // No mobile e desktop, rola prioritariamente para o card/dropzone de upload
    const dropzoneInput = document.getElementById("extrato-dropzone");
    if (dropzoneInput) {
      dropzoneInput.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (dropzoneRef.current) {
      dropzoneRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const el = document.getElementById("auditoria");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div className="min-h-screen bg-[#ffffff] text-[#000000]">
      {/* 1. Navbar com Announcement Bar Carbon */}
      <LiquidGlassNavbar onAuditClick={scrollToDropzone} />

      <main className="space-y-16 sm:space-y-24">
        {/* 2. Hero Section */}
        <div ref={dropzoneRef} className="px-4 sm:px-6">
          <MarketplaceProductHero
            platform={platform}
            onPlatformChange={setPlatform}
            onFileSelect={processFile}
            onRunSample={handleRunSampleAudit}
            loadingStep={loadingStep}
            errorMsg={errorMsg}
          />
        </div>

        {/* 3. Faixa de Prova Social e Segurança (Fog #f3f3f7) */}
        <section
          aria-label="Segurança e Confiabilidade"
          className="w-full bg-[#f3f3f7] border-y border-[#b9bbc6] py-12 px-4 sm:px-6"
        >
          <div className="max-w-[1200px] mx-auto text-center">
            <span className="text-[12px] font-semibold uppercase tracking-[-0.01em] text-[#60646c]">
              Segurança e Confiabilidade
            </span>
            <h2 className="text-2xl sm:text-3xl font-semibold text-[#000000] tracking-[-0.02em] mt-1">
              Conferência 100% privada e independente
            </h2>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 text-left">
              <div className="bg-[#ffffff] p-6 rounded-[12px] border border-[#b9bbc6]">
                <div className="w-8 h-8 rounded-[6px] bg-[#f3f3f7] border border-[#b9bbc6] flex items-center justify-center text-[#ff5900] mb-3">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#000000] tracking-[-0.01em]">
                  Processamento Local
                </h3>
                <p className="text-xs text-[#60646c] mt-1 leading-relaxed">
                  Os dados do seu extrato são lidos localmente no seu
                  navegador. Suas informações comerciais continuam 100% sob seu
                  controle.
                </p>
              </div>

              <div className="bg-[#ffffff] p-6 rounded-[12px] border border-[#b9bbc6]">
                <div className="w-8 h-8 rounded-[6px] bg-[#f3f3f7] border border-[#b9bbc6] flex items-center justify-center text-[#ff5900] mb-3">
                  <Percent className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#000000] tracking-[-0.01em]">
                  Tabelas Oficiais 2026
                </h3>
                <p className="text-xs text-[#60646c] mt-1 leading-relaxed">
                  Cruza com as novas alíquotas de comissão e regras de frete por
                  peso e cubagem em vigor neste ano no Mercado Livre e Shopee.
                </p>
              </div>

              <div className="bg-[#ffffff] p-6 rounded-[12px] border border-[#b9bbc6]">
                <div className="w-8 h-8 rounded-[6px] bg-[#f3f3f7] border border-[#b9bbc6] flex items-center justify-center text-[#ff5900] mb-3">
                  <ArrowRight className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-[#000000] tracking-[-0.01em]">
                  Estorno Rápido no Suporte
                </h3>
                <p className="text-xs text-[#60646c] mt-1 leading-relaxed">
                  Gera textos prontos com o número do pedido e o valor da
                  divergência para você colar direto no chat e solicitar o
                  crédito.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Os 3 Vazamentos Silenciosos de Lucro */}
        <section
          id="vazamentos"
          aria-label="Vazamentos Comuns"
          className="max-w-[1200px] mx-auto px-4 sm:px-6 pt-4"
        >
          <div className="text-center max-w-2xl mx-auto mb-10">
            <span className="text-[12px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] bg-[#f3f3f7] border border-[#b9bbc6] px-2.5 py-1 rounded-[6px]">
              Auditoria de Precisão
            </span>
            <h2 className="text-2xl sm:text-4xl font-semibold text-[#000000] tracking-[-0.025em] mt-2">
              Onde o lojista perde de 2% a 7% do lucro sem ver?
            </h2>
            <p className="text-base text-[#60646c] mt-2 font-normal leading-relaxed tracking-[-0.01em]">
              Os sistemas de gestão mostram quanto você faturou, mas nenhum
              confere se o marketplace descontou a comissão e o frete corretos
              na hora de pagar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-[#ffffff] rounded-[12px] p-6 sm:p-7 border border-[#b9bbc6] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] text-[#000000] flex items-center justify-center mb-4">
                  <Package className="w-5 h-5 text-[#ff5900]" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] bg-[#f3f3f7] border border-[#b9bbc6] px-2 py-0.5 rounded-[6px]">
                  Vazamento 01
                </span>
                <h3 className="text-lg font-semibold text-[#000000] mt-3 tracking-[-0.01em]">
                  Erro de Peso e Medida no Frete
                </h3>
                <p className="text-xs sm:text-sm text-[#60646c] mt-2 leading-relaxed font-normal tracking-[-0.01em]">
                  Nos centros de triagem e envio, produtos pequenos são pesados
                  com pressa e registrados com peso muito acima do real, cobrando
                  frete de 3 kg num produto de 300g. O ConfereAI cruza com o
                  frete padrão do seu anúncio e identifica quando você pagou a
                  mais.
                </p>
              </div>
            </div>

            <div className="bg-[#ffffff] rounded-[12px] p-6 sm:p-7 border border-[#b9bbc6] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] text-[#000000] flex items-center justify-center mb-4">
                  <Percent className="w-5 h-5 text-[#ff5900]" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] bg-[#f3f3f7] border border-[#b9bbc6] px-2 py-0.5 rounded-[6px]">
                  Vazamento 02
                </span>
                <h3 className="text-lg font-semibold text-[#000000] mt-3 tracking-[-0.01em]">
                  Comissão e Tarifas Fora da Tabela 2026
                </h3>
                <p className="text-xs sm:text-sm text-[#60646c] mt-2 leading-relaxed font-normal tracking-[-0.01em]">
                  Com as mudanças de tabelas na Shopee e no Mercado Livre,
                  pequenas variações no preço de venda fazem a plataforma cobrar
                  comissão acima da alíquota correta ou aplicar tarifa fixa
                  duplicada sem você notar.
                </p>
              </div>
            </div>

            <div className="bg-[#ffffff] rounded-[12px] p-6 sm:p-7 border border-[#b9bbc6] flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] text-[#000000] flex items-center justify-center mb-4">
                  <RotateCcw className="w-5 h-5 text-[#ff5900]" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] bg-[#f3f3f7] border border-[#b9bbc6] px-2 py-0.5 rounded-[6px]">
                  Vazamento 03
                </span>
                <h3 className="text-lg font-semibold text-[#000000] mt-3 tracking-[-0.01em]">
                  Devoluções que Deixaram Prejuízo
                </h3>
                <p className="text-xs sm:text-sm text-[#60646c] mt-2 leading-relaxed font-normal tracking-[-0.01em]">
                  Vendas devolvidas por arrependimento do comprador que
                  terminaram com saldo negativo no seu extrato devido à cobrança
                  indevida de frete reverso ou falta de estorno integral da
                  comissão pelo marketplace.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 5. Casos Reais */}
        <div className="px-4 sm:px-6">
          <CueCollapsingCardsAccordion />
        </div>

        {/* 6. Planos de Preço */}
        <section id="planos" className="px-4 sm:px-6">
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

        {/* 7. CTA Final de Conversão com Botão Ember */}
        <section className="max-w-[1200px] mx-auto px-4 sm:px-6 pb-6">
          <div className="bg-[#f3f3f7] rounded-[12px] p-8 sm:p-14 border border-[#b9bbc6] text-center">
            <span className="text-[12px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] bg-[#ffffff] border border-[#b9bbc6] px-2.5 py-1 rounded-[6px]">
              Diagnóstico Imediato
            </span>
            <h2 className="text-2xl sm:text-4xl font-semibold text-[#000000] tracking-[-0.025em] mt-3">
              Pronto para recuperar o que é seu por direito?
            </h2>
            <p className="text-sm sm:text-base text-[#60646c] max-w-xl mx-auto mt-2 leading-relaxed font-normal tracking-[-0.01em]">
              O diagnóstico gratuito roda em 10 segundos no seu navegador. Veja o
              número exato das cobranças a maior e comprove na sua conta antes de
              pagar qualquer valor.
            </p>

            <button
              type="button"
              onClick={scrollToDropzone}
              className="mt-7 py-3.5 px-8 w-full sm:w-auto rounded-[12px] bg-[#ff5900] hover:bg-[#e04f00] text-white font-semibold text-sm tracking-[-0.01em] transition-all cursor-pointer inline-flex items-center justify-center gap-2"
            >
              <span>Auditar Minha Planilha Agora (Grátis)</span>
              <ArrowRight className="w-4 h-4 text-white" />
            </button>
          </div>
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

      {/* 8. Full-Bleed Dark Footer Abyss (#000710) do DESIGN.md */}
      <footer className="w-full bg-[#000710] text-white py-14 sm:py-16 px-4 sm:px-6 mt-16 border-t border-[#15191e]">
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8 sm:gap-12 pb-12 border-b border-[#15191e]">
            {/* Coluna 1: Marca */}
            <div className="space-y-3">
              <ConfereAiLogo className="h-8 w-auto rounded-[6px]" />
              <p className="text-xs text-[#b9bbc6] leading-relaxed tracking-[-0.01em]">
                Auditoria financeira independente de frete e tarifas para vendedores de e-commerce.
              </p>
              <span className="inline-block text-[11px] font-medium text-[#6f737b]">
                Tabelas Oficiais 2026
              </span>
            </div>

            {/* Coluna 2: Plataformas */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
                Plataformas
              </h4>
              <ul className="space-y-2 text-xs text-[#b9bbc6]">
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setPlatform("mercadolivre");
                      scrollToDropzone();
                    }}
                    className="hover:text-white transition"
                  >
                    Auditoria Mercado Livre
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => {
                      setPlatform("shopee");
                      scrollToDropzone();
                    }}
                    className="hover:text-white transition"
                  >
                    Auditoria Shopee
                  </button>
                </li>
                <li>
                  <a href="#vazamentos" className="hover:text-white transition">
                    Cubagem e Pesagem Errada
                  </a>
                </li>
                <li>
                  <a href="#vazamentos" className="hover:text-white transition">
                    Tarifas Fora da Tabela
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna 3: Produto e Planos */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
                Planos e Recursos
              </h4>
              <ul className="space-y-2 text-xs text-[#b9bbc6]">
                <li>
                  <a href="#planos" className="hover:text-white transition">
                    Starter Grátis
                  </a>
                </li>
                <li>
                  <a href="#planos" className="hover:text-white transition">
                    Plano Pro Seller
                  </a>
                </li>
                <li>
                  <a href="#planos" className="hover:text-white transition">
                    Operação Escala
                  </a>
                </li>
                <li>
                  <a href="#casos-reais" className="hover:text-white transition">
                    Comprovações Reais
                  </a>
                </li>
              </ul>
            </div>

            {/* Coluna 4: Acesso e Suporte */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-white mb-3">
                Conta do Vendedor
              </h4>
              <ul className="space-y-2 text-xs text-[#b9bbc6]">
                <li>
                  <Link to="/login" className="hover:text-white transition">
                    Acessar Minhas Auditorias
                  </Link>
                </li>
                <li>
                  <Link to="/historico" className="hover:text-white transition">
                    Histórico de Relatórios
                  </Link>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => setIsPrivacyOpen(true)}
                    className="hover:text-white transition text-left cursor-pointer"
                  >
                    Privacidade e LGPD
                  </button>
                </li>
                <li>
                  <span className="text-[#6f737b]">Suporte via WhatsApp</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#6f737b]">
            <p>
              ConfereAI: Auditoria Financeira Independente para Lojistas de E-commerce.
            </p>
            <div className="flex items-center gap-3 text-[11px]">
              <button
                type="button"
                onClick={() => setIsPrivacyOpen(true)}
                className="hover:text-white underline cursor-pointer"
              >
                Política de Privacidade (LGPD)
              </button>
              <span>•</span>
              <p>Sem vínculo societário direto com Mercado Livre ou Shopee.</p>
            </div>
          </div>
        </div>
      </footer>

      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
    </div>
  );
}

export default LandingPage;
