SELECT 'TABLES CREATED:' as status;
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('audit_logs', 'notifications', 'backup_operations', 'content_moderation_queue')
ORDER BY table_name;

SELECT 'FUNCTIONS CREATED:' as status;
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('log_admin_action', 'create_notification', 'create_backup_operation', 'moderate_content')
ORDER BY routine_name;

SELECT 'TYPES CREATED:' as status;
SELECT typname FROM pg_type 
WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
AND typname IN ('notification_type', 'notification_priority', 'notification_status', 'backup_status', 'backup_type', 'moderation_status', 'moderation_action')
ORDER BY typname;

SELECT 'TESTING AUDIT LOGS:' as status;
SELECT log_admin_action(
    NULL,
    'test@example.com',
    'test_action',
    'system',
    'test_id',
    '{"test": true}'::jsonb,
    '127.0.0.1',
    'test-agent'
);

SELECT COUNT(*) as audit_logs_count FROM audit_logs WHERE action = 'test_action';

SELECT 'TESTING NOTIFICATIONS:' as status;
SELECT create_notification(
    '00000000-0000-0000-0000-000000000000'::uuid,
    'system_alert',
    'Test Notification',
    'This is a test notification',
    '{"test": true}'::jsonb,
    NULL,
    'low',
    NULL
);

SELECT COUNT(*) as notifications_count FROM notifications WHERE title = 'Test Notification';

SELECT 'VERIFICATION COMPLETE!' as status;
