-- Add rollback audit tables for comprehensive account cleanup tracking

-- Table for tracking Alpaca accounts that require manual cleanup
CREATE TABLE IF NOT EXISTS alpaca_cleanup_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    alpaca_account_id TEXT NOT NULL,
    alpaca_account_number TEXT,
    user_id UUID,
    reason TEXT NOT NULL,
    cleanup_status TEXT NOT NULL DEFAULT 'pending_manual_cleanup',
    cleanup_notes TEXT,
    cleaned_up_at TIMESTAMPTZ,
    cleaned_up_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table for comprehensive rollback audit trail
CREATE TABLE IF NOT EXISTS rollback_audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    alpaca_account_id TEXT,
    reason TEXT NOT NULL,
    rollback_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    rollback_timestamp TIMESTAMPTZ NOT NULL,
    success BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_alpaca_cleanup_log_status ON alpaca_cleanup_log(cleanup_status);
CREATE INDEX IF NOT EXISTS idx_alpaca_cleanup_log_created_at ON alpaca_cleanup_log(created_at);
CREATE INDEX IF NOT EXISTS idx_rollback_audit_log_user_id ON rollback_audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_rollback_audit_log_timestamp ON rollback_audit_log(rollback_timestamp);

-- Add RLS policies
ALTER TABLE alpaca_cleanup_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rollback_audit_log ENABLE ROW LEVEL SECURITY;

-- Only service role can access these audit tables
-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Service role can manage alpaca cleanup log" ON alpaca_cleanup_log;
DROP POLICY IF EXISTS "Service role can manage rollback audit log" ON rollback_audit_log;

-- Create the policies
CREATE POLICY "Service role can manage alpaca cleanup log" ON alpaca_cleanup_log
    FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage rollback audit log" ON rollback_audit_log
    FOR ALL USING (auth.role() = 'service_role');

-- Add comments for documentation
COMMENT ON TABLE alpaca_cleanup_log IS 'Tracks Alpaca accounts that require manual cleanup due to failed account creation';
COMMENT ON TABLE rollback_audit_log IS 'Comprehensive audit trail for account rollback operations';

COMMENT ON COLUMN alpaca_cleanup_log.cleanup_status IS 'Status: pending_manual_cleanup, in_progress, completed, failed';
COMMENT ON COLUMN rollback_audit_log.rollback_steps IS 'JSON array of rollback steps with success/failure status';