import { useState, useEffect } from 'react';
import { getCurrentUserTradingMode, getUserTradingMode, type TradingMode } from '../lib/trading-config';
import { supabase } from '../lib/supabase';

interface UseTradingModeReturn {
  tradingMode: TradingMode;
  loading: boolean;
  error: string | null;
  refreshTradingMode: () => Promise<void>;
}

/**
 * Hook to manage user's trading mode state
 * @param userId - Optional user ID, uses current user if not provided
 * @returns Trading mode state and utilities
 */
export function useTradingMode(userId?: string): UseTradingModeReturn {
  const [tradingMode, setTradingMode] = useState<TradingMode>('paper');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTradingMode = async () => {
    try {
      setLoading(true);
      setError(null);

      let mode: TradingMode;
      if (userId) {
        mode = await getUserTradingMode(userId);
      } else {
        mode = await getCurrentUserTradingMode();
      }

      setTradingMode(mode);
    } catch (err) {
      console.error('Error fetching trading mode:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch trading mode');
      setTradingMode('paper'); // Default to paper trading on error
    } finally {
      setLoading(false);
    }
  };

  const refreshTradingMode = async () => {
    await fetchTradingMode();
  };

  useEffect(() => {
    fetchTradingMode();
  }, [userId]);

  // Listen for real-time updates to user profile
  useEffect(() => {
    if (!userId) {
      // If no specific userId, listen for current user changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (event, session) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            fetchTradingMode();
          }
        }
      );

      return () => subscription.unsubscribe();
    }
  }, [userId]);

  // Listen for profile changes
  useEffect(() => {
    const getCurrentUserId = async () => {
      if (userId) return userId;
      
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    };

    const setupRealtimeSubscription = async () => {
      const currentUserId = await getCurrentUserId();
      if (!currentUserId) return;

      const subscription = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `id=eq.${currentUserId}`,
          },
          (payload) => {
            if (payload.new && 'trading_mode' in payload.new) {
              const newMode: TradingMode = payload.new.trading_mode || 'paper';
              setTradingMode(newMode);
            }
          }
        )
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    };

    setupRealtimeSubscription();
  }, [userId]);

  return {
    tradingMode,
    loading,
    error,
    refreshTradingMode,
  };
}