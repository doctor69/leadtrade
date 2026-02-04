-- Add template support to email_queue table
-- This migration adds template_id and template_data columns

-- Add template columns if they don't exist
DO $$ 
BEGIN
  -- Add template_id column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'email_queue' AND column_name = 'template_id'
  ) THEN
    ALTER TABLE email_queue ADD COLUMN template_id TEXT;
    RAISE NOTICE 'Added template_id column';
  ELSE
    RAISE NOTICE 'template_id column already exists';
  END IF;

  -- Add template_data column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'email_queue' AND column_name = 'template_data'
  ) THEN
    ALTER TABLE email_queue ADD COLUMN template_data JSONB;
    RAISE NOTICE 'Added template_data column';
  ELSE
    RAISE NOTICE 'template_data column already exists';
  END IF;
END $$;

-- Make subject and html optional (nullable) since templates don't need them
DO $$
BEGIN
  -- Check if columns are NOT NULL and alter them
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'email_queue' 
    AND column_name = 'subject' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE email_queue ALTER COLUMN subject DROP NOT NULL;
    RAISE NOTICE 'Made subject nullable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'email_queue' 
    AND column_name = 'html' AND is_nullable = 'NO'
  ) THEN
    ALTER TABLE email_queue ALTER COLUMN html DROP NOT NULL;
    RAISE NOTICE 'Made html nullable';
  END IF;
END $$;

-- Drop old constraint if it exists
ALTER TABLE email_queue DROP CONSTRAINT IF EXISTS email_content_check;

-- Add constraint: either template OR (subject + html) must be provided
ALTER TABLE email_queue ADD CONSTRAINT email_content_check CHECK (
  (template_id IS NOT NULL) OR (subject IS NOT NULL AND html IS NOT NULL)
);

-- Add comments
COMMENT ON COLUMN email_queue.template_id IS 'Resend template ID (optional, for template-based emails)';
COMMENT ON COLUMN email_queue.template_data IS 'Template variables as JSON (used with template_id)';

-- Update table comment
COMMENT ON TABLE email_queue IS 'Centralized email queue with rate limiting for Resend (2 req/sec). Supports both HTML and template-based emails)';

