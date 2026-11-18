"use client";
import { X, ShieldCheck, Lock, FileText, CheckCircle2, UserCheck } from "lucide-react";
import { ConfereAiLogo } from "./marketplace-logos";

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrivacyModal({ isOpen, onClose }: PrivacyModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#ffffff] rounded-[12px] shadow-modal border border-[#b9bbc6] p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-left">
        {/* Botão Fechar */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 text-[#60646c] hover:text-[#000000] p-1.5 rounded-[12px] border border-[#b9bbc6] hover:border-[#000000] transition cursor-pointer"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-3">
          <ConfereAiLogo className="h-7 w-auto rounded-[4px]" />
          <span className="text-xs font-semibold uppercase tracking-[-0.01em] text-[#60646c] bg-[#f3f3f7] px-2.5 py-0.5 rounded-[6px] border border-[#b9bbc6]">
            LGPD: Lei 13.709/2018
          </span>
        </div>

        <h2 className="text-xl sm:text-2xl font-semibold text-[#000000] tracking-[-0.025em]">
          Política de Privacidade e Proteção de Dados
        </h2>
        <p className="text-xs text-[#60646c] mt-1 tracking-[-0.01em]">
          Última atualização: Novembro de 2026. Em conformidade estrita com a LGPD e Resoluções da ANPD
        </p>

        <div className="mt-6 space-y-6 text-xs text-[#60646c] leading-relaxed font-normal">
          {/* 1. Visão Geral e Princípio de Minimização */}
          <div className="p-4 rounded-[12px] bg-[#f3f3f7] border border-[#b9bbc6] text-[#000000] space-y-2">
            <div className="flex items-center gap-2 font-semibold text-sm">
              <ShieldCheck className="w-4 h-4 text-[#ff5900]" />
              <span>Privacidade por Padrão (Privacy by Design e Default)</span>
            </div>
            <p className="text-xs text-[#60646c]">
              O <strong>ConfereAI</strong> foi projetado com base no princípio da <strong>minimização de dados (Art. 6º, III da LGPD)</strong>.
              A leitura das suas planilhas de extratos é realizada <strong>100% de forma local no seu navegador</strong>. Não coletamos nem armazenamos
              nomes, telefones, endereços ou CPFs dos compradores finais dos seus pedidos. Apenas identificadores numéricos do pedido, código SKU do anúncio e valores de tarifas financeiras são processados para gerar a comprovação da divergência.
            </p>
          </div>

          {/* 2. Dados Coletados e Finalidades */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#000000] flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-[#ff5900]" />
              1. Quais dados coletamos e por quê?
            </h3>
            <ul className="list-disc pl-5 space-y-1.5">
              <li>
                <strong className="text-[#000000]">Dados do Lojista:</strong> Nome completo, e-mail, telefone/WhatsApp e CPF ou CNPJ.
                <br />
                <em>Finalidade:</em> Identificação da sua conta, emissão de cobrança/faturamento e viabilização do acesso aos relatórios liberados (Art. 7º, V da LGPD: Execução de Contrato).
              </li>
              <li>
                <strong className="text-[#000000]">Métricas de Auditoria:</strong> ID do pedido do marketplace, código de SKU, valores de frete e comissões cobradas.
                <br />
                <em>Finalidade:</em> Calcular o montante exato cobrado a maior e formular os textos formais de contestação para ressarcimento no suporte.
              </li>
            </ul>
          </section>

          {/* 3. Bases Legais de Tratamento */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#000000] flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-[#ff5900]" />
              2. Bases Legais Utilizadas (Art. 7º da LGPD)
            </h3>
            <p>O tratamento dos seus dados fundamenta-se estritamente nas seguintes hipóteses legais:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              <div className="p-3 rounded-[8px] bg-[#ffffff] border border-[#b9bbc6]">
                <strong className="text-[#000000] block text-xs">Art. 7º, V: Execução de Contrato</strong>
                <span className="text-[11px] text-[#60646c]">
                  Processamento cadastral e financeiro necessário para a prestação do serviço contratado.
                </span>
              </div>
              <div className="p-3 rounded-[8px] bg-[#ffffff] border border-[#b9bbc6]">
                <strong className="text-[#000000] block text-xs">Art. 7º, II: Obrigação Legal</strong>
                <span className="text-[11px] text-[#60646c]">
                  Guarda de registros de acesso nos termos do Marco Civil da Internet (Lei 12.965/2014).
                </span>
              </div>
            </div>
          </section>

          {/* 4. Compartilhamento com Terceiros */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#000000] flex items-center gap-1.5">
              <Lock className="w-4 h-4 text-[#ff5900]" />
              3. Compartilhamento e Operadores Parceiros
            </h3>
            <p>
              O ConfereAI <strong>não comercializa dados pessoais em hipótese alguma</strong>. O compartilhamento ocorre apenas com os operadores estritamente indispensáveis para o funcionamento do sistema:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <strong className="text-[#000000]">Asaas Gestão Financeira S.A.:</strong> Para geração do QR Code Pix e conciliação bancária da assinatura.
              </li>
              <li>
                <strong className="text-[#000000]">Supabase / Cloud Infrastructure:</strong> Para custódia segura de dados cadastrais e relatórios sob criptografia de ponta a ponta (TLS 1.3 em trânsito e AES-256 em repouso).
              </li>
            </ul>
          </section>

          {/* 5. Direitos do Titular de Dados */}
          <section className="space-y-2">
            <h3 className="text-sm font-semibold text-[#000000] flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-[#ff5900]" />
              4. Seus Direitos como Titular (Art. 18 da LGPD)
            </h3>
            <p>Você pode, a qualquer tempo e sem qualquer custo, solicitar:</p>
            <div className="p-3.5 rounded-[8px] bg-[#f3f3f7] border border-[#b9bbc6] space-y-1.5 text-xs text-[#000000]">
              <p>• Confirmação e acesso aos seus dados pessoais armazenados.</p>
              <p>• Correção de dados incompletos, inexatos ou desatualizados.</p>
              <p>• Eliminação completa e definitiva dos seus dados pessoais e histórico de conferências.</p>
              <p>• Revogação do consentimento para comunicações opcionais.</p>
            </div>
          </section>

          {/* 6. Canal de Atendimento do Encarregado (DPO) */}
          <section className="p-4 rounded-[12px] bg-[#ffffff] border border-[#b9bbc6] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-semibold uppercase tracking-[-0.01em] text-[#60646c] block">
                Canal de Privacidade e Encarregado (DPO)
              </span>
              <strong className="text-sm text-[#000000] block mt-0.5">
                privacidade@confereai.com.br
              </strong>
              <p className="text-[11px] text-[#60646c] mt-0.5">
                Para solicitar exclusão, relatórios de dados ou esclarecer dúvidas, envie uma mensagem para o nosso DPO.
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-[8px] bg-[#ff5900] hover:bg-[#e04f00] text-white font-semibold text-xs tracking-[-0.01em] transition cursor-pointer self-start sm:self-auto shrink-0"
            >
              Compreendi e Concordo
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}

export default PrivacyModal;
