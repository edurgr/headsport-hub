-- Crear tabla products faltante
CREATE TABLE IF NOT EXISTS public.products (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    vertical_number TEXT,
    category TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_active ON public.products(is_active);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Products are viewable by everyone" ON public.products
    FOR SELECT USING (true);

CREATE POLICY "Products are insertable by authenticated users" ON public.products
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Products are updatable by authenticated users" ON public.products
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Products are deletable by authenticated users" ON public.products
    FOR DELETE USING (auth.role() = 'authenticated');

-- Insertar algunos productos de ejemplo
INSERT INTO public.products (name, sku, vertical_number, category, is_active) VALUES
('Casco HEAD', 'HELMET-001', 'V001', 'helmet', true),
('Botas de Esquí', 'BOOTS-001', 'V002', 'boots', true),
('Esquís HEAD', 'SKI-001', 'V003', 'ski', true),
('Accesorio HEAD', 'ACC-001', 'V004', 'accessories', true)
ON CONFLICT (sku) DO NOTHING;

