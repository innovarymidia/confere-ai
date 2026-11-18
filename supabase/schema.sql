-- 1. EXTENSÕES NECESSÁRIAS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABELA DE PERFIS E ASSINATURAS (PROFILES)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  cpf_cnpj TEXT,
  whatsapp TEXT,
  asaas_customer_id TEXT UNIQUE,
  asaas_subscription_id TEXT,
  subscription_status TEXT NOT NULL DEFAULT 'free', -- 'free' | 'active' | 'overdue' | 'canceled'
  is_pro BOOLEAN NOT NULL DEFAULT FALSE,
  pro_expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para criar automaticamente o profile quando um usuário for criado no Auth
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. TABELA DE AUDITORIAS (CABEÇALHO E RESUMO)
CREATE TABLE IF NOT EXISTS public.audits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL enquanto for teste anônimo
  platform TEXT NOT NULL CHECK (platform IN ('mercadolivre', 'shopee')),
  total_orders_analyzed INTEGER NOT NULL DEFAULT 0,
  total_divergent_orders INTEGER NOT NULL DEFAULT 0,
  total_recoverable NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  frete_recoverable NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  comissao_recoverable NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  devolucao_recoverable NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  -- Array apenas com os valores R$ dos itens 3..N para renderizar o blur sem vazar SKU/Pedido
  blurred_preview_amounts JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audits_user_id ON public.audits(user_id);

-- 4. TABELA DE ITENS DIVERGENTES (DADOS SENSÍVEIS)
CREATE TABLE IF NOT EXISTS public.audit_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  audit_id UUID NOT NULL REFERENCES public.audits(id) ON DELETE CASCADE,
  row_rank INTEGER NOT NULL, -- Ordenado de 1 a N pelo maior valor recuperável
  order_id TEXT NOT NULL,
  sku TEXT NOT NULL,
  error_type TEXT NOT NULL CHECK (error_type IN ('frete', 'comissao', 'devolucao')),
  expected_amount NUMERIC(10, 2) NOT NULL,
  charged_amount NUMERIC(10, 2) NOT NULL,
  recoverable_amount NUMERIC(10, 2) NOT NULL,
  dispute_text TEXT NOT NULL,
  is_contested BOOLEAN NOT NULL DEFAULT FALSE,
  is_refunded BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_items_audit_rank ON public.audit_items(audit_id, row_rank);

-- 5. FUNÇÃO AUXILIAR PARA CHECAR SE O USUÁRIO LOGADO É PRO
CREATE OR REPLACE FUNCTION public.is_user_pro()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND is_pro = TRUE
      AND (pro_expires_at IS NULL OR pro_expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 6. HABILITAR ROW LEVEL SECURITY (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_items ENABLE ROW LEVEL SECURITY;

-- POLÍTICAS: PROFILES
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own basic info" ON public.profiles;
CREATE POLICY "Users can update own basic info"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND is_pro = (SELECT is_pro FROM public.profiles WHERE id = auth.uid())
  );

-- TRIGGER DE SEGURANÇA: Impede que clientes autenticados alterem is_pro, subscription_status e pro_expires_at diretamente
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS TRIGGER AS $$
BEGIN
  IF auth.role() = 'authenticated' THEN
    IF NEW.is_pro IS DISTINCT FROM OLD.is_pro
       OR NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
       OR NEW.pro_expires_at IS DISTINCT FROM OLD.pro_expires_at
       OR NEW.asaas_customer_id IS DISTINCT FROM OLD.asaas_customer_id
       OR NEW.asaas_subscription_id IS DISTINCT FROM OLD.asaas_subscription_id THEN
      RAISE EXCEPTION 'Não autorizado a alterar campos de assinatura diretamente.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_protect_profile_fields ON public.profiles;
CREATE TRIGGER trg_protect_profile_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_privileged_fields();

-- POLÍTICAS: AUDITS
DROP POLICY IF EXISTS "Anyone can create an audit" ON public.audits;
CREATE POLICY "Anyone can create an audit"
  ON public.audits FOR INSERT
  WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Anyone with audit UUID can view summary" ON public.audits;
CREATE POLICY "Anyone with audit UUID can view summary"
  ON public.audits FOR SELECT
  USING (TRUE);

DROP POLICY IF EXISTS "Users can claim anonymous audit" ON public.audits;
CREATE POLICY "Users can claim anonymous audit"
  ON public.audits FOR UPDATE
  USING (user_id IS NULL OR user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own audits" ON public.audits;
CREATE POLICY "Users can delete own audits"
  ON public.audits FOR DELETE
  USING (user_id = auth.uid());

-- POLÍTICAS: AUDIT_ITEMS (BLOQUEIO ANTI-BURLA E ANTI-TAMPERING)
DROP POLICY IF EXISTS "Anyone can insert audit items" ON public.audit_items;
CREATE POLICY "Anyone can insert audit items"
  ON public.audit_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.audits a
      WHERE a.id = audit_items.audit_id
        AND (a.user_id IS NULL OR a.user_id = auth.uid())
        AND a.created_at >= (NOW() - INTERVAL '30 minutes')
    )
  );

-- REGRA: Visitante gratuito vê APENAS row_rank <= 2.
-- Assinante PRO vê TODOS os itens das suas auditorias (ou da auditoria atual).
DROP POLICY IF EXISTS "Free sees top 2 items, Pro sees all" ON public.audit_items;
CREATE POLICY "Free sees top 2 items, Pro sees all"
  ON public.audit_items FOR SELECT
  USING (
    row_rank <= 2
    OR (
      auth.uid() IS NOT NULL
      AND public.is_user_pro() = TRUE
      AND EXISTS (
        SELECT 1 FROM public.audits a
        WHERE a.id = audit_items.audit_id
          AND (a.user_id = auth.uid() OR a.user_id IS NULL)
      )
    )
  );

DROP POLICY IF EXISTS "Pro users can update item status" ON public.audit_items;
CREATE POLICY "Pro users can update item status"
  ON public.audit_items FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND public.is_user_pro() = TRUE
    AND EXISTS (
      SELECT 1 FROM public.audits a
      WHERE a.id = audit_items.audit_id
        AND a.user_id = auth.uid()
    )
  );

-- 7. ATIVAR REALTIME NA TABELA PROFILES
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- 8. POLÍTICA DE EXCLUSÃO DE PERFIL (LGPD Art. 18, VI)
DROP POLICY IF EXISTS "Users can delete own profile" ON public.profiles;
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE
  USING (id = auth.uid());

-- 9. FUNÇÃO RPC: Exclusão de Conta Self-Service (Art. 18, VI da LGPD)
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID AS $$
DECLARE
  current_user_id UUID := auth.uid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado.';
  END IF;

  -- 1. Exclui todas as auditorias e itens do usuário (audit_items possui ON DELETE CASCADE)
  DELETE FROM public.audits WHERE user_id = current_user_id;

  -- 2. Exclui o perfil do usuário
  DELETE FROM public.profiles WHERE id = current_user_id;

  -- 3. Exclui a conta no auth.users
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. POLÍTICA DE RETENÇÃO: Purgar auditorias anônimas abandonadas após 90 dias (Art. 16 da LGPD)
CREATE OR REPLACE FUNCTION public.purge_anonymous_audits()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  WITH deleted AS (
    DELETE FROM public.audits
    WHERE user_id IS NULL
      AND created_at < (NOW() - INTERVAL '90 days')
    RETURNING id
  )
  SELECT count(*) INTO deleted_count FROM deleted;

  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
