import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import {
  runMarketplaceAuditAndSave,
  type MarketplacePlatform,
} from "../services/auditEngine";

const PLATFORM_GUIDES: Record<
  MarketplacePlatform,
  {
    label: string;
    accentBg: string;
    accentText: string;
    steps: string[];
    sampleFileName: string;
  }
> = {
  mercadolivre: {
    label: "Mercado Livre",
    accentBg: "bg-yellow-400 hover:bg-yellow-300 border-yellow-500",
    accentText: "text-slate-900",
    steps: [
      "Acesse seu painel do Mercado Livre em Relatórios > Faturamento.",
      "Clique em Detalhes de liberações (ou Relatório de Vendas) e baixe em CSV ou XLSX.",
    ],
    sampleFileName: "exemplo-repasses-mercadolivre-2026.csv",
  },
  shopee: {
    label: "Shopee",
    accentBg: "bg-orange-500 hover:bg-orange-600 border-orange-600",
    accentText: "text-white",
    steps: [
      "Acesse a Central do Vendedor Shopee em Finanças > Minha Renda.",
      "Selecione o período dos últimos 30 ou 60 dias e clique em Exportar Relatório.",
    ],
    sampleFileName: "exemplo-renda-shopee-2026.csv",
  },
};

/**
 * Gera um arquivo CSV realista em memória para demonstração instantânea ou gravação de anúncio
 */
export function buildSampleCsvFile(platform: MarketplacePlatform): File {
  if (platform === "mercadolivre") {
    const rows = [
      "Relatório de Liberações Financeiras - Mercado Livre",
      "Período: Últimos 30 dias",
      "",
      "N.º de venda;SKU;Estado;Receita por produtos (BRL);Tarifa de venda e impostos (BRL);Tarifas de envio (BRL);Total (BRL)",
      "200000918401;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-19,90;83,21",
      "200000918402;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-19,90;83,21",
      "200000918403;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-20,50;82,61",
      "200000918404;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-54,90;48,21",
      "200000918405;KIT-ORGANIZADOR-3P;Entregue;119,90;-16,79;-48,90;54,21",
      "200000918406;SUPORTE-ARTICULADO-PRO;Entregue;189,00;-30,24;-23,45;135,31",
      "200000918407;SUPORTE-ARTICULADO-PRO;Entregue;189,00;-30,24;-23,45;135,31",
      "200000918408;SUPORTE-ARTICULADO-PRO;Entregue;189,00;-30,24;-62,80;95,96",
      "200000918409;SUPORTE-ARTICULADO-PRO;Entregue;189,00;-45,36;-23,45;120,19",
      "200000918410;GARRAFA-TERMICA-1L;Entregue;89,90;-12,59;-18,90;58,41",
      "200000918411;GARRAFA-TERMICA-1L;Entregue;89,90;-12,59;-18,90;58,41",
      "200000918412;GARRAFA-TERMICA-1L;Entregue;89,90;-12,59;-41,20;36,11",
      "200000918413;GARRAFA-TERMICA-1L;Entregue;89,90;-21,58;-18,90;49,42",
      "200000918414;KIT-ORGANIZADOR-3P;Devolvido;0,00;0,00;-24,90;-24,90",
      "200000918415;SUPORTE-ARTICULADO-PRO;Cancelado;0,00;-15,00;-19,90;-34,90",
    ];
    return new File([rows.join("\n")], PLATFORM_GUIDES.mercadolivre.sampleFileName, {
      type: "text/csv;charset=utf-8;",
    });
  }

  const shopeeRows = [
    "Relatório de Renda do Vendedor - Shopee Brasil",
    "",
    "ID do pedido;Número de referência SKU;Status do pedido;Preço original;Taxa de comissão;Taxa de envio paga pelo vendedor;Valor total liberado",
    "261108A9X101;LUMINARIA-LED-MESA;Concluído;109,90;-15,39;-14,00;80,51",
    "261108A9X102;LUMINARIA-LED-MESA;Concluído;109,90;-15,39;-14,00;80,51",
    "261108A9X103;LUMINARIA-LED-MESA;Concluído;109,90;-15,39;-39,50;55,01",
    "261108A9X104;LUMINARIA-LED-MESA;Concluído;109,90;-15,39;-44,00;50,51",
    "261108A9X105;MOCHILA-IMPERMEAVEL-30L;Concluído;149,90;-20,99;-18,50;110,41",
    "261108A9X106;MOCHILA-IMPERMEAVEL-30L;Concluído;149,90;-20,99;-18,50;110,41",
    "261108A9X107;MOCHILA-IMPERMEAVEL-30L;Concluído;149,90;-20,99;-52,90;76,01",
    "261108A9X108;MOCHILA-IMPERMEAVEL-30L;Concluído;149,90;-34,48;-18,50;96,92",
    "261108A9X109;LUMINARIA-LED-MESA;Devolvido / Reembolsado;0,00;-15,00;-14,00;-29,00",
    "261108A9X110;MOCHILA-IMPERMEAVEL-30L;Devolvido / Reembolsado;0,00;-15,00;-18,50;-33,50",
  ];

  return new File([shopeeRows.join("\n")], PLATFORM_GUIDES.shopee.sampleFileName, {
    type: "text/csv;charset=utf-8;",
  });
}

export function LandingPage() {
  const navigate = useNavigate();
  const dropzoneRef = useRef<HTMLDivElement>(null);

  const [platform, setPlatform] = useState<MarketplacePlatform>("mercadolivre");
  const [isDragging, setIsDragging] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const processFile = async (file: File) => {
    setErrorMsg(null);
    setLoadingStep("Lendo linhas e identificando colunas da planilha...");

    try {
      const timer1 = setTimeout(() => {
        setLoadingStep("Agrupando custos de envio e cubagem por SKU...");
      }, 450);
      const timer2 = setTimeout(() => {
        setLoadingStep("Calculando divergências de tarifas e devoluções...");
      }, 950);

      const result = await runMarketplaceAuditAndSave(file, platform, supabase);

      clearTimeout(timer1);
      clearTimeout(timer2);
      navigate(`/resultado/${result.auditId}`);
    } catch (err) {
      setLoadingStep(null);
      setErrorMsg(
        err instanceof Error
          ? err.message
          : "Não foi possível ler esta planilha. Verifique o formato CSV ou XLSX."
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
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* Barra Superior Minimalista */}
      <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-xs sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center font-black text-slate-950 text-base">
              R$
            </div>
            <span className="font-extrabold tracking-tight text-white text-lg">
              AuditaSeller
            </span>
          </div>
          <button
            type="button"
            onClick={scrollToDropzone}
            className="text-xs sm:text-sm font-bold px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 transition cursor-pointer"
          >
            Auditar Planilha Grátis
          </button>
        </div>
      </header>

      {/* HERO SECTION + DROPZONE INTEGRADO */}
      <main>
        <section className="pt-12 pb-16 sm:pt-16 sm:pb-24 px-4 sm:px-6">
          <div className="max-w-4xl mx-auto text-center">
            <span className="inline-block text-xs font-bold uppercase tracking-wider px-3.5 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-5">
              Regras Atualizadas • Mercado Livre & Shopee
            </span>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white leading-tight">
              Descubra em 10 segundos quanto o marketplace{" "}
              <span className="text-emerald-400">cobrou a mais</span> nas suas últimas vendas.
            </h1>

            <p className="mt-5 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
              Suba sua planilha de repasses financeiros. Nosso auditor cruza{" "}
              <strong className="text-white">SKU por SKU</strong> e aponta exatamente onde você
              tem dinheiro parado para pedir reembolso — sem conectar sua conta e sem cartão de
              crédito.
            </p>
          </div>

          {/* CARD CENTRAL DE UPLOAD (AUDIT DROPZONE) */}
          <div
            ref={dropzoneRef}
            className="max-w-2xl mx-auto mt-10 bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 p-6 sm:p-8"
          >
            {/* Seletor de Plataforma */}
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                1. Escolha o marketplace da planilha:
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                disabled={Boolean(loadingStep)}
                onClick={() => setPlatform("mercadolivre")}
                className={`py-3.5 px-4 rounded-xl font-extrabold text-sm sm:text-base border-2 transition cursor-pointer ${
                  platform === "mercadolivre"
                    ? "bg-yellow-400 text-slate-950 border-yellow-500 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Mercado Livre
              </button>

              <button
                type="button"
                disabled={Boolean(loadingStep)}
                onClick={() => setPlatform("shopee")}
                className={`py-3.5 px-4 rounded-xl font-extrabold text-sm sm:text-base border-2 transition cursor-pointer ${
                  platform === "shopee"
                    ? "bg-orange-500 text-white border-orange-600 shadow-sm"
                    : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                }`}
              >
                Shopee
              </button>
            </div>

            {/* Mini-guia de onde baixar o arquivo */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-5 text-xs text-slate-600 space-y-1">
              <p className="font-bold text-slate-800">
                Onde baixar o arquivo no {currentGuide.label}:
              </p>
              {currentGuide.steps.map((step, i) => (
                <p key={i}>
                  {i + 1}. {step}
                </p>
              ))}
            </div>

            {/* Área Drag & Drop */}
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-48 border-2 border-dashed rounded-xl cursor-pointer transition px-4 text-center ${
                isDragging
                  ? "border-emerald-500 bg-emerald-50"
                  : "border-slate-300 bg-slate-50/60 hover:bg-slate-100/80 hover:border-slate-400"
              }`}
            >
              {loadingStep ? (
                <div className="space-y-3">
                  <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-bold text-slate-800">{loadingStep}</p>
                  <p className="text-xs text-slate-500">Processamento local seguro...</p>
                </div>
              ) : (
                <>
                  <div className="w-11 h-11 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-xl mb-3">
                    ↑
                  </div>
                  <span className="text-base font-extrabold text-slate-800">
                    Arraste sua planilha CSV ou XLSX aqui
                  </span>
                  <span className="text-xs text-slate-500 mt-1">
                    ou clique para selecionar o arquivo do computador
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
              <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200 text-xs font-medium text-red-700">
                {errorMsg}
              </div>
            )}

            {/* Botão de Teste Instantâneo com Planilha Real de Exemplo */}
            <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <span className="text-xs text-slate-500">
                Não baixou sua planilha agora?
              </span>
              <button
                type="button"
                disabled={Boolean(loadingStep)}
                onClick={handleRunSampleAudit}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3.5 py-2 rounded-lg transition cursor-pointer"
              >
                Testar com planilha de exemplo ({currentGuide.label}) →
              </button>
            </div>
          </div>

          {/* Selos de Confiança */}
          <div className="max-w-2xl mx-auto mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400">
            <span>✓ Não pede senha nem token da loja</span>
            <span>✓ Diagnóstico gratuito na hora</span>
            <span>✓ Gera o texto pronto para abrir chamado</span>
          </div>
        </section>

        {/* SEÇÃO: OS 3 VAZAMENTOS QUE O SISTEMA DETECTA */}
        <section className="py-16 px-4 sm:px-6 bg-slate-900 border-t border-slate-800">
          <div className="max-w-5xl mx-auto">
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                Por que quem vende todo dia perde entre 2% e 7% do lucro sem ver?
              </h2>
              <p className="text-sm text-slate-400 mt-3">
                Os ERPs comuns mostram quanto você vendeu, mas não auditam centavo por centavo se
                o marketplace descontou a tarifa certa na liquidação.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  Vazamento 01
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  Erro de Cubagem e Peso no Frete
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Sensores das transportadoras frequentemente leem volume errado e cobram frete de 3 kg
                  num produto de 300g. Nosso algoritmo compara o frete de cada pedido contra o
                  histórico real daquele mesmo SKU.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
                <span className="text-xs font-bold uppercase tracking-wider text-purple-400">
                  Vazamento 02
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  Comissão e Taxa Fixa Fora da Faixa
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Com as mudanças nas tabelas de custo operacional e degraus de preço, centenas de
                  pedidos sofrem cobrança de percentual de campanha ou tarifa fixa acima do padrão
                  cadastrado.
                </p>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-6">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  Vazamento 03
                </span>
                <h3 className="text-lg font-bold text-white mt-2">
                  Devoluções com Desconto Indevido
                </h3>
                <p className="text-sm text-slate-400 mt-2 leading-relaxed">
                  Pedidos cancelados ou devolvidos por arrependimento que fecham com saldo negativo na
                  sua conta por cobrança indevida de frete reverso ou comissão não estornada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SEÇÃO: COMO FUNCIONA + CTA FINAL */}
        <section className="py-16 px-4 sm:px-6 border-t border-slate-800 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Você só paga se encontrar dinheiro para recuperar
            </h2>
            <p className="text-sm sm:text-base text-slate-300 mt-3 leading-relaxed">
              Faça o diagnóstico gratuito agora. Veja o valor exato em reais que o marketplace
              descontou a maior e os 2 primeiros pedidos abertos para conferir na sua loja. Se
              valer a pena, desbloqueie o relatório completo e os textos prontos de contestação
              por <strong className="text-emerald-400">R$ 67,00/mês</strong>.
            </p>

            <button
              type="button"
              onClick={scrollToDropzone}
              className="mt-8 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-base shadow-lg transition cursor-pointer"
            >
              Subir Minha Planilha Agora (Grátis)
            </button>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-800/80 py-8 px-4 text-center text-xs text-slate-500">
        AuditaSeller • Auditoria Independente de Repasses para E-commerce. Não possuímos vínculo
        institucional com Mercado Livre ou Shopee.
      </footer>
    </div>
  );
}
