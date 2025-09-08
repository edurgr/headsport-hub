-- Products + Orders schema for SKIS & Bindings integration
-- Safe to run multiple times (IF NOT EXISTS guards)

-- Extensions (if not present)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- NORMALIZED PRODUCT TABLES

-- SKI
CREATE TABLE IF NOT EXISTS public.ski (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article TEXT NOT NULL UNIQUE,
  ver TEXT,
  lang TEXT DEFAULT 'EN',
  name TEXT NOT NULL,
  category TEXT DEFAULT 'ski',
  length TEXT,
  radius TEXT,
  sidecut TEXT,
  plate TEXT,
  bindings TEXT,
  length_list TEXT,
  radius_value NUMERIC,
  radius_length TEXT,
  sidecut_top TEXT,
  sidecut_mid TEXT,
  sidecut_tail TEXT,
  sidecut_length TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ski_article ON public.ski(article);
CREATE INDEX IF NOT EXISTS idx_ski_name ON public.ski(name);
CREATE INDEX IF NOT EXISTS idx_ski_active ON public.ski(is_active);

-- BINDINGS
CREATE TABLE IF NOT EXISTS public.bindings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  article TEXT NOT NULL UNIQUE,
  ver TEXT,
  lang TEXT DEFAULT 'EN',
  name TEXT NOT NULL,
  category TEXT DEFAULT 'bindings',
  stand_height TEXT,
  din TEXT,
  weight TEXT,
  din_min NUMERIC,
  din_max NUMERIC,
  weight_value NUMERIC,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bindings_article ON public.bindings(article);
CREATE INDEX IF NOT EXISTS idx_bindings_name ON public.bindings(name);
CREATE INDEX IF NOT EXISTS idx_bindings_active ON public.bindings(is_active);

-- Update trigger to keep updated_at fresh
DO $$ BEGIN
  CREATE OR REPLACE FUNCTION public.set_updated_at()
  RETURNS TRIGGER AS $fn$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $fn$ LANGUAGE plpgsql;
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_ski_updated_at
  BEFORE UPDATE ON public.ski
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION
  WHEN others THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_bindings_updated_at
  BEFORE UPDATE ON public.bindings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- ORDERS TABLE (aligned to app/src/app/api/send-order/route.ts)
CREATE TABLE IF NOT EXISTS public.orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  athlete_id UUID,            -- references profiles(id) if available
  athlete_email TEXT,
  athlete_name TEXT,
  status TEXT DEFAULT 'pending_approval',
  shipping_address JSONB,
  notes TEXT,
  approved_by_email TEXT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at);

DO $$ BEGIN
  CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION
  WHEN others THEN NULL;
END $$;

-- Backfill compatible migration (if table already existed)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS approved_by_email TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

-- ORDER ITEMS TABLE (aligned to send-order inserts)
CREATE TABLE IF NOT EXISTS public.order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id TEXT,           -- we store article from products
  product_name TEXT,
  product_sku TEXT,
  product_category TEXT,
  length_cm NUMERIC,
  quantity INTEGER DEFAULT 1,
  boot_size TEXT,
  binding_color TEXT,
  unit_price NUMERIC(10,2) DEFAULT 0,
  total_price NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_sku ON public.order_items(product_sku);

-- Minimal RLS policies
ALTER TABLE public.ski ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read active products (catalog)
DO $$ BEGIN
  CREATE POLICY ski_select_active ON public.ski
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY bindings_select_active ON public.bindings
  FOR SELECT TO anon, authenticated
  USING (is_active = TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Allow authenticated users to manage their orders via the API layer
DO $$ BEGIN
  CREATE POLICY orders_select_all ON public.orders
  FOR SELECT TO authenticated
  USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY orders_insert_all ON public.orders
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY orders_update_all ON public.orders
  FOR UPDATE TO authenticated
  USING (TRUE) WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Order items policies (tie to order)
DO $$ BEGIN
  CREATE POLICY order_items_select_all ON public.order_items
  FOR SELECT TO authenticated
  USING (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY order_items_insert_all ON public.order_items
  FOR INSERT TO authenticated
  WITH CHECK (TRUE);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Note: Service Role bypasses RLS, so the importer can upsert products


