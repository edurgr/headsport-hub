DROP TABLE IF EXISTS content_moderation_queue CASCADE;

DO $$ BEGIN
    CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'rejected', 'flagged');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE moderation_action AS ENUM ('approve', 'reject', 'flag', 'unflag');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'upload_files') THEN
        ALTER TABLE upload_files ADD COLUMN IF NOT EXISTS moderation_status moderation_status DEFAULT 'pending';
        ALTER TABLE upload_files ADD COLUMN IF NOT EXISTS moderated_by UUID;
        ALTER TABLE upload_files ADD COLUMN IF NOT EXISTS moderated_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE upload_files ADD COLUMN IF NOT EXISTS moderation_notes TEXT;
        ALTER TABLE upload_files ADD COLUMN IF NOT EXISTS moderation_reason TEXT;
    END IF;
END $$;

CREATE TABLE content_moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    file_id UUID NOT NULL,
    priority INTEGER DEFAULT 1,
    auto_flagged BOOLEAN DEFAULT FALSE,
    flagged_reasons TEXT[],
    assigned_to UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_moderation_queue_priority ON content_moderation_queue(priority);
CREATE INDEX idx_moderation_queue_created_at ON content_moderation_queue(created_at);

CREATE OR REPLACE FUNCTION moderate_content(
    p_file_id UUID,
    p_action moderation_action,
    p_performed_by UUID,
    p_reason TEXT DEFAULT NULL,
    p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_status moderation_status;
BEGIN
    CASE p_action
        WHEN 'approve' THEN new_status := 'approved';
        WHEN 'reject' THEN new_status := 'rejected';
        WHEN 'flag' THEN new_status := 'flagged';
        WHEN 'unflag' THEN new_status := 'pending';
    END CASE;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'upload_files') THEN
        UPDATE upload_files 
        SET 
            moderation_status = new_status,
            moderated_by = p_performed_by,
            moderated_at = NOW(),
            moderation_notes = p_notes,
            moderation_reason = p_reason
        WHERE id = p_file_id;
    END IF;
    
    IF p_action IN ('approve', 'reject') THEN
        DELETE FROM content_moderation_queue WHERE file_id = p_file_id;
    END IF;
END;
$$;

ALTER TABLE content_moderation_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage moderation" ON content_moderation_queue;

CREATE POLICY "Service role can manage moderation" ON content_moderation_queue
    FOR ALL TO service_role WITH CHECK (true);
