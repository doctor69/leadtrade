-- Migration: Add trade notifications table for real-time WebSocket notifications
-- This supports Requirement 6.4: Add real-time trade notification system for copy trading

-- Create trade_notifications table
CREATE TABLE IF NOT EXISTS trade_notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    data JSONB NOT NULL,
    read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trade_notifications_user_id ON trade_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_trade_notifications_read ON trade_notifications(read);
CREATE INDEX IF NOT EXISTS idx_trade_notifications_created_at ON trade_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_trade_notifications_user_unread ON trade_notifications(user_id, read) WHERE read = FALSE;

-- Enable Row Level Security
ALTER TABLE trade_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can only see their own notifications
CREATE POLICY "Users can view their own notifications" ON trade_notifications
    FOR SELECT USING (auth.uid() = user_id);

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their own notifications" ON trade_notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- Service role can insert notifications for any user
CREATE POLICY "Service role can insert notifications" ON trade_notifications
    FOR INSERT WITH CHECK (true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_trade_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
CREATE TRIGGER update_trade_notifications_updated_at
    BEFORE UPDATE ON trade_notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_trade_notifications_updated_at();

-- Create function to clean up old notifications (keep last 100 per user)
CREATE OR REPLACE FUNCTION cleanup_old_trade_notifications()
RETURNS void AS $$
BEGIN
    DELETE FROM trade_notifications
    WHERE id IN (
        SELECT id FROM (
            SELECT id,
                   ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) as rn
            FROM trade_notifications
        ) ranked
        WHERE rn > 100
    );
END;
$$ LANGUAGE plpgsql;

-- Add comment to table
COMMENT ON TABLE trade_notifications IS 'Real-time trade notifications for copy trading system';
COMMENT ON COLUMN trade_notifications.data IS 'JSONB data containing notification details (type, symbol, side, quantity, etc.)';
COMMENT ON COLUMN trade_notifications.read IS 'Whether the notification has been read by the user';