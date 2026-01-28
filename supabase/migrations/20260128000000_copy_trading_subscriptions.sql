-- Create copy_trading_subscriptions table for managing follower-leader relationships
CREATE TABLE IF NOT EXISTS public.copy_trading_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    leader_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    allocation_percentage NUMERIC(5,2) NOT NULL CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    
    -- Ensure a follower can only subscribe to a leader once
    UNIQUE(follower_id, leader_id),
    
    -- Prevent self-following
    CHECK (follower_id != leader_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_follower_id 
    ON public.copy_trading_subscriptions(follower_id);

CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_leader_id 
    ON public.copy_trading_subscriptions(leader_id);

CREATE INDEX IF NOT EXISTS idx_copy_trading_subscriptions_active 
    ON public.copy_trading_subscriptions(leader_id, is_active) 
    WHERE is_active = true;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_copy_trading_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_copy_trading_subscriptions_updated_at
    BEFORE UPDATE ON public.copy_trading_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_copy_trading_subscriptions_updated_at();

-- Enable Row Level Security
ALTER TABLE public.copy_trading_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can view their own subscriptions (as follower)
CREATE POLICY "Users can view their own subscriptions"
    ON public.copy_trading_subscriptions
    FOR SELECT
    USING (auth.uid() = follower_id);

-- Users can view who is following them (as leader)
CREATE POLICY "Users can view their followers"
    ON public.copy_trading_subscriptions
    FOR SELECT
    USING (auth.uid() = leader_id);

-- Users can create subscriptions for themselves
CREATE POLICY "Users can create their own subscriptions"
    ON public.copy_trading_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

-- Users can update their own subscriptions
CREATE POLICY "Users can update their own subscriptions"
    ON public.copy_trading_subscriptions
    FOR UPDATE
    USING (auth.uid() = follower_id)
    WITH CHECK (auth.uid() = follower_id);

-- Users can delete their own subscriptions
CREATE POLICY "Users can delete their own subscriptions"
    ON public.copy_trading_subscriptions
    FOR DELETE
    USING (auth.uid() = follower_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role has full access"
    ON public.copy_trading_subscriptions
    FOR ALL
    USING (auth.jwt()->>'role' = 'service_role')
    WITH CHECK (auth.jwt()->>'role' = 'service_role');

-- Add comment
COMMENT ON TABLE public.copy_trading_subscriptions IS 
    'Manages copy trading relationships between followers and leaders. ' ||
    'Followers allocate a percentage of their portfolio to automatically copy a leader''s trades.';
