# Confere AI (AuditaSeller)

Sistema de auditoria de repasses financeiros para lojistas de **Mercado Livre** e **Shopee**.
Identifica cobranças indevidas de frete cubado, comissões fora da tabela e devoluções com saldo negativo através do cruzamento SKU a SKU.

---

## 🚀 Arquitetura & Stack (Custo Zero de Infraestrutura)

- **Frontend:** React 19 + Vite + TypeScript + Tailwind CSS (Deploy gratuito na Vercel).
- **Processamento:** 100% Client-Side via SheetJS (`xlsx`) no navegador do cliente (Zero custo de CPU em servidor).
- **Backend & Auth:** Supabase (PostgreSQL com Row Level Security + Auth + Realtime).
- **Checkout & Cobrança:** Asaas (Pix Instantâneo e Cartão Recorrente sem mensalidade fixa).

---

## 📁 Estrutura do Projeto

```
confere-ai/
├── src/
│   ├── pages/
│   │   ├── LandingPage.tsx          # LP com dropzone e gerador de planilha teste
│   │   └── AuditResultPage.tsx      # Diagnóstico, paywall, RLS preview e checkout Pix
│   ├── services/
│   │   ├── auditEngine.ts           # Parser de planilhas e motor de cálculo das 3 regras
│   │   └── auditEngine.test.ts      # Testes unitários do motor matemático e parsing
│   ├── lib/
│   │   └── supabaseClient.ts        # Conexão com Supabase
│   ├── App.tsx                      # Rotas (Landing e Resultado)
│   └── main.tsx
├── supabase/
│   ├── schema.sql                   # Tabelas profiles, audits, audit_items com RLS anti-burla
│   └── functions/
│       ├── asaas-webhook/           # Webhook que confirma Pix e ativa is_pro
│       └── create-checkout/         # Cria usuário, assinatura Asaas e devolve QR Code Pix
├── .env.example
└── README.md
```

---

## ⚡ Como Rodar Localmente

1. Clone o repositório e instale as dependências:
   ```bash
   npm install
   ```

2. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Abra o navegador em `http://localhost:5173`.
   - Você pode clicar imediatamente em **"Testar com planilha de exemplo"** na página inicial para ver o fluxo completo funcionando, com diagnósticos reais gerados em memória e simulação de checkout.

4. Rodar testes unitários:
   ```bash
   npm test
   ```

5. Compilar para produção:
   ```bash
   npm run build
   ```

---

## 🛡️ Segurança & Bloqueio RLS Anti-Burla

- O visitante não pagante tem acesso a **apenas 2 linhas** completas no banco (`row_rank <= 2`).
- As demais linhas exibem apenas o valor em reais via array `blurred_preview_amounts`, sem que o ID do pedido ou SKU trafeguem no JSON da requisição (impossível burlar inspecionando no DevTools).
- Ao confirmar o Pix, o webhook do Asaas atualiza o perfil para `is_pro = true`, e o Supabase Realtime desbloqueia todas as linhas instantaneamente na tela.
