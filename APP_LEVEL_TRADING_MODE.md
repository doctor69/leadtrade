# App-Level Trading Mode Architecture

## Overview

**Version**: v1.7.38  
**Date**: January 2026  
**Status**: ✅ Implemented

Refactored the authentication system to use app-level trading mode configuration instead of per-user settings, simplifying the architecture and improving consistency.

---

## What Changed

### Before: Per-User Trading Mode

Previously, each user had their own `trading_mode` setting stored in the `profiles` table:

```typescript
// Old approach - per-user trading mode
const { data: profiles } = await supabaseClient
  .from('profiles')
  .select('trading_mode')
  .eq('id', user.id)

const tradingMode = profiles[0]?.trading_mode || 'paper'
```

**Issues with this approach:**
- Required profile existence for authentication
- Multiple database queries during auth
- Complex error handling for missing profiles
- Inconsistent trading modes across users
- Difficult to switch entire app between modes

### After: App-Level Trading Mode

Now, trading mode is controlled at the application level via the `app_settings` table:

```typescript
// New approach - app-level trading mode
const { data: appSettings } = await supabaseClient
  .from('app_settings')
  .select('setting_value')
  .eq('setting_key', 'trading_mode')
  .single()

const tradingMode = (appSettings?.setting_value === 'live' ? 'live' : 'paper') as 'paper' | 'live'
```

**Benefits:**
- Single source of truth for entire application
- No dependency on user profiles during authentication
- Consistent trading environment for all users
- Easy mode switching via single database update
- Simplified authentication flow

---

## Technical Implementation

### File Modified

**`supabase/functions/_shared/auth.ts`**

### Changes Made

1. **Removed Profile Query**
   - Eliminated `profiles` table query for `trading_mode`
   - Removed profile validation and error handling
   - Reduced authentication dependencies

2. **Added App Settings Query**
   - Query `app_settings` table for `trading_mode` setting
   - Single row controls entire application behavior
   - Graceful fallback to `'paper'` mode on error

3. **Simplified Error Handling**
   - No authentication failure for missing settings
   - Console warning for debugging
   - Always defaults to safe `'paper'` mode

### Database Schema

The `app_settings` table structure:

```sql
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Default trading mode setting
INSERT INTO app_settings (setting_key, setting_value, description) 
VALUES ('trading_mode', 'paper', 'Global trading mode: paper or live');
```

### Authentication Flow

```typescript
export async function validateAuth(req: Request): Promise<AuthContext | AuthError> {
  // 1. Validate authorization header
  const authHeader = req.headers.get('Authorization')
  
  // 2. Get authenticated user
  const { data: { user } } = await supabaseClient.auth.getUser()
  
  // 3. Get app-level trading mode (NEW)
  const { data: appSettings } = await supabaseClient
    .from('app_settings')
    .select('setting_value')
    .eq('setting_key', 'trading_mode')
    .single()
  
  const tradingMode = (appSettings?.setting_value === 'live' ? 'live' : 'paper')
  
  // 4. Get Alpaca account information
  const { data: alpacaAccounts } = await supabaseClient
    .from('alpaca_accounts')
    .select('alpaca_account_id, alpaca_account_number, account_status')
    .eq('user_id', user.id)
  
  // 5. Return auth context with app-level trading mode
  return {
    userId: user.id,
    tradingMode, // App-level setting
    alpacaAccountId: alpacaAccounts[0].alpaca_account_id,
    // ... other fields
  }
}
```

---

## Benefits

### 1. Simplified Authentication
- Fewer database queries during auth
- No profile dependency
- Reduced authentication failure points
- Faster authentication flow

### 2. Consistent Trading Environment
- All users in same mode (paper or live)
- No confusion about which mode is active
- Easier testing and debugging
- Better alignment with sandbox/production separation

### 3. Easier Mode Switching
- Single database update switches entire app
- No need to update individual user profiles
- Instant mode change for all users
- Simplified deployment configuration

### 4. Better Architecture
- Separation of concerns (auth vs. trading config)
- Single source of truth
- Reduced complexity
- More maintainable code

### 5. Improved Error Handling
- Graceful fallback to safe mode
- No authentication failures from missing settings
- Clear logging for debugging
- Robust default behavior

---

## Migration Notes

### Breaking Changes
- **None** - This is an internal architecture change
- All existing functionality continues to work
- No API changes required
- No frontend changes needed

### Database Changes
- No schema migrations required
- `app_settings` table already exists
- `trading_mode` setting already present
- No data migration needed

### Backward Compatibility
- `profiles.trading_mode` column still exists (unused)
- Can be removed in future cleanup
- No impact on existing user data
- Seamless transition

---

## Configuration

### Setting Trading Mode

To switch the entire application between paper and live trading:

```sql
-- Switch to live trading
UPDATE app_settings 
SET setting_value = 'live', updated_at = NOW()
WHERE setting_key = 'trading_mode';

-- Switch to paper trading
UPDATE app_settings 
SET setting_value = 'paper', updated_at = NOW()
WHERE setting_key = 'trading_mode';
```

### Checking Current Mode

```sql
SELECT setting_value 
FROM app_settings 
WHERE setting_key = 'trading_mode';
```

### Default Mode

The system defaults to `'paper'` mode if:
- The setting is not found
- The database query fails
- The setting value is invalid

This ensures safe operation even in error conditions.

---

## Testing

### Verification Steps

1. **Check Current Mode**
   ```bash
   # Query database
   psql -c "SELECT setting_value FROM app_settings WHERE setting_key = 'trading_mode';"
   ```

2. **Test Authentication**
   ```bash
   # Make authenticated request
   curl -H "Authorization: Bearer $TOKEN" \
        https://your-app.com/api/alpaca/account
   ```

3. **Verify Mode in Logs**
   ```
   # Check Edge Function logs
   App-level trading mode: paper
   ```

4. **Switch Modes**
   ```sql
   -- Switch to live
   UPDATE app_settings SET setting_value = 'live' WHERE setting_key = 'trading_mode';
   
   -- Verify change
   SELECT setting_value FROM app_settings WHERE setting_key = 'trading_mode';
   ```

5. **Test Fallback**
   ```sql
   -- Temporarily remove setting
   DELETE FROM app_settings WHERE setting_key = 'trading_mode';
   
   -- Verify fallback to 'paper' mode in logs
   -- Restore setting
   INSERT INTO app_settings (setting_key, setting_value) VALUES ('trading_mode', 'paper');
   ```

---

## Future Enhancements

### Admin Interface
Create an admin dashboard to toggle trading mode:
- Visual toggle switch
- Current mode indicator
- Mode change history
- Confirmation dialog for live mode

### Environment-Based Defaults
Set default mode based on deployment environment:
- Development: Always `'paper'`
- Staging: Configurable
- Production: Configurable with safeguards

### Mode Change Notifications
Notify users when trading mode changes:
- Email notifications
- In-app alerts
- Dashboard banner
- Audit log entries

### Per-User Override (Future)
If needed, could add per-user mode override:
- Check user-specific setting first
- Fall back to app-level setting
- Useful for beta testing live mode
- Requires additional logic

---

## Related Documentation

- **Authentication**: `supabase/functions/_shared/auth.ts`
- **Database Schema**: `SUPABASE_SCHEMA.md`
- **App Settings**: `app_settings` table documentation
- **Trading Configuration**: `TRADING_CONFIGURATION.md`
- **Limited Live Requirements**: `.kiro/specs/limited-live-tech-requirements/`

---

## Summary

The app-level trading mode architecture simplifies authentication, improves consistency, and makes mode switching easier. By moving trading mode configuration from per-user profiles to a single app-level setting, we've reduced complexity while maintaining all functionality.

**Key Takeaways:**
- ✅ Simpler authentication flow
- ✅ Consistent trading environment
- ✅ Easy mode switching
- ✅ Better error handling
- ✅ No breaking changes
- ✅ Production-ready implementation
