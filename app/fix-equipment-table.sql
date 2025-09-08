-- Crear tabla equipment faltante
CREATE TABLE IF NOT EXISTS public.equipment (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    product_category TEXT NOT NULL,
    product_article TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON public.equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_category ON public.equipment(product_category);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;

-- Crear políticas de seguridad
CREATE POLICY "Equipment is viewable by owner" ON public.equipment
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Equipment is insertable by authenticated users" ON public.equipment
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Equipment is updatable by owner" ON public.equipment
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Equipment is deletable by owner" ON public.equipment
    FOR DELETE USING (auth.uid() = user_id);

