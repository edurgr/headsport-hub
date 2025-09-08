-- HEAD Hub Database Schema
-- Complete schema with all product tables, role-based access control, and business logic
-- Based on CSV data structures and application requirements

-- Enable required extensions (safe to run multiple times)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom types safely (only if they don't exist)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('athlete', 'manager', 'admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE order_status AS ENUM ('pending_approval', 'approved', 'rejected', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Handle product_category enum carefully - drop and recreate if it has wrong values
DO $$ 
BEGIN
    -- If the enum exists with wrong values, drop it completely
    IF EXISTS (
        SELECT 1 FROM pg_type 
        WHERE typname = 'product_category' 
        AND EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumtypid = pg_type.oid 
            AND enumlabel IN ('helmets', 'skis', 'snowboards')
        )
    ) THEN
        -- Drop the enum and all dependent objects
        DROP TYPE IF EXISTS product_category CASCADE;
    END IF;
    
    -- Create the enum with correct values
    CREATE TYPE product_category AS ENUM ('accessories', 'bindings', 'boots', 'goggles', 'helmet', 'ski', 'snowboard');
EXCEPTION
    WHEN duplicate_object THEN 
        -- If it already exists with correct values, do nothing
        null;
END $$;

DO $$ BEGIN
    CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE upload_status AS ENUM ('uploading', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE file_type AS ENUM ('image', 'video', 'document', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users and Authentication (Supabase handles auth.users, we need profiles)
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role user_role NOT NULL DEFAULT 'athlete',
    name TEXT,
    email TEXT UNIQUE,
    organization TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    postal_code TEXT,
    country TEXT DEFAULT 'US',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Organization settings
CREATE TABLE IF NOT EXISTS org_settings (
    id SERIAL PRIMARY KEY,
    orders_enabled BOOLEAN DEFAULT TRUE,
    max_order_value DECIMAL(10,2) DEFAULT 10000.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default org settings (safe to run multiple times)
INSERT INTO org_settings (orders_enabled, max_order_value) 
VALUES (TRUE, 10000.00) 
ON CONFLICT DO NOTHING;

-- Invitations system
CREATE TABLE IF NOT EXISTS invites (
    id SERIAL PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    role_preset user_role NOT NULL DEFAULT 'athlete',
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES profiles(id),
    message TEXT
);

-- Product tables based on CSV structure

-- Accessories table (poles, bags, etc.)
CREATE TABLE IF NOT EXISTS accessories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'accessories',
    diameter TEXT,
    length TEXT,
    colors TEXT,
    length_list TEXT,
    colors_list TEXT,
    diameter_value NUMERIC,
    langd TEXT,
    farger TEXT,
    volym NUMERIC,
    dimensioner TEXT,
    vikt NUMERIC,
    materialsammansattning_utsida TEXT,
    materialsammansattning_insida TEXT,
    volume TEXT,
    dimensions TEXT,
    weight TEXT,
    material_composition_outside TEXT,
    material_composition_inside TEXT,
    weight_value NUMERIC,
    volume_value NUMERIC,
    dimension_1 NUMERIC,
    dimension_2 NUMERIC,
    dimension_3 NUMERIC,
    width TEXT,
    width_top NUMERIC,
    width_mid TEXT,
    width_tail NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bindings table
CREATE TABLE IF NOT EXISTS bindings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'bindings',
    stand_height TEXT,
    din TEXT,
    weight TEXT,
    din_min NUMERIC,
    din_max NUMERIC,
    weight_value NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Boots table
CREATE TABLE IF NOT EXISTS boots (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'boots',
    flex TEXT,
    sizes TEXT,
    colors TEXT,
    shell TEXT,
    ergo_balance TEXT,
    forward_lean TEXT,
    ramp_angle TEXT,
    last TEXT,
    last_2 TEXT,
    size TEXT,
    flex_values TEXT,
    sizes_min NUMERIC,
    sizes_max NUMERIC,
    size_list TEXT,
    colors_list TEXT,
    terrain TEXT,
    skill TEXT,
    forward_lean_angle TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Goggles table
CREATE TABLE IF NOT EXISTS goggles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'goggles',
    lens TEXT,
    color TEXT,
    color_list TEXT,
    lens_color TEXT,
    lens_s TEXT,
    lens_vlt TEXT,
    weather_condition TEXT,
    sunny TEXT,
    overcast TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Helmets table
CREATE TABLE IF NOT EXISTS helmet (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'helmet',
    sizes TEXT,
    colors TEXT,
    shell TEXT,
    visor TEXT,
    visor_s_min TEXT,
    visor_s_max TEXT,
    visor_vlt_max TEXT,
    visor_vlt_min TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Skis table
CREATE TABLE IF NOT EXISTS ski (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'ski',
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Snowboards table
CREATE TABLE IF NOT EXISTS snowboard (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article TEXT NOT NULL UNIQUE,
    ver TEXT,
    lang TEXT DEFAULT 'EN',
    name TEXT NOT NULL,
    category product_category DEFAULT 'snowboard',
    shape TEXT,
    skill TEXT,
    camber TEXT,
    architecture TEXT,
    flex_index TEXT,
    base TEXT,
    facts TEXT,
    sizes TEXT,
    colors TEXT,
    intermediate TEXT,
    sizes_min NUMERIC,
    sizes_max NUMERIC,
    colors_list TEXT,
    forward_lean TEXT,
    volume_l TEXT,
    dimensions TEXT,
    dimension_1 NUMERIC,
    dimension_2 NUMERIC,
    dimension_3 NUMERIC,
    width TEXT,
    width_top NUMERIC,
    width_mid TEXT,
    width_tail NUMERIC,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    status order_status DEFAULT 'pending_approval',
    total_amount DECIMAL(10,2) DEFAULT 0.00,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Order items table
CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_category product_category NOT NULL,
    product_article TEXT NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10,2) DEFAULT 0.00,
    total_price DECIMAL(10,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS equipment (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_category product_category NOT NULL,
    product_article TEXT NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upload sessions table
CREATE TABLE IF NOT EXISTS upload_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status upload_status DEFAULT 'uploading',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Upload files table
CREATE TABLE IF NOT EXISTS upload_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID NOT NULL REFERENCES upload_sessions(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size BIGINT,
    file_type file_type DEFAULT 'other',
    mime_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

CREATE INDEX IF NOT EXISTS idx_invites_email ON invites(email);
CREATE INDEX IF NOT EXISTS idx_invites_token ON invites(token);
CREATE INDEX IF NOT EXISTS idx_invites_expires ON invites(expires_at);

CREATE INDEX IF NOT EXISTS idx_accessories_article ON accessories(article);
CREATE INDEX IF NOT EXISTS idx_accessories_name ON accessories(name);
CREATE INDEX IF NOT EXISTS idx_accessories_active ON accessories(is_active);

CREATE INDEX IF NOT EXISTS idx_bindings_article ON bindings(article);
CREATE INDEX IF NOT EXISTS idx_bindings_name ON bindings(name);
CREATE INDEX IF NOT EXISTS idx_bindings_active ON bindings(is_active);

CREATE INDEX IF NOT EXISTS idx_boots_article ON boots(article);
CREATE INDEX IF NOT EXISTS idx_boots_name ON boots(name);
CREATE INDEX IF NOT EXISTS idx_boots_active ON boots(is_active);

CREATE INDEX IF NOT EXISTS idx_goggles_article ON goggles(article);
CREATE INDEX IF NOT EXISTS idx_goggles_name ON goggles(name);
CREATE INDEX IF NOT EXISTS idx_goggles_active ON goggles(is_active);

CREATE INDEX IF NOT EXISTS idx_helmet_article ON helmet(article);
CREATE INDEX IF NOT EXISTS idx_helmet_name ON helmet(name);
CREATE INDEX IF NOT EXISTS idx_helmet_active ON helmet(is_active);

CREATE INDEX IF NOT EXISTS idx_ski_article ON ski(article);
CREATE INDEX IF NOT EXISTS idx_ski_name ON ski(name);
CREATE INDEX IF NOT EXISTS idx_ski_active ON ski(is_active);

CREATE INDEX IF NOT EXISTS idx_snowboard_article ON snowboard(article);
CREATE INDEX IF NOT EXISTS idx_snowboard_name ON snowboard(name);
CREATE INDEX IF NOT EXISTS idx_snowboard_active ON snowboard(is_active);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product ON order_items(product_category, product_article);

CREATE INDEX IF NOT EXISTS idx_equipment_user_id ON equipment(user_id);
CREATE INDEX IF NOT EXISTS idx_equipment_product ON equipment(product_category, product_article);

CREATE INDEX IF NOT EXISTS idx_upload_sessions_user_id ON upload_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_upload_sessions_status ON upload_sessions(status);

CREATE INDEX IF NOT EXISTS idx_upload_files_session_id ON upload_files(session_id);

-- Row Level Security (RLS) Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accessories ENABLE ROW LEVEL SECURITY;
ALTER TABLE bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE boots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goggles ENABLE ROW LEVEL SECURITY;
ALTER TABLE helmet ENABLE ROW LEVEL SECURITY;
ALTER TABLE ski ENABLE ROW LEVEL SECURITY;
ALTER TABLE snowboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_files ENABLE ROW LEVEL SECURITY;

-- Helper function to get user role
DROP FUNCTION IF EXISTS get_user_role(UUID);
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID)
RETURNS user_role
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN (SELECT role FROM profiles WHERE id = user_id);
END;
$$;

-- Helper function to check if user is admin
DROP FUNCTION IF EXISTS is_admin(UUID);
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN get_user_role(user_id) = 'admin';
END;
$$;

-- Helper function to check if user is manager or admin
DROP FUNCTION IF EXISTS is_manager_or_admin(UUID);
CREATE OR REPLACE FUNCTION is_manager_or_admin(user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN get_user_role(user_id) IN ('manager', 'admin');
END;
$$;

-- Profiles policies
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Managers and admins can view all profiles" ON profiles
    FOR SELECT USING (is_manager_or_admin(auth.uid()));

-- Allow inserts via system roles used by Supabase internals (signup/admin)
DROP POLICY IF EXISTS "Allow insert via service role" ON profiles;
CREATE POLICY "Allow insert via service role" ON profiles
    FOR INSERT TO service_role WITH CHECK (TRUE);

DROP POLICY IF EXISTS "Allow insert via auth admin" ON profiles;
CREATE POLICY "Allow insert via auth admin" ON profiles
    FOR INSERT TO supabase_auth_admin WITH CHECK (TRUE);

-- Product table policies (similar for all product tables)
CREATE POLICY "All users can view active accessories" ON accessories
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage accessories" ON accessories
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All users can view active bindings" ON bindings
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage bindings" ON bindings
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All users can view active boots" ON boots
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage boots" ON boots
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All users can view active goggles" ON goggles
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage goggles" ON goggles
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All users can view active helmet" ON helmet
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage helmet" ON helmet
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All users can view active ski" ON ski
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage ski" ON ski
    FOR ALL USING (is_admin(auth.uid()));

CREATE POLICY "All users can view active snowboard" ON snowboard
    FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "Admins can manage snowboard" ON snowboard
    FOR ALL USING (is_admin(auth.uid()));

-- Orders policies
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own pending orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id AND status = 'pending_approval');

CREATE POLICY "Managers and admins can view all orders" ON orders
    FOR SELECT USING (is_manager_or_admin(auth.uid()));

CREATE POLICY "Managers and admins can update orders" ON orders
    FOR UPDATE USING (is_manager_or_admin(auth.uid()));

-- Order items policies
CREATE POLICY "Users can view their own order items" ON order_items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage items in their own pending orders" ON order_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM orders 
            WHERE orders.id = order_items.order_id 
            AND orders.user_id = auth.uid() 
            AND orders.status = 'pending_approval'
        )
    );

CREATE POLICY "Managers and admins can view all order items" ON order_items
    FOR SELECT USING (is_manager_or_admin(auth.uid()));

-- Equipment policies
CREATE POLICY "Users can view their own equipment" ON equipment
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own equipment" ON equipment
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins can view all equipment" ON equipment
    FOR SELECT USING (is_manager_or_admin(auth.uid()));

-- Upload sessions policies
CREATE POLICY "Users can view their own upload sessions" ON upload_sessions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own upload sessions" ON upload_sessions
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Managers and admins can view all upload sessions" ON upload_sessions
    FOR SELECT USING (is_manager_or_admin(auth.uid()));

-- Upload files policies
CREATE POLICY "Users can view files from their own sessions" ON upload_files
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM upload_sessions 
            WHERE upload_sessions.id = upload_files.session_id 
            AND upload_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can manage files in their own sessions" ON upload_files
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM upload_sessions 
            WHERE upload_sessions.id = upload_files.session_id 
            AND upload_sessions.user_id = auth.uid()
        )
    );

CREATE POLICY "Managers and admins can view all upload files" ON upload_files
    FOR SELECT USING (is_manager_or_admin(auth.uid()));

-- Function to update updated_at timestamp
DROP FUNCTION IF EXISTS update_updated_at_column();
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at columns
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accessories_updated_at ON accessories;
CREATE TRIGGER update_accessories_updated_at BEFORE UPDATE ON accessories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bindings_updated_at ON bindings;
CREATE TRIGGER update_bindings_updated_at BEFORE UPDATE ON bindings
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

DROP TRIGGER IF EXISTS update_ski_updated_at ON ski;
CREATE TRIGGER update_ski_updated_at BEFORE UPDATE ON ski
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_snowboard_updated_at ON snowboard;
CREATE TRIGGER update_snowboard_updated_at BEFORE UPDATE ON snowboard
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_orders_updated_at ON orders;
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_equipment_updated_at ON equipment;
CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON equipment
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_upload_sessions_updated_at ON upload_sessions;
CREATE TRIGGER update_upload_sessions_updated_at BEFORE UPDATE ON upload_sessions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to create a profile when a user signs up
-- Remove any leftover example triggers/functions from templates that may reference non-existent columns
DROP TRIGGER IF EXISTS handle_new_user ON auth.users;
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS public.set_user_profile() CASCADE;

-- Robust trigger to create or update profile on signup, avoiding email conflicts
DROP TRIGGER IF EXISTS create_profile_on_signup ON auth.users;
DROP FUNCTION IF EXISTS public.create_profile_for_user() CASCADE;
CREATE OR REPLACE FUNCTION public.create_profile_for_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Remove any profile row that has the same email but a different id to avoid UNIQUE(email) conflicts
    DELETE FROM public.profiles
    WHERE email = NEW.email AND id <> NEW.id;

    -- Insert or update the profile for this auth user
    INSERT INTO public.profiles (id, email, role)
    VALUES (NEW.id, NEW.email, 'athlete')
    ON CONFLICT (id) DO UPDATE
        SET email = excluded.email,
            updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Ensure the owner is postgres so SECURITY DEFINER bypasses RLS correctly
ALTER FUNCTION public.create_profile_for_user() OWNER TO postgres;

-- Trigger to automatically create profile when user signs up
CREATE TRIGGER create_profile_on_signup
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.create_profile_for_user();

-- Function to create test users (for managers and admins)
DROP FUNCTION IF EXISTS create_test_user(TEXT, user_role, TEXT, TEXT);
CREATE OR REPLACE FUNCTION create_test_user(
    test_email TEXT,
    test_role user_role,
    test_name TEXT DEFAULT NULL,
    test_organization TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_user_id UUID;
    new_profile_id UUID;
    test_token TEXT;
BEGIN
    -- Check if the current user has permission to create test users
    IF NOT is_manager_or_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only managers and admins can create test users';
    END IF;
    
    -- Generate a new UUID for the test user
    new_user_id := uuid_generate_v4();
    
    -- Create a test user in auth.users (this is a mock user for testing)
    -- In a real scenario, you might want to create actual auth users
    -- For now, we'll create a profile that can be used with the demo system
    
    -- Create the profile
    INSERT INTO profiles (id, email, role, name, organization)
    VALUES (new_user_id, test_email, test_role, test_name, test_organization);
    
    -- Generate a test token for this user
    test_token := encode(gen_random_bytes(32), 'hex');
    
    -- Create an invitation for this test user
    INSERT INTO invites (email, role_preset, token, expires_at, used, created_by, message)
    VALUES (
        test_email, 
        test_role, 
        test_token, 
        NOW() + INTERVAL '30 days',
        false,
        auth.uid(),
        'Test user account created for development purposes'
    );
    
    RETURN test_token;
END;
$$;

-- Function to list test users (for managers and admins)
DROP FUNCTION IF EXISTS list_test_users();
CREATE OR REPLACE FUNCTION list_test_users()
RETURNS TABLE(
    user_id UUID,
    email TEXT,
    role user_role,
    name TEXT,
    organization TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if the current user has permission to list test users
    IF NOT is_manager_or_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only managers and admins can list test users';
    END IF;
    
    RETURN QUERY
    SELECT 
        p.id,
        p.email,
        p.role,
        p.name,
        p.organization,
        p.created_at,
        p.updated_at as last_login
    FROM profiles p
    WHERE p.email LIKE '%@test.com' OR p.email LIKE '%@example.com' OR p.email LIKE '%@headhub.com'
    ORDER BY p.created_at DESC;
END;
$$;

-- Function to delete a test user (for admins only)
DROP FUNCTION IF EXISTS delete_test_user(TEXT);
CREATE OR REPLACE FUNCTION delete_test_user(test_email TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id_to_delete UUID;
BEGIN
    -- Check if the current user has permission to delete test users
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can delete test users';
    END IF;
    
    -- Get the user ID to delete
    SELECT id INTO user_id_to_delete FROM profiles WHERE email = test_email;
    
    IF user_id_to_delete IS NULL THEN
        RAISE EXCEPTION 'Test user not found: %', test_email;
    END IF;
    
    -- Delete the user and all related data (cascading delete)
    DELETE FROM profiles WHERE id = user_id_to_delete;
    
    -- Also delete any related invites
    DELETE FROM invites WHERE email = test_email;
    
    RETURN TRUE;
END;
$$;

-- Function to create demo data (for managers and admins)
DROP FUNCTION IF EXISTS create_demo_data();
CREATE OR REPLACE FUNCTION create_demo_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result TEXT;
BEGIN
    -- Check if the current user has permission to create demo data
    IF NOT is_manager_or_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only managers and admins can create demo data';
    END IF;
    
    -- Create demo users
    PERFORM create_test_user('admin@headhub.com', 'admin', 'Demo Admin', 'HEAD Hub');
PERFORM create_test_user('manager@headhub.com', 'manager', 'Demo Manager', 'HEAD Hub');
PERFORM create_test_user('athlete@headhub.com', 'athlete', 'Demo Athlete', 'HEAD Hub');
    
    result := 'Demo data created successfully: admin@headhub.com, manager@headhub.com, athlete@headhub.com';
    RETURN result;
END;
$$;

-- Function to cleanup all demo data (for admins only)
DROP FUNCTION IF EXISTS cleanup_demo_data();
CREATE OR REPLACE FUNCTION cleanup_demo_data()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Check if the current user has permission to cleanup demo data
    IF NOT is_admin(auth.uid()) THEN
        RAISE EXCEPTION 'Only admins can cleanup demo data';
    END IF;
    
    -- Delete all profiles with @headhub.com emails
DELETE FROM profiles WHERE email LIKE '%@headhub.com';
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Also delete any related invites
    DELETE FROM invites WHERE email LIKE '%@headhub.com';
    
    RETURN 'Demo data cleanup completed. Deleted ' || deleted_count || ' profiles.';
END;
$$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;

-- Create a comment to indicate the schema is complete
COMMENT ON SCHEMA public IS 'HEAD Hub Database Schema - Complete and ready for use';
