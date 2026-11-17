import React, { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Sparkles,
  UploadCloud,
  ChevronRight,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Zap,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import {
  runMarketplaceAuditAndSave,
  buildSampleCsvFile,
  type MarketplacePlatform,
} from "../services/auditEngine";
import { AppHeader } from "../components/AppHeader";
import { BottomNav } from "../components/BottomNav";
import { DonutProgress } from "../components/DonutProgress";
import { ZenithCard } from "../components/ZenithCard";
import { CrystalStreak } from "../components/CrystalStreak";
import { MissionRoadmap } from "../components/MissionRoadmap";

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
    accentClass: "bg-amber-400 text-slate-900 border-amber-500",
    steps: [
      "Acesse seu painel do Mercado Livre em Relatórios > Faturamento.",
      "Clique em Detalhes de liberações (ou Relatório de Vendas) e baixe em CSV ou XLSX.",
    ],
    sampleFileName: "exemplo-repasses-mercadolivre-2026.csv",
  },
  shopee: {
    label: "Shopee",
    badge: "Programa Frete 2026",
    accentClass: "bg-orange-500 text-white border-orange-600",
    steps: [
      "Acesse a Central do Vendedor Shopee em Finanças > Minha Renda.",
      "Selecione o período dos últimos 30 ou 60 dias e clique em Exportar Relatório.",
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
    setLoadingStep("Lendo linhas e mapeando colunas financeiras...");

    try {
      const timer1 = setTimeout(() => {
        setLoadingStep("Cruzando cubagem histórica e frete SKU por SKU...");
      }, 450);
      const timer2 = setTimeout(() => {
        setLoadingStep("Detectando tarifas fora da tabela e devoluções...");
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
          : "Não foi possível processar a planilha. Verifique o formato CSV ou XLSX."
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
    <div className="min-h-screen bg-[#F4F5FB] text-slate-800 pb-28">
      {/* Top Header Neumorphic Bar */}
      <AppHeader
        title="CONFERE AI"
        badge="BLINDAGEM 2026"
        onOpenSettings={scrollToDropzone}
      />

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* =========================================================================
            SEÇÃO 1: GRID PRINCIPAL (Inspirado nos cards superiores da imagem)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Card Esquerda: Perfil / Identidade & Navegação Rápida (Col 4) */}
          <div
            id="profile-section"
            className="lg:col-span-4 bg-white rounded-[28px] p-6 border border-indigo-100/70 shadow-soft flex flex-col justify-between"
          >
            <div>
              {/* Avatar com Halo Etereo */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-3">
                  <div className="w-24 h-24 rounded-full ring-8 ring-indigo-50/90 ring-offset-2 overflow-hidden bg-gradient-to-tr from-indigo-100 via-slate-100 to-indigo-50 flex items-center justify-center shadow-soft">
                    <img
                      src="/zenith-ref.jpg"
                      alt="Guardião Confere AI"
                      className="w-full h-full object-cover object-top filter contrast-105"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = "none";
                      }}
                    />
                    <Zap className="w-10 h-10 text-indigo-600" />
                  </div>
                  <span className="absolute bottom-0 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-sm flex items-center justify-center text-[10px] text-white font-bold">
                    ✓
                  </span>
                </div>

                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  ZENITH CONFERE
                </h2>
                <p className="text-[10px] uppercase tracking-widest font-extrabold text-slate-400 mt-0.5">
                  PRECISÃO • CUBAGEM • LUCRO.
                </p>

                {/* Badge Nível */}
                <span className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider text-white bg-indigo-600 px-3.5 py-1 rounded-full shadow-glow-violet">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  LEVEL 56 • PRO SELLER
                </span>
              </div>

              {/* Stats Row de 3 Métricas */}
              <div className="grid grid-cols-3 gap-2 py-4 my-4 border-y border-indigo-50 text-center">
                <div>
                  <span className="text-lg font-black text-slate-900 block leading-tight">
                    1.420
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                    Pedidos
                  </span>
                </div>
                <div>
                  <span className="text-lg font-black text-indigo-600 block leading-tight">
                    38
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                    Divergências
                  </span>
                </div>
                <div>
                  <span className="text-lg font-black text-emerald-600 block leading-tight">
                    R$ 1.148
                  </span>
                  <span className="text-[9px] uppercase tracking-wider font-bold text-slate-400">
                    A Recuperar
                  </span>
                </div>
              </div>

              {/* Lista de Ações / Atalhos Rápidos */}
              <div className="space-y-1.5 text-xs font-bold text-slate-700">
                <button
                  type="button"
                  onClick={scrollToDropzone}
                  className="w-full flex items-center justify-between p-3 rounded-2xl bg-indigo-50/70 text-indigo-700 hover:bg-indigo-100/70 transition cursor-pointer"
                >
                  <span className="flex items-center gap-2.5">
                    <Zap className="w-4 h-4 text-indigo-600" />
                    <span>Auditar Planilha Agora</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-indigo-400" />
                </button>

                <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition text-slate-600 cursor-pointer">
                  <span className="flex items-center gap-2.5">
                    <FileSpreadsheet className="w-4 h-4 text-slate-400" />
                    <span>Regras Mercado Livre 2026</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>

                <div className="flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 transition text-slate-600 cursor-pointer">
                  <span className="flex items-center gap-2.5">
                    <TrendingUp className="w-4 h-4 text-slate-400" />
                    <span>Tabela Shopee Frete Grátis</span>
                  </span>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-indigo-50 flex items-center justify-between text-[11px] text-slate-400">
              <span>Status: Online</span>
              <span className="text-emerald-600 font-bold">100% Protegido</span>
            </div>
          </div>

          {/* Card Centro: O Banner Hero Épico ("The Grind Looks Lonely...") (Col 5) */}
          <div className="lg:col-span-5 rounded-[28px] p-6 sm:p-7 relative overflow-hidden flex flex-col justify-between shadow-soft-lg bg-gradient-to-b from-white via-indigo-50/40 to-white border border-indigo-100/70">
            {/* Background com Silhueta Futurista */}
            <div className="absolute inset-0 z-0 opacity-15 pointer-events-none">
              <img
                src="/zenith-ref.jpg"
                alt="Zenith Background"
                className="w-full h-full object-cover object-center filter grayscale contrast-125"
              />
            </div>

            <div className="relative z-10">
              <span className="text-2xl font-serif text-indigo-400 select-none">“</span>
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-snug">
                THE GRIND LOOKS LONELY BEFORE IT LOOKS{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                  LEGENDARY.
                </span>
              </h1>
              <p className="text-[11px] font-black uppercase tracking-widest text-slate-400 mt-1">
                — AUDITORIA CIRÚRGICA DE REPASSES.
              </p>

              <p className="text-xs text-slate-600 mt-3 leading-relaxed">
                O marketplace altera cubagem e tarifas no silêncio. Nosso auditor cruza SKU por
                SKU e aponta exatamente onde você tem dinheiro para recuperar.
              </p>
            </div>

            <div className="relative z-10 mt-6 space-y-4">
              {/* Botão Principal Estilizado do Hero */}
              <button
                type="button"
                onClick={scrollToDropzone}
                className="w-full py-4 px-6 rounded-full bg-white hover:bg-indigo-50 text-indigo-700 border-2 border-indigo-200/80 shadow-soft font-black text-xs sm:text-sm uppercase tracking-wider flex items-center justify-between transition transform hover:-translate-y-0.5 cursor-pointer"
              >
                <span>ENTRAR NO MODO AUDITORIA</span>
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-glow-violet">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>

              {/* Sparkline de Eficácia Semanal */}
              <div className="p-3.5 rounded-2xl bg-white/90 border border-indigo-100/70 shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                    PRECISÃO DE AUDITORIA
                  </span>
                  <span className="text-xs font-black text-indigo-600">87% ACURÁCIA</span>
                </div>
                {/* SVG Sparkline Curvo */}
                <svg className="w-full h-9 stroke-indigo-500 fill-none" viewBox="0 0 300 40">
                  <path
                    d="M 10 32 Q 50 10 90 25 T 170 12 T 230 28 T 290 8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />
                  <circle cx="170" cy="12" r="3.5" className="fill-indigo-600" />
                  <circle cx="290" cy="8" r="4.5" className="fill-violet-600 animate-pulse" />
                </svg>
                <div className="flex justify-between text-[9px] font-bold text-slate-400 px-1 mt-1">
                  <span>SEG</span>
                  <span>TER</span>
                  <span>QUA</span>
                  <span className="text-indigo-600 font-extrabold">QUI</span>
                  <span>SEX</span>
                  <span>SÁB</span>
                  <span>DOM</span>
                </div>
              </div>
            </div>
          </div>

          {/* Card Direita: Overall Progress & Cristal (Col 3) */}
          <div id="analytics-section" className="lg:col-span-3 space-y-6">
            <DonutProgress percentage={78} label="DETECTADO" />
            <CrystalStreak
              days={24}
              label="DIAS SEGUIDOS"
              sublabel="Auditoria semanal sem falhas"
            />
          </div>
        </div>

        {/* =========================================================================
            SEÇÃO 2: CARD CENTRAL DE UPLOAD / DROPZONE (O Coração da Conversão)
            ========================================================================= */}
        <section
          ref={dropzoneRef}
          className="bg-white rounded-[32px] p-6 sm:p-10 border border-indigo-100/90 shadow-soft-lg relative overflow-hidden"
        >
          <div className="max-w-3xl mx-auto text-center mb-8">
            <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3.5 py-1 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200/60 mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              Processamento 100% Client-Side • Custo Zero de Infra
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Arraste sua planilha e descubra seu dinheiro retido
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 max-w-xl mx-auto">
              Cruza centavo por centavo em 10 segundos. Não pede senha da sua loja, não conecta
              token e não exige cartão de crédito.
            </p>
          </div>

          {/* Seletor Neumorphic de Plataforma */}
          <div className="max-w-xl mx-auto mb-6">
            <div className="grid grid-cols-2 gap-3 p-1.5 bg-slate-50 rounded-2xl border border-indigo-100/60">
              <button
                type="button"
                disabled={Boolean(loadingStep)}
                onClick={() => setPlatform("mercadolivre")}
                className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm tracking-wide transition cursor-pointer flex items-center justify-center gap-2 ${
                  platform === "mercadolivre"
                    ? "bg-amber-400 text-slate-950 shadow-soft border border-amber-500"
                    : "text-slate-500 hover:text-slate-800"
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
                className={`py-3 px-4 rounded-xl font-black text-xs sm:text-sm tracking-wide transition cursor-pointer flex items-center justify-center gap-2 ${
                  platform === "shopee"
                    ? "bg-orange-500 text-white shadow-soft border border-orange-600"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                <span>Shopee</span>
                {platform === "shopee" && (
                  <span className="w-2 h-2 rounded-full bg-white" />
                )}
              </button>
            </div>

            {/* Dica de onde baixar */}
            <div className="mt-3 p-3 bg-indigo-50/60 rounded-xl border border-indigo-100/60 text-[11px] text-slate-600 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-800">
                  Como exportar no {currentGuide.label}:{" "}
                </span>
                {currentGuide.steps.join(" ")}
              </div>
            </div>
          </div>

          {/* Área Drag & Drop com Estética Soft Neumorphic */}
          <div className="max-w-xl mx-auto">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              className={`flex flex-col items-center justify-center w-full h-52 border-2 border-dashed rounded-[24px] cursor-pointer transition p-6 text-center ${
                isDragging
                  ? "border-indigo-600 bg-indigo-50/70"
                  : "border-indigo-200/90 bg-indigo-50/20 hover:bg-indigo-50/40 hover:border-indigo-300"
              }`}
            >
              {loadingStep ? (
                <div className="space-y-3">
                  <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="text-sm font-black text-slate-800">{loadingStep}</p>
                  <p className="text-xs text-indigo-600 font-bold">
                    Processando com SheetJS client-side...
                  </p>
                </div>
              ) : (
                <>
                  <div className="w-13 h-13 rounded-2xl bg-white text-indigo-600 shadow-soft border border-indigo-100 flex items-center justify-center font-black text-xl mb-3">
                    <UploadCloud className="w-6 h-6 stroke-[2.2]" />
                  </div>
                  <span className="text-base font-black text-slate-800">
                    Arraste sua planilha CSV ou XLSX aqui
                  </span>
                  <span className="text-xs text-slate-400 mt-1">
                    ou clique para procurar no seu dispositivo
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
              <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Botão de Teste com Planilha Real de Exemplo */}
            <div className="mt-5 p-4 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-left">
                <span className="text-xs font-bold text-slate-700 block">
                  Sem a planilha agora?
                </span>
                <span className="text-[10px] text-slate-400">
                  Gera 15 pedidos reais com erros de cubagem e devolução
                </span>
              </div>

              <button
                type="button"
                disabled={Boolean(loadingStep)}
                onClick={handleRunSampleAudit}
                className="py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider shadow-glow-violet transition flex items-center gap-2 cursor-pointer shrink-0"
              >
                <span>Testar Planilha ({currentGuide.label})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* =========================================================================
            SEÇÃO 3: CARTÃO ZENITH PRIME + ROADMAP DA MISSÃO (Grid Inferior)
            ========================================================================= */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5">
            <ZenithCard
              balance="R$ 1.148,90"
              divergencesCount={38}
              cardNumber="4582 2456 7896 5412"
            />
          </div>
          <div className="lg:col-span-7">
            <MissionRoadmap currentStep={2} onAction={scrollToDropzone} />
          </div>
        </div>
      </main>

      {/* Floating Bottom Navigation */}
      <BottomNav onCenterAction={scrollToDropzone} centerActionLabel="Subir Planilha" />
    </div>
  );
}
