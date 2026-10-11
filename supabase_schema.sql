-- ==============================================================================
-- KUTXI SAAS — SUPABASE DATABASE SCHEMA MIGRATION
-- Plataforma SaaS de Convites de Casamento Digitais, RSVP & Gestão de Convidados
-- ==============================================================================

-- 1. TABELA DE CLIENTES (CASAMENTOS SAAS)
CREATE TABLE IF NOT EXISTS public.kutxi_clients (
    id TEXT PRIMARY KEY,
    client_name TEXT NOT NULL,
    subdomain TEXT,
    plan TEXT DEFAULT 'Premium',
    status TEXT DEFAULT 'Active',
    wedding_date TEXT,
    email TEXT,
    paid_amount NUMERIC DEFAULT 0,
    config JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. TABELA DE CONFIGURAÇÃO DO CASAMENTO (DESIGN, CONVITE, LOCAL, TEMA)
CREATE TABLE IF NOT EXISTS public.kutxi_wedding_configs (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    config_json JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. TABELA DE CONVIDADOS (RSVP, PORTARIA, CHECK-IN QR CODE)
CREATE TABLE IF NOT EXISTS public.kutxi_guests (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    group_name TEXT DEFAULT 'Geral',
    table_number TEXT,
    rsvp_token TEXT NOT NULL,
    status TEXT DEFAULT 'Pending',
    max_plus_ones INT DEFAULT 0,
    plus_ones_confirmed INT DEFAULT 0,
    companions JSONB DEFAULT '[]'::jsonb,
    dietary TEXT,
    notes TEXT,
    invitation_views INT DEFAULT 0,
    checked_in BOOLEAN DEFAULT false,
    checked_in_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. TABELA DE LISTA DE PRESENTES
CREATE TABLE IF NOT EXISTS public.kutxi_gift_registry (
    id TEXT PRIMARY KEY,
    client_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT DEFAULT 'eletro',
    price NUMERIC DEFAULT 0,
    image_url TEXT,
    description TEXT,
    is_purchased BOOLEAN DEFAULT false,
    claimed_by TEXT,
    guest_message TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. TABELA DE LOGS DE AUDITORIA DO SISTEMA
CREATE TABLE IF NOT EXISTS public.kutxi_audit_logs (
    id TEXT PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    details TEXT,
    ip TEXT
);

-- ==============================================================================
-- ÍNDICES PARA BUSCA RÁPIDA DE CONVITES E RSVP
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_kutxi_guests_client_id ON public.kutxi_guests(client_id);
CREATE INDEX IF NOT EXISTS idx_kutxi_guests_rsvp_token ON public.kutxi_guests(rsvp_token);
CREATE INDEX IF NOT EXISTS idx_kutxi_wedding_configs_client_id ON public.kutxi_wedding_configs(client_id);
CREATE INDEX IF NOT EXISTS idx_kutxi_gift_registry_client_id ON public.kutxi_gift_registry(client_id);

-- ==============================================================================
-- POLÍTICAS DE ACESSO (ROW LEVEL SECURITY - RLS)
-- Permite leitura e escrita pelo applet Kutxi via Anon Key
-- ==============================================================================
ALTER TABLE public.kutxi_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kutxi_wedding_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kutxi_guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kutxi_gift_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kutxi_audit_logs ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Public access kutxi_clients" ON public.kutxi_clients;
    CREATE POLICY "Public access kutxi_clients" ON public.kutxi_clients FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access kutxi_wedding_configs" ON public.kutxi_wedding_configs;
    CREATE POLICY "Public access kutxi_wedding_configs" ON public.kutxi_wedding_configs FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access kutxi_guests" ON public.kutxi_guests;
    CREATE POLICY "Public access kutxi_guests" ON public.kutxi_guests FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access kutxi_gift_registry" ON public.kutxi_gift_registry;
    CREATE POLICY "Public access kutxi_gift_registry" ON public.kutxi_gift_registry FOR ALL USING (true) WITH CHECK (true);

    DROP POLICY IF EXISTS "Public access kutxi_audit_logs" ON public.kutxi_audit_logs;
    CREATE POLICY "Public access kutxi_audit_logs" ON public.kutxi_audit_logs FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Habilita publicação em tempo real para sincronização de RSVP e Portaria
ALTER PUBLICATION supabase_realtime ADD TABLE public.kutxi_guests;
