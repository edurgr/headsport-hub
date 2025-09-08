-- Remove redundant snowboard table
-- This table is not needed since we have specific tables:
-- - snowboards_boards (snowboard boards)
-- - snowboards_boots (snowboard boots)
-- - snowboards_bindings (snowboard bindings)
-- - snowboards_accessories (snowboard accessories)

-- Drop the redundant snowboard table (if it exists)
DROP TABLE IF EXISTS snowboard CASCADE;

-- Clean up any remaining references (only if table exists)
DO $$ 
BEGIN
    -- Only try to drop policies if the table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'snowboard') THEN
        DROP POLICY IF EXISTS "All users can view active snowboard" ON snowboard;
        DROP POLICY IF EXISTS "Admins can manage snowboard" ON snowboard;
        
        -- Remove any triggers on the snowboard table
        DROP TRIGGER IF EXISTS update_snowboard_updated_at ON snowboard;
        
        -- Remove any indexes on the snowboard table
        DROP INDEX IF EXISTS idx_snowboard_article;
        DROP INDEX IF EXISTS idx_snowboard_name;
        DROP INDEX IF EXISTS idx_snowboard_active;
    END IF;
END $$;

-- Grant permissions to the remaining tables
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;c
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated;
