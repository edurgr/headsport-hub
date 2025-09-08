-- Performance Optimization Indexes for HEAD Hub
-- These indexes improve query performance for common operations

-- Profiles table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_email_role ON profiles(email, role);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_name_email ON profiles(name, email);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_created_at_role ON profiles(created_at DESC, role);

-- Orders table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_status ON orders(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_status_created ON orders(status, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_athlete_email ON orders(athlete_email);

-- Order items indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_order_category ON order_items(order_id, product_category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_order_items_product_article ON order_items(product_category, product_article);

-- Equipment table indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_user_category ON equipment(user_id, product_category);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_equipment_category_article ON equipment(product_category, product_article);

-- Upload sessions indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upload_sessions_user_status ON upload_sessions(user_id, status);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upload_sessions_created_at ON upload_sessions(created_at DESC);

-- Upload files indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upload_files_session_created ON upload_files(session_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upload_files_type ON upload_files(file_type);

-- Product tables indexes (for search optimization)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ski_name_article ON ski(name, article);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ski_active_name ON ski(is_active, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bindings_name_article ON bindings(name, article);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bindings_active_name ON bindings(is_active, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boots_name_article ON boots(name, article);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boots_active_name ON boots(is_active, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helmet_name_article ON helmet(name, article);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helmet_active_name ON helmet(is_active, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goggles_name_article ON goggles(name, article);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goggles_active_name ON goggles(is_active, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snowboard_name_article ON snowboard(name, article);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snowboard_active_name ON snowboard(is_active, name);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accessories_name_article ON accessories(name, article);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accessories_active_name ON accessories(is_active, name);

-- Invitations indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_email_status ON invites(email, used);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_token_expires ON invites(token, expires_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invites_created_by ON invites(created_by);

-- Full-text search indexes for product names
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ski_name_fts ON ski USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bindings_name_fts ON bindings USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boots_name_fts ON boots USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helmet_name_fts ON helmet USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goggles_name_fts ON goggles USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snowboard_name_fts ON snowboard USING gin(to_tsvector('english', name));
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accessories_name_fts ON accessories USING gin(to_tsvector('english', name));

-- Composite indexes for common query patterns
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_profiles_role_created ON profiles(role, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_upload_sessions_user_created ON upload_sessions(user_id, created_at DESC);

-- Partial indexes for active products only
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ski_active_products ON ski(name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bindings_active_products ON bindings(name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_boots_active_products ON boots(name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_helmet_active_products ON helmet(name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_goggles_active_products ON goggles(name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_snowboard_active_products ON snowboard(name) WHERE is_active = true;
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_accessories_active_products ON accessories(name) WHERE is_active = true;

-- Analyze tables after creating indexes
ANALYZE profiles;
ANALYZE orders;
ANALYZE order_items;
ANALYZE equipment;
ANALYZE upload_sessions;
ANALYZE upload_files;
ANALYZE ski;
ANALYZE bindings;
ANALYZE boots;
ANALYZE helmet;
ANALYZE goggles;
ANALYZE snowboard;
ANALYZE accessories;
ANALYZE invites;
