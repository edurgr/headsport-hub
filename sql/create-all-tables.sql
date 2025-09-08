-- HEAD Hub Database Schema - Complete Product Tables
-- Creates all product tables based on CSV structure
-- Safe to run multiple times (IF NOT EXISTS guards)

-- Enable required extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create product_category enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'product_category') THEN
        CREATE TYPE product_category AS ENUM (
            'accessories', 'bindings', 'boots', 'goggles', 'helmet', 'ski', 'snowboard',
            'snowboard_boots', 'snowboard_accessories', 'snowboard_bindings', 'snowboard_boards'
        );
    ELSE
        -- Add new snowboard categories to the enum if they don't exist
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'product_category')
            AND enumlabel = 'snowboard_boots'
        ) THEN
            ALTER TYPE product_category ADD VALUE 'snowboard_boots';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'product_category')
            AND enumlabel = 'snowboard_accessories'
        ) THEN
            ALTER TYPE product_category ADD VALUE 'snowboard_accessories';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'product_category')
            AND enumlabel = 'snowboard_bindings'
        ) THEN
            ALTER TYPE product_category ADD VALUE 'snowboard_bindings';
        END IF;
        
        IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'product_category')
            AND enumlabel = 'snowboard_boards'
        ) THEN
            ALTER TYPE product_category ADD VALUE 'snowboard_boards';
        END IF;
    END IF;
END $$;

-- ACCESSORIES table (from accessories.csv)
CREATE TABLE IF NOT EXISTS accessories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'accessories',
    length TEXT,
    colors TEXT,
    diameter TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- BOOTS table (from boots.csv)
CREATE TABLE IF NOT EXISTS boots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    category TEXT,
    name TEXT NOT NULL,
    flex TEXT,
    sizes TEXT,
    colors TEXT,
    shell TEXT,
    ergo_balance TEXT,
    forward_lean TEXT,
    ramp_angle TEXT,
    last1 TEXT,
    last2 TEXT,
    size TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- GOGGLES table (from goggles.csv)
CREATE TABLE IF NOT EXISTS goggles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'goggles',
    length TEXT,
    color TEXT,
    weather TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HELMET table (from helmets.csv)
CREATE TABLE IF NOT EXISTS helmet (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'helmet',
    sizes TEXT,
    colors TEXT,
    visor TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SNOWBOARD table (from snowboards_boards.csv - main snowboard table)
CREATE TABLE IF NOT EXISTS snowboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category TEXT,
    shape TEXT,
    skill TEXT,
    camber TEXT,
    architecture TEXT,
    graphene_or_bamboo TEXT,
    flex TEXT,
    base TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SNOWBOARDS_BOOTS table (from snowboards_boots.csv)
CREATE TABLE IF NOT EXISTS snowboards_boots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category TEXT,
    sizes TEXT,
    colors TEXT,
    flex TEXT,
    forward_lean TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SNOWBOARDS_ACCESSORIES table (from snowboards_accessories.csv)
CREATE TABLE IF NOT EXISTS snowboards_accessories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category TEXT,
    colors TEXT,
    volume TEXT,
    dimensions TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SNOWBOARDS_BINDINGS table (from snowboards_bindings.csv)
CREATE TABLE IF NOT EXISTS snowboards_bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category TEXT,
    sizes TEXT,
    colors TEXT,
    skills TEXT,
    flex TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- SNOWBOARDS_BOARDS table (from snowboards_boards.csv)
CREATE TABLE IF NOT EXISTS snowboards_boards (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category TEXT,
    shape TEXT,
    skill TEXT,
    camber TEXT,
    architecture TEXT,
    graphene_or_bamboo TEXT,
    flex TEXT,
    base TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_accessories_article ON accessories(article);
CREATE INDEX IF NOT EXISTS idx_accessories_name ON accessories(name);
CREATE INDEX IF NOT EXISTS idx_accessories_active ON accessories(is_active);

CREATE INDEX IF NOT EXISTS idx_boots_article ON boots(article);
CREATE INDEX IF NOT EXISTS idx_boots_name ON boots(name);
CREATE INDEX IF NOT EXISTS idx_boots_active ON boots(is_active);

CREATE INDEX IF NOT EXISTS idx_goggles_article ON goggles(article);
CREATE INDEX IF NOT EXISTS idx_goggles_name ON goggles(name);
CREATE INDEX IF NOT EXISTS idx_goggles_active ON goggles(is_active);

CREATE INDEX IF NOT EXISTS idx_helmet_article ON helmet(article);
CREATE INDEX IF NOT EXISTS idx_helmet_name ON helmet(name);
CREATE INDEX IF NOT EXISTS idx_helmet_active ON helmet(is_active);

CREATE INDEX IF NOT EXISTS idx_snowboard_article ON snowboard(article);
CREATE INDEX IF NOT EXISTS idx_snowboard_name ON snowboard(name);
CREATE INDEX IF NOT EXISTS idx_snowboard_active ON snowboard(is_active);

CREATE INDEX IF NOT EXISTS idx_snowboards_boots_article ON snowboards_boots(article);
CREATE INDEX IF NOT EXISTS idx_snowboards_boots_name ON snowboards_boots(name);
CREATE INDEX IF NOT EXISTS idx_snowboards_boots_active ON snowboards_boots(is_active);

CREATE INDEX IF NOT EXISTS idx_snowboards_accessories_article ON snowboards_accessories(article);
CREATE INDEX IF NOT EXISTS idx_snowboards_accessories_name ON snowboards_accessories(name);
CREATE INDEX IF NOT EXISTS idx_snowboards_accessories_active ON snowboards_accessories(is_active);

CREATE INDEX IF NOT EXISTS idx_snowboards_bindings_article ON snowboards_bindings(article);
CREATE INDEX IF NOT EXISTS idx_snowboards_bindings_name ON snowboards_bindings(name);
CREATE INDEX IF NOT EXISTS idx_snowboards_bindings_active ON snowboards_bindings(is_active);

CREATE INDEX IF NOT EXISTS idx_snowboards_boards_article ON snowboards_boards(article);
CREATE INDEX IF NOT EXISTS idx_snowboards_boards_name ON snowboards_boards(name);
CREATE INDEX IF NOT EXISTS idx_snowboards_boards_active ON snowboards_boards(is_active);

-- Enable Row Level Security (RLS)
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE boots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE helmet ENABLE ROW LEVEL SECURITY;
ALTER TABLE snowboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE snowboards_boots ENABLE ROW LEVEL SECURITY;
ALTER TABLE snowboards_accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE snowboards_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE snowboards_boards ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role (reuse existing if available)
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = user_id);
END;
$$;

-- Helper function to check if user is admin (reuse existing if available)
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN get_user_role(user_id) = 'admin';
END;
$$;

-- Row Level Security Policies for all tables

-- Accessories policies
CREATE POLICY "All users can view active accessories" ON accessories
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage accessories" ON accessories
    FOR ALL USING (is_admin(auth.uid()));

-- Boots policies
CREATE POLICY "All users can view active boots" ON boots
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage boots" ON boots
    FOR ALL USING (is_admin(auth.uid()));

-- Goggles policies
CREATE POLICY "All users can view active goggles" ON goggles
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage goggles" ON goggles
    FOR ALL USING (is_admin(auth.uid()));

-- Helmet policies
CREATE POLICY "All users can view active helmet" ON helmet
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage helmet" ON helmet
    FOR ALL USING (is_admin(auth.uid()));

-- Snowboard policies
CREATE POLICY "All users can view active snowboard" ON snowboard
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage snowboard" ON snowboard
    FOR ALL USING (is_admin(auth.uid()));

-- Snowboard Boots policies
CREATE POLICY "All users can view active snowboards_boots" ON snowboards_boots
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage snowboards_boots" ON snowboards_boots
    FOR ALL USING (is_admin(auth.uid()));

-- Snowboard Accessories policies
CREATE POLICY "All users can view active snowboards_accessories" ON snowboards_accessories
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage snowboards_accessories" ON snowboards_accessories
    FOR ALL USING (is_admin(auth.uid()));

-- Snowboard Bindings policies
CREATE POLICY "All users can view active snowboards_bindings" ON snowboards_bindings
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage snowboards_bindings" ON snowboards_bindings
    FOR ALL USING (is_admin(auth.uid()));

-- Snowboard Boards policies
CREATE POLICY "All users can view active snowboards_boards" ON snowboards_boards
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage snowboards_boards" ON snowboards_boards
    FOR ALL USING (is_admin(auth.uid()));

-- Function to update updated_at timestamp (reuse existing if available)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_accessories_updated_at ON accessories;
CREATE TRIGGER update_accessories_updated_at BEFORE UPDATE ON accessories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_boots_updated_at ON boots;
CREATE TRIGGER update_boots_updated_at BEFORE UPDATE ON boots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_goggles_updated_at ON goggles;
CREATE TRIGGER update_goggles_updated_at BEFORE UPDATE ON goggles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_helmet_updated_at ON helmet;
CREATE TRIGGER update_helmet_updated_at BEFORE UPDATE ON helmet
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_snowboard_updated_at ON snowboard;
CREATE TRIGGER update_snowboard_updated_at BEFORE UPDATE ON snowboard
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_snowboards_boots_updated_at ON snowboards_boots;
CREATE TRIGGER update_snowboards_boots_updated_at BEFORE UPDATE ON snowboards_boots
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_snowboards_accessories_updated_at ON snowboards_accessories;
CREATE TRIGGER update_snowboards_accessories_updated_at BEFORE UPDATE ON snowboards_accessories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_snowboards_bindings_updated_at ON snowboards_bindings;
CREATE TRIGGER update_snowboards_bindings_updated_at BEFORE UPDATE ON snowboards_bindings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_snowboards_boards_updated_at ON snowboards_boards;
CREATE TRIGGER update_snowboards_boards_updated_at BEFORE UPDATE ON snowboards_boards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create comments to indicate the schema is complete
COMMENT ON TABLE accessories IS 'Accessories products from CSV data';
COMMENT ON TABLE boots IS 'Boots products from CSV data';
COMMENT ON TABLE goggles IS 'Goggles products from CSV data';
COMMENT ON TABLE helmet IS 'Helmet products from CSV data';
COMMENT ON TABLE snowboard IS 'Snowboard products from CSV data';
COMMENT ON TABLE snowboards_boots IS 'Snowboard boots products from CSV data';
COMMENT ON TABLE snowboards_accessories IS 'Snowboard accessories products from CSV data';
COMMENT ON TABLE snowboards_bindings IS 'Snowboard bindings products from CSV data';
COMMENT ON TABLE snowboards_boards IS 'Snowboard boards products from CSV data';
