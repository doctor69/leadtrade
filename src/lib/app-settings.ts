import { supabase } from './supabase';

export type TradingMode = 'paper' | 'live';

interface AppSetting {
  setting_key: string;
  setting_value: string;
  description?: string;
}

/**
 * Get app-level trading mode from database
 * This determines whether the entire app uses paper or live trading
 * Users don't control this - it's an admin/app-level setting
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

    const mode = data?.setting_value as TradingMode;
    return mode === 'live' ? 'live' : 'paper'; // Default to paper for safety
  } catch (error) {
    console.warn('Error fetching app trading mode, defaulting to paper:', error);
    return 'paper';
  }
}

/**
 * Update app-level trading mode (admin only)
 * This should only be called by administrators
 */
export async function updateAppTradingMode(mode: TradingMode): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .update({ 
        setting_value: mode,
        updated_at: new Date().toISOString()
      })
      .eq('setting_key', 'trading_mode');

    if (error) {
      return {
        success: false,
        error: `Failed to update app trading mode: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Get any app setting by key
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
    console.warn(`Error fetching app setting ${key}:`, error);
    return null;
  }
}

/**
 * Set any app setting by key (admin only)
 */
export async function setAppSetting(key: string, value: string, description?: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ 
        setting_key: key,
        setting_value: value,
        description,
        updated_at: new Date().toISOString()
      });

    if (error) {
      return {
        success: false,
        error: `Failed to set app setting: ${error.message}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Check if app is in maintenance mode
 */
export async function isMaintenanceMode(): Promise<boolean> {
  const maintenanceMode = await getAppSetting('maintenance_mode');
  return maintenanceMode === 'true';
}

/**
 * Get all app settings (admin only)
 */
export async function getAllAppSettings(): Promise<AppSetting[]> {
  try {
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('setting_key');

    if (error) {
      console.error('Failed to fetch app settings:', error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching app settings:', error);
    return [];
  }
}