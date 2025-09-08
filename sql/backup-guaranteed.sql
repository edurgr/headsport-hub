DROP TABLE IF EXISTS backup_operations CASCADE;

DO $$ BEGIN
    CREATE TYPE backup_status AS ENUM ('pending', 'in_progress', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE backup_type AS ENUM ('full', 'incremental', 'schema_only', 'data_only');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE backup_operations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type backup_type NOT NULL,
    status backup_status DEFAULT 'pending',
    file_path TEXT,
    file_size BIGINT,
    tables_included TEXT[],
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_backup_operations_status ON backup_operations(status);
CREATE INDEX idx_backup_operations_type ON backup_operations(type);
CREATE INDEX idx_backup_operations_started_at ON backup_operations(started_at);

CREATE OR REPLACE FUNCTION create_backup_operation(
    p_type backup_type,
    p_tables_included TEXT[] DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    backup_id UUID;
BEGIN
    INSERT INTO backup_operations (
        type,
        tables_included,
        created_by
    ) VALUES (
        p_type,
        p_tables_included,
        p_created_by
    ) RETURNING id INTO backup_id;
    
    RETURN backup_id;
END;
$$;

ALTER TABLE backup_operations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage backups" ON backup_operations;

CREATE POLICY "Service role can manage backups" ON backup_operations
    FOR ALL TO service_role WITH CHECK (true);
