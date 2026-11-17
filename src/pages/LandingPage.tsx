import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Package,
  Percent,
  RotateCcw,
  Sparkles,
  Lock,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  runMarketplaceAuditAndSave,
  buildSampleCsvFile,
  type MarketplacePlatform,
} from "../services/auditEngine";
import { AppHeader } from "../components/AppHeader";
import { PricingPlanTilt } from "../components/ui/pricing-plan-tilt";

const PLATFORM_GUIDES: Record<
  MarketplacePlatform,
  {
    label: string;
    badge: string;
    accentClass: string;
    steps: string[];
    sampleFileName: string;
  }
> = {
  mercadolivre: {
    label: "Mercado Livre",
    badge: "Tarifas 2026 Ativas",
    accentClass: "bg-amber-400 text-slate-950 border-amber-500",
    steps: [
      "No painel do Mercado Livre, vá em Relatórios > Faturamento.",
      "Clique em 'Detalhes de liberações' (ou Relatório de Vendas) e baixe em CSV ou XLSX.",
    ],
    sampleFileName: "exemplo-repasses-mercadolivre-2026.csv",
  },
  shopee: {
    label: "Shopee",
    badge: "Programa Frete 2026",
    accentClass: "bg-orange-500 text-white border-orange-600",
    steps: [
      "Na Central do Vendedor Shopee, vá em Finanças > Minha Renda.",
      "Selecione os últimos 30 ou 60 dias e clique em 'Exportar Relatório'.",
    ],
    sampleFileName: "exemplo-renda-shopee-2026.csv",
  },
};

export function LandingPage() {
  const navigate = useNavigate();
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [platform, setPlatform] = useState<MarketplacePlatform>("mercadolivre");
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setLoadingStep("Lendo transações e identificando cabeçalhos...");

    try {
      const timer1 = setTimeout(() => {
        setLoadingStep("Agrupando histórico de envio e cubagem por SKU...");
      }, 450);
      const timer2 = setTimeout(() => {
        setLoadingStep("Calculando divergências de tarifas e devoluções...");
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
          : "Não foi possível processar a planilha. Verifique se o arquivo é um CSV ou XLSX oficial."
      );
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleRunSampleAudit = () => {
    const sampleFile = buildSampleCsvFile(platform);
    processFile(sampleFile);
  };

  const scrollToDropzone = () => {
    dropzoneRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const currentGuide = PLATFORM_GUIDES[platform];

  return (
    <div className="min-h-screen bg-[#F8F9FD] text-slate-800">
      <AppHeader onScrollToAudit={scrollToDropzone} />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        {/* =========================================================================
            DOBRA 1: HERO + DROPZONE IMEDIATO (Alta Conversão, Zero Atrito)
            ========================================================================= */}
        <section className="text-center max-w-3xl mx-auto mb-10">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200/80 mb-5 shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Auditoria Financeira B2B • Regras Vigentes 2026
          </span>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Descubra em 10 segundos quanto o marketplace{" "}
            <span className="text-indigo-600">cobrou a mais</span> nas suas vendas.
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl mx-auto">
            Suba sua planilha de repasses financeiros. O <strong className="text-slate-900 font-bold">ConfereAI</strong> cruza{" "}
            <strong className="text-indigo-600 font-bold">SKU por SKU</strong> e aponta exatamente onde você tem dinheiro para recuperar de frete cubado e tarifas indevidas.
          </p>
        </section>

        {/* =========================================================================
            CARD CENTRAL DE UPLOAD / DROPZONE
            ========================================================================= */}
        <div
          ref={dropzoneRef}
          className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-soft mb-12"
        >
          {/* Seletor de Marketplace */}
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              1. Selecione o marketplace da planilha:
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-5">
            <button
              type="button"
              disabled={Boolean(loadingStep)}
              onClick={() => setPlatform("mercadolivre")}
              className={`py-3.5 px-4 rounded-2xl font-extrabold text-sm border-2 transition cursor-pointer flex items-center justify-center gap-2 ${
                platform === "mercadolivre"
                  ? "bg-amber-400 text-slate-950 border-amber-500 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Mercado Livre</span>
              {platform === "mercadolivre" && (
                <span className="w-2 h-2 rounded-full bg-slate-950" />
              )}
            </button>

            <button
              type="button"
              disabled={Boolean(loadingStep)}
              onClick={() => setPlatform("shopee")}
              className={`py-3.5 px-4 rounded-2xl font-extrabold text-sm border-2 transition cursor-pointer flex items-center justify-center gap-2 ${
                platform === "shopee"
                  ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                  : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
              }`}
            >
              <span>Shopee</span>
              {platform === "shopee" && (
                <span className="w-2 h-2 rounded-full bg-white" />
              )}
            </button>
          </div>

          {/* Dica de exportação do painel */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-600 mb-5 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-slate-800">
                Onde baixar no {currentGuide.label}:{" "}
              </span>
              {currentGuide.steps.join(" ")}
            </div>
          </div>

          {/* Área Drag & Drop */}
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-2xl cursor-pointer transition p-6 text-center ${
              isDragging
                ? "border-indigo-600 bg-indigo-50/60"
                : "border-slate-300 bg-slate-50/50 hover:bg-slate-100/70 hover:border-indigo-300"
            }`}
          >
            {loadingStep ? (
              <div className="space-y-3">
                <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="text-sm font-extrabold text-slate-900">{loadingStep}</p>
                <p className="text-xs text-slate-500">
                  Processando localmente no seu navegador...
                </p>
              </div>
            ) : (
              <>
                <div className="w-13 h-13 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-2xl mb-3 border border-indigo-100">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <span className="text-base font-extrabold text-slate-900">
                  Arraste sua planilha CSV ou XLSX aqui
                </span>
                <span className="text-xs text-slate-500 mt-1">
                  ou clique para selecionar o arquivo do seu computador
                </span>
              </>
            )}

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              disabled={Boolean(loadingStep)}
              onChange={handleFileChange}
            />
          </label>

          {errorMsg && (
            <div className="mt-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs font-semibold text-red-700 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Botão de Teste com Planilha Real de Exemplo */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
            <span className="text-xs text-slate-500 font-medium">
              Não baixou sua planilha agora?
            </span>
            <button
              type="button"
              disabled={Boolean(loadingStep)}
              onClick={handleRunSampleAudit}
              className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs border border-indigo-200/80 transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Testar com planilha de exemplo ({currentGuide.label})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Selos de Confiança e Segurança */}
        <div className="max-w-2xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium mb-16">
          <span className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Dados processados 100% no seu navegador
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Sem necessidade de senha ou token
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            Diagnóstico gratuito na hora
          </span>
        </div>

        {/* =========================================================================
            DOBRA 2: OS 3 VAZAMENTOS SILENCIOSOS (Explicação Técnica B2B)
            ========================================================================= */}
        <section className="mb-16">
          <div className="text-center max-w-2xl mx-auto mb-10">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Onde o lojista perde de 2% a 7% do faturamento sem perceber?
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Os ERPs tradicionais mostram quanto você vendeu, mas não conferem se o marketplace debitou a tarifa e o frete exatos na hora do repasse.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold mb-4 border border-amber-200/60">
                <Package className="w-5 h-5 text-amber-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                Vazamento 01
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-3">
                Erro de Cubagem & Peso no Frete
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Sensores ópticos e balanças das esteiras de triagem frequentemente registram volume duplicado ou peso excedente, cobrando frete de 3 kg num produto de 300g. O ConfereAI cruza com a mediana histórica do SKU e aponta a divergência.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold mb-4 border border-indigo-200/60">
                <Percent className="w-5 h-5 text-indigo-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-indigo-700 bg-indigo-100/80 px-2.5 py-0.5 rounded-full">
                Vazamento 02
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-3">
                Tarifa Operacional & Degrau de Preço
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Com as novas tabelas de 2026 e faixas de preço da Shopee e Mercado Livre, pequenas alterações de centavos no anúncio aplicam alíquotas erradas ou taxas fixas duplicadas que consomem sua margem de lucro.
              </p>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-soft">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center font-bold mb-4 border border-rose-200/60">
                <RotateCcw className="w-5 h-5 text-rose-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-rose-700 bg-rose-100/80 px-2.5 py-0.5 rounded-full">
                Vazamento 03
              </span>
              <h3 className="text-base font-extrabold text-slate-900 mt-3">
                Devoluções com Saldo Líquido Negativo
              </h3>
              <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                Pedidos devolvidos por arrependimento do comprador que fecham com saldo negativo na sua conta devido à cobrança indevida de frete reverso ou estorno incompleto da comissão da plataforma.
              </p>
            </div>
          </div>
        </section>

        {/* =========================================================================
            DOBRA 3: TABELA DE PREÇOS INTERATIVA 3D (PricingPlanTilt)
            ========================================================================= */}
        <section className="mb-16">
          <PricingPlanTilt
            onSelect={(_planId, _billing) => {
              scrollToDropzone();
            }}
          />
        </section>

        {/* =========================================================================
            DOBRA 4: COMO FUNCIONA + CTA FINAL
            ========================================================================= */}
        <section className="bg-white rounded-3xl p-8 sm:p-12 border border-slate-200/80 shadow-soft text-center">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Você só paga se encontrar dinheiro para recuperar
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto mt-3 leading-relaxed">
            Faça o diagnóstico gratuito agora. O ConfereAI exibe o valor total em reais que o marketplace descontou a maior e as 2 primeiras linhas abertas para você conferir na sua loja. Se valer a pena, desbloqueie a lista completa e os textos de contestação por apenas <strong>R$ 67,00/mês</strong>.
          </p>

          <button
            type="button"
            onClick={scrollToDropzone}
            className="mt-6 py-4 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm uppercase tracking-wider shadow-md transition transform hover:-translate-y-0.5 cursor-pointer"
          >
            Subir Minha Planilha Agora (Grátis)
          </button>
        </section>
      </main>

      {/* Rodapé Corporativo B2B */}
      <footer className="border-t border-slate-200 py-8 px-4 text-center text-xs text-slate-500">
        <p className="font-bold text-slate-700">
          ConfereAI • Auditoria Financeira Independente para Vendedores de E-commerce
        </p>
        <p className="mt-1">
          Não possuímos vínculo societário ou institucional direto com Mercado Livre ou Shopee.
        </p>
      </footer>
    </div>
  );
}
