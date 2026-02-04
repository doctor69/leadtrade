-- Email Queue Table
-- Centralized queue for managing email delivery with rate limiting

CREATE TABLE IF NOT EXISTS email_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('auth', 'trading', 'support', 'marketing')),
  "to" TEXT NOT NULL, -- Can be JSON array for multiple recipients
  subject TEXT, -- Optional when using templates
  html TEXT, -- Optional when using templates
  text TEXT,
  template_id TEXT, -- Resend template ID
  template_data JSONB, -- Template variables
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'sent', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  scheduled_for TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT email_content_check CHECK (
    (template_id IS NOT NULL) OR (subject IS NOT NULL AND html IS NOT NULL)
  )
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status);
CREATE INDEX IF NOT EXISTS idx_email_queue_category ON email_queue(category);
CREATE INDEX IF NOT EXISTS idx_email_queue_scheduled ON email_queue(scheduled_for) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_email_queue_created ON email_queue(created_at);

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_email_queue_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
    NEW.sent_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS email_queue_updated_at ON email_queue;

CREATE TRIGGER email_queue_updated_at
  BEFORE UPDATE ON email_queue
  FOR EACH ROW
  EXECUTE FUNCTION update_email_queue_updated_at();

-- Clean up old sent/failed emails (older than 7 days)
CREATE OR REPLACE FUNCTION cleanup_old_emails()
RETURNS void AS $$
BEGIN
  DELETE FROM email_queue
  WHERE status IN ('sent', 'failed')
  AND updated_at < NOW() - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

-- RLS Policies (service role only)
ALTER TABLE email_queue ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists, then create
DROP POLICY IF EXISTS "Service role can manage email queue" ON email_queue;

CREATE POLICY "Service role can manage email queue"
  ON email_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON email_queue TO service_role;
GRANT USAGE ON SCHEMA public TO service_role;

COMMENT ON TABLE email_queue IS 'Centralized email queue with rate limiting for Resend (2 req/sec)';
COMMENT ON COLUMN email_queue.scheduled_for IS 'When the email should be sent (for rate limiting and retries)';
COMMENT ON COLUMN email_queue.attempts IS 'Number of send attempts';
COMMENT ON COLUMN email_queue.max_attempts IS 'Maximum retry attempts before marking as failed';
COMMENT ON COLUMN email_queue.template_id IS 'Resend template ID (optional, for template-based emails)';
COMMENT ON COLUMN email_queue.template_data IS 'Template variables as JSON (used with template_id)';
