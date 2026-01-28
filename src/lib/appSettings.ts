import { supabase } from './supabase';

export type TradingMode = 'paper' | 'live';

/**
 * Get the app-level trading mode from database
 * This is controlled at the application level, not per-user
 */
export async function getAppTradingMode(): Promise<TradingMode> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'trading_mode')
      .single();

    if (error) {
      console.warn('Failed to fetch app trading mode, defaulting to paper:', error);
      return 'paper';
    }

    return (data?.setting_value === 'live' ? 'live' : 'paper') as TradingMode;
  } catch (error) {
    console.error('Error fetching app trading mode:', error);
    return 'paper';
  }
}

/**
 * Get app setting by key
 */
export async function getAppSetting(key: string): Promise<string | null> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', key)
      .single();

    if (error) {
      console.warn(`Failed to fetch app setting ${key}:`, error);
      return null;
    }

    return data?.setting_value || null;
  } catch (error) {
    console.error(`Error fetching app setting ${key}:`, error);
    return null;
  }
}

/**
 * Update app setting (requires service role - use via edge function)
 */
export async function updateAppSetting(key: string, value: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .update({ setting_value: value, updated_at: new Date().toISOString() })
      .eq('setting_key', key);

    if (error) {
      console.error(`Failed to update app setting ${key}:`, error);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`Error updating app setting ${key}:`, error);
    return false;
  }
}

/**
 * Get all app settings
 */
export async function getAllAppSettings(): Promise<Record<string, string>> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('setting_key, setting_value');

    if (error) {
      console.warn('Failed to fetch app settings:', error);
      return {};
    }

    return data.reduce((acc, setting) => {
      acc[setting.setting_key] = setting.setting_value;
      return acc;
    }, {} as Record<string, string>);
  } catch (error) {
    console.error('Error fetching app settings:', error);
    return {};
  }
}
