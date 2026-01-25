UPDATE app_settings 
SET setting_value = 'paper', updated_at = NOW() 
WHERE setting_key = 'trading_mode';

-- Verify the change
SELECT setting_key, setting_value, updated_at 
FROM app_settings 
WHERE setting_key = 'trading_mode';
