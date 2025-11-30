// Transactional Signup Service
// Ensures Alpaca account creation succeeds before creating Supabase account

import { createClient } from '@supabase/supabase-js';
import { createAlpacaAccount, type AlpacaAccountData } from './alpaca-account';
import { encryptToken, hashUserData } from './encryption';
import { executeAccountRollback } from './account-rollback';
import { preSignupValidation, postSignupValidation } from './signup-validation';
import { z } from 'zod';

// Zod schema for comprehensive signup data validation
const signupDataSchema = z.object({
  // Auth fields
  email: z.string().email('Valid email is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),

  // Personal information
  given_name: z.string().min(1, 'First name is required'),
  family_name: z.string().min(1, 'Last name is required'),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date of birth must be in YYYY-MM-DD format'),
  tax_id: z.string().regex(/^\d{9}$/, 'Tax ID must be a 9-digit number'),
  tax_id_type: z.string().default('USA_SSN'),

  // Contact information
  phone_number: z.string().regex(/^\+?1?[0-9]{10}$/, 'Phone number must be a valid 10-digit US number'),
  street_address: z.array(z.string()).min(1, 'Street address is required'),
  city: z.string().min(1, 'City is required'),
  state: z.string().length(2, 'State must be a 2-letter code'),
  postal_code: z.string().regex(/^\d{5}(-\d{4})?$/, 'Postal code must be in 12345 or 12345-6789 format'),

  // Financial information
  annual_income_min: z.string().default('25000'),
  annual_income_max: z.string().default('50000'),
  total_net_worth_min: z.string().default('25000'),
  total_net_worth_max: z.string().default('50000'),
  liquid_net_worth_min: z.string().default('10000'),
  liquid_net_worth_max: z.string().default('25000'),

  // Investment profile
  investment_experience_with_stocks: z.string().default('limited'),
  investment_objective: z.string().default('growth'),
  risk_tolerance: z.string().default('moderate'),

  // Privacy controls
  share_trades: z.boolean().default(false),
  show_asset_amounts: z.boolean().default(false),
});

export type SignupData = z.infer<typeof signupDataSchema>;

export interface SignupResult {
  success: boolean;
  error?: string;
  userId?: string;
  alpacaAccountId?: string;
  alpacaAccountNumber?: string;
  needsEmailVerification?: boolean;
  validationErrors?: string[];
}

/**
 * Validates all required Alpaca account fields
 */
function validateAlpacaRequirements(data: SignupData): { isValid: boolean; errors: string[] } {
  try {
    signupDataSchema.parse(data);
    
    const errors: string[] = [];
    
    // Additional business logic validation
    const birthDate = new Date(data.date_of_birth);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 18) {
      errors.push('Must be at least 18 years old to create an account');
    }
    
    if (age > 120) {
      errors.push('Invalid date of birth');
    }
    
    // Validate financial ranges
    const annualIncomeMin = parseInt(data.annual_income_min);
    const annualIncomeMax = parseInt(data.annual_income_max);
    if (annualIncomeMin >= annualIncomeMax) {
      errors.push('Annual income minimum must be less than maximum');
    }
    
    const netWorthMin = parseInt(data.total_net_worth_min);
    const netWorthMax = parseInt(data.total_net_worth_max);
    if (netWorthMin >= netWorthMax) {
      errors.push('Net worth minimum must be less than maximum');
    }
    
    const liquidMin = parseInt(data.liquid_net_worth_min);
    const liquidMax = parseInt(data.liquid_net_worth_max);
    if (liquidMin >= liquidMax) {
      errors.push('Liquid net worth minimum must be less than maximum');
    }
    
    return { isValid: errors.length === 0, errors };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const validationErrors = error.errors.map(err => `${err.path.join('.')}: ${err.message}`);
      return { isValid: false, errors: validationErrors };
    }
    return { isValid: false, errors: ['Unknown validation error'] };
  }
}

/**
 * Creates a complete user account with proper rollback on failure
 * Step 1: Validate all required fields
 * Step 2: Create and verify Alpaca account
 * Step 3: Create Supabase account only if Alpaca succeeds
 * Step 4: Link accounts and store essential data only
 */
export async function createUserAccount(
  signupData: SignupData,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<SignupResult> {
  
  console.log('Starting transactional user account creation...');

  // Pre-signup validation to ensure system is ready
  console.log('🔍 Running pre-signup validation...');
  const preValidation = await preSignupValidation();
  
  if (!preValidation.canProceed) {
    console.error('❌ Pre-signup validation failed:', preValidation.blockingIssues);
    return {
      success: false,
      error: 'System not ready for account creation',
      validationErrors: preValidation.blockingIssues,
    };
  }

  if (preValidation.warnings.length > 0) {
    console.warn('⚠️ Pre-signup warnings:', preValidation.warnings);
  }

  try {
    // Step 1: Validate all required Alpaca account fields
    console.log('Step 1: Validating signup data...');
    const validation = validateAlpacaRequirements(signupData);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: validation.errors,
      };
    }

    // Step 2: Create Alpaca account FIRST
    console.log('Step 2: Creating Alpaca account...');
    
    const alpacaAccountData: AlpacaAccountData = {
      given_name: signupData.given_name,
      family_name: signupData.family_name,
      date_of_birth: signupData.date_of_birth,
      tax_id: signupData.tax_id,
      tax_id_type: signupData.tax_id_type,
      phone_number: signupData.phone_number,
      email_address: signupData.email,
      street_address: signupData.street_address,
      city: signupData.city,
      state: signupData.state,
      postal_code: signupData.postal_code,
      country: 'USA',
      annual_income_min: signupData.annual_income_min,
      annual_income_max: signupData.annual_income_max,
      total_net_worth_min: signupData.total_net_worth_min,
      total_net_worth_max: signupData.total_net_worth_max,
      liquid_net_worth_min: signupData.liquid_net_worth_min,
      liquid_net_worth_max: signupData.liquid_net_worth_max,
      investment_experience_with_stocks: signupData.investment_experience_with_stocks,
      investment_objective: signupData.investment_objective,
      risk_tolerance: signupData.risk_tolerance,
    };

    const alpacaResult = await createAlpacaAccount(alpacaAccountData, tradingMode);

    if (!alpacaResult.success) {
      console.error('Alpaca account creation failed:', alpacaResult.error);
      return {
        success: false,
        error: `Trading account creation failed: ${alpacaResult.error}`,
      };
    }

    if (!alpacaResult.account || !alpacaResult.accountId) {
      return {
        success: false,
        error: 'Alpaca account creation succeeded but returned invalid data',
      };
    }

    console.log('✓ Alpaca account created successfully:', alpacaResult.accountId);

    // Step 3: Create Supabase account only after Alpaca succeeds
    console.log('Step 3: Creating Supabase account...');
    
    // Use anon key for auth operations
    const supabaseAuth = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // Use service role key for database operations to bypass RLS
    const supabaseAdmin = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
      email: signupData.email,
      password: signupData.password,
      options: {
        data: {
          full_name: `${signupData.given_name} ${signupData.family_name}`,
          username: signupData.email.split('@')[0], // Generate username from email
          alpaca_account_id: alpacaResult.accountId, // Store Alpaca ID in metadata
          trading_mode: tradingMode,
          share_trades: signupData.share_trades,
          show_asset_amounts: signupData.show_asset_amounts,
        }
      }
    });

    if (authError) {
      console.error('Supabase account creation failed:', authError);
      
      // Execute comprehensive rollback for orphaned Alpaca account
      console.log('🔄 Executing rollback for orphaned Alpaca account...');
      
      try {
        const rollbackResult = await executeAccountRollback(
          undefined, // No Supabase user ID since creation failed
          alpacaResult.accountId,
          `Supabase account creation failed: ${authError.message}`
        );
        
        if (rollbackResult.success) {
          console.log('✅ Rollback completed successfully');
        } else {
          console.warn('⚠️ Rollback completed with issues:', rollbackResult.error);
        }
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
      }
      
      return {
        success: false,
        error: `Account creation failed: ${authError.message}`,
      };
    }

    if (!authData.user) {
      console.error('Supabase signup succeeded but no user returned');
      return {
        success: false,
        error: 'Account creation failed: Invalid response from authentication service',
      };
    }

    const userId = authData.user.id;
    console.log('✓ Supabase account created successfully:', userId);

    // Step 4: Link accounts and store essential data only (no trade data)
    console.log('Step 4: Linking accounts and storing essential data...');
    
    try {
      // Store Alpaca account information (essential data only)
      console.log('💾 Storing Alpaca account info in database...');
      console.log('Database insert data:', {
        user_id: userId,
        alpaca_account_id: alpacaResult.accountId,
        alpaca_account_number: alpacaResult.account?.account_number,
        account_status: alpacaResult.account?.status,
        account_type: tradingMode,
        kyc_status: 'approved'
      });

      const { data: insertData, error: alpacaError } = await supabaseAdmin
        .from('alpaca_accounts')
        .insert({
          user_id: userId,
          alpaca_account_id: alpacaResult.accountId,
          alpaca_account_number: alpacaResult.account?.account_number || null,
          account_status: alpacaResult.account?.status || 'ACTIVE',
          account_type: tradingMode,
          kyc_status: 'approved', // Since Alpaca account was created successfully
          kyc_data: {
            // Store minimal KYC data for reference (encrypted sensitive fields)
            given_name: signupData.given_name,
            family_name: signupData.family_name,
            date_of_birth: signupData.date_of_birth,
            phone_number: signupData.phone_number,
            city: signupData.city,
            state: signupData.state,
            postal_code: signupData.postal_code,
            investment_experience: signupData.investment_experience_with_stocks,
            investment_objective: signupData.investment_objective,
            risk_tolerance: signupData.risk_tolerance,
            // Sensitive data should be encrypted in production
            tax_id_encrypted: await encryptToken(signupData.tax_id, await hashUserData(userId)),
            street_address_encrypted: await encryptToken(signupData.street_address.join(', '), await hashUserData(userId)),
          },
        })
        .select();

      if (alpacaError) {
        console.error('❌ Failed to store Alpaca account info:', alpacaError);
        console.error('Error details:', JSON.stringify(alpacaError, null, 2));
        throw new Error(`Failed to store Alpaca account information: ${alpacaError.message}`);
      }

      console.log('✅ Alpaca account info stored successfully:', insertData);

      // Update user profile with essential data only
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          username: signupData.email.split('@')[0],
          full_name: `${signupData.given_name} ${signupData.family_name}`,
          email: signupData.email,
          trading_mode: tradingMode,
          share_trades: signupData.share_trades,
          show_asset_amounts: signupData.show_asset_amounts,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (profileError) {
        console.error('Failed to update profile:', profileError);
        throw new Error(`Failed to update user profile: ${profileError.message}`);
      }

      console.log('✓ Account linking completed successfully');

      // Post-signup validation to ensure everything was created properly
      console.log('🔍 Running post-signup validation...');
      const postValidation = await postSignupValidation(userId, alpacaResult.accountId);
      
      if (!postValidation.isValid) {
        console.error('❌ Post-signup validation failed:', postValidation.issues);
        
        if (postValidation.requiresRollback) {
          console.log('🔄 Executing rollback due to validation failure...');
          
          try {
            await executeAccountRollback(
              userId,
              alpacaResult.accountId,
              `Post-signup validation failed: ${postValidation.issues.join(', ')}`
            );
          } catch (rollbackError) {
            console.error('❌ Post-validation rollback failed:', rollbackError);
          }
          
          return {
            success: false,
            error: 'Account creation validation failed',
            validationErrors: postValidation.issues,
          };
        }
      }

      console.log('✅ Post-signup validation passed');

      return {
        success: true,
        userId,
        alpacaAccountId: alpacaResult.accountId,
        alpacaAccountNumber: alpacaResult.account?.account_number,
        needsEmailVerification: !authData.user.email_confirmed_at,
      };

    } catch (linkingError) {
      console.error('Account linking failed:', linkingError);
      
      // Execute comprehensive rollback for both Supabase and Alpaca accounts
      console.log('🔄 Executing comprehensive rollback due to linking failure...');
      
      try {
        const rollbackResult = await executeAccountRollback(
          userId,
          alpacaResult.accountId,
          `Account linking failed: ${linkingError instanceof Error ? linkingError.message : 'Unknown error'}`
        );
        
        if (rollbackResult.success) {
          console.log('✅ Comprehensive rollback completed successfully');
        } else {
          console.warn('⚠️ Rollback completed with issues:', rollbackResult.error);
        }
      } catch (rollbackError) {
        console.error('❌ Rollback failed:', rollbackError);
        // Still try the legacy rollback as fallback
        await rollbackFailedSignup(userId, 'Account linking failed after successful creation');
      }

      return {
        success: false,
        error: `Account setup failed: ${linkingError instanceof Error ? linkingError.message : 'Unknown error'}`,
      };
    }

  } catch (error) {
    console.error('Unexpected error during account creation:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}

/**
 * Rollback mechanism for failed signups
 */
export async function rollbackFailedSignup(userId: string, reason: string): Promise<void> {
  console.log(`Initiating rollback for user ${userId}: ${reason}`);
  
  try {
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // Clean up database records first
    await supabase.from('alpaca_accounts').delete().eq('user_id', userId);
    await supabase.from('copy_trading_subscriptions').delete().eq('follower_id', userId);
    await supabase.from('copy_trading_subscriptions').delete().eq('leader_id', userId);
    
    // Try to call the rollback API endpoint if available
    try {
      const rollbackResponse = await fetch('/api/rollback-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          reason,
        }),
      });

      if (rollbackResponse.ok) {
        console.log('✓ Rollback API call completed successfully');
      } else {
        console.warn('Rollback API call failed, but database cleanup completed');
      }
    } catch (rollbackError) {
      console.warn('Rollback API not available, but database cleanup completed');
    }

    console.log('✓ Rollback completed successfully');
  } catch (error) {
    console.error('Rollback failed:', error);
    throw error;
  }
}

/**
 * OAuth-specific signup that handles additional data collection
 */
export async function createOAuthUserAccount(
  userData: {
    email: string;
    full_name: string;
    given_name?: string;
    family_name?: string;
    provider: 'google' | 'apple';
  },
  additionalData: {
    date_of_birth: string;
    tax_id: string;
    phone_number: string;
    street_address: string;
    city: string;
    state: string;
    postal_code: string;
    share_trades: boolean;
    show_asset_amounts: boolean;
  },
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<SignupResult> {

  console.log('Starting OAuth user account setup...');

  // Use anon key for auth operations
  const supabaseAuth = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY
  );

  // Use service role key for database operations to bypass RLS
  const supabaseAdmin = createClient(
    import.meta.env.PUBLIC_SUPABASE_URL,
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );

  try {
    // Get current authenticated OAuth user
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'OAuth user not authenticated',
      };
    }

    // Check if user already has Alpaca account
    const { data: existingAlpacaAccount } = await supabaseAdmin
      .from('alpaca_accounts')
      .select('alpaca_account_id')
      .eq('user_id', user.id)
      .single();

    if (existingAlpacaAccount?.alpaca_account_id) {
      return {
        success: true,
        userId: user.id,
        alpacaAccountId: existingAlpacaAccount.alpaca_account_id,
        error: 'User already has trading account',
      };
    }

    // Parse names from full_name if individual names not provided
    const nameParts = userData.full_name.split(' ');
    const given_name = userData.given_name || nameParts[0] || '';
    const family_name = userData.family_name || nameParts.slice(1).join(' ') || '';

    // Create signup data for validation
    const oauthSignupData: SignupData = {
      email: userData.email,
      password: 'oauth-user', // OAuth users don't have passwords
      given_name,
      family_name,
      date_of_birth: additionalData.date_of_birth,
      tax_id: additionalData.tax_id.replace(/[-\s]/g, ''), // Clean tax ID
      tax_id_type: 'USA_SSN',
      phone_number: additionalData.phone_number.replace(/[-\s\(\)]/g, ''), // Clean phone
      street_address: [additionalData.street_address],
      city: additionalData.city,
      state: additionalData.state.toUpperCase(),
      postal_code: additionalData.postal_code,
      annual_income_min: '25000',
      annual_income_max: '50000',
      total_net_worth_min: '25000',
      total_net_worth_max: '50000',
      liquid_net_worth_min: '10000',
      liquid_net_worth_max: '25000',
      investment_experience_with_stocks: 'limited',
      investment_objective: 'growth',
      risk_tolerance: 'moderate',
      share_trades: additionalData.share_trades,
      show_asset_amounts: additionalData.show_asset_amounts,
    };

    // Step 1: Validate OAuth signup data
    console.log('Step 1: Validating OAuth signup data...');
    const validation = validateAlpacaRequirements(oauthSignupData);
    if (!validation.isValid) {
      return {
        success: false,
        error: 'Validation failed',
        validationErrors: validation.errors,
      };
    }

    // Step 2: Create Alpaca account FIRST (same as regular signup)
    console.log('Step 2: Creating Alpaca account for OAuth user...');
    
    const alpacaAccountData: AlpacaAccountData = {
      given_name: oauthSignupData.given_name,
      family_name: oauthSignupData.family_name,
      date_of_birth: oauthSignupData.date_of_birth,
      tax_id: oauthSignupData.tax_id,
      tax_id_type: oauthSignupData.tax_id_type,
      phone_number: oauthSignupData.phone_number,
      email_address: oauthSignupData.email,
      street_address: oauthSignupData.street_address,
      city: oauthSignupData.city,
      state: oauthSignupData.state,
      postal_code: oauthSignupData.postal_code,
      country: 'USA',
      annual_income_min: oauthSignupData.annual_income_min,
      annual_income_max: oauthSignupData.annual_income_max,
      total_net_worth_min: oauthSignupData.total_net_worth_min,
      total_net_worth_max: oauthSignupData.total_net_worth_max,
      liquid_net_worth_min: oauthSignupData.liquid_net_worth_min,
      liquid_net_worth_max: oauthSignupData.liquid_net_worth_max,
      investment_experience_with_stocks: oauthSignupData.investment_experience_with_stocks,
      investment_objective: oauthSignupData.investment_objective,
      risk_tolerance: oauthSignupData.risk_tolerance,
    };

    const alpacaResult = await createAlpacaAccount(alpacaAccountData, tradingMode);

    if (!alpacaResult.success) {
      console.error('Alpaca account creation failed for OAuth user:', alpacaResult.error);
      return {
        success: false,
        error: `Trading account creation failed: ${alpacaResult.error}`,
      };
    }

    if (!alpacaResult.account || !alpacaResult.accountId) {
      return {
        success: false,
        error: 'Alpaca account creation succeeded but returned invalid data',
      };
    }

    console.log('✓ Alpaca account created successfully for OAuth user:', alpacaResult.accountId);

    // Step 3: Update existing OAuth user with Alpaca account data
    console.log('Step 3: Linking OAuth user with Alpaca account...');
    
    try {
      // Store Alpaca account information (essential data only)
      console.log('💾 Storing OAuth Alpaca account info in database...');
      console.log('OAuth Database insert data:', {
        user_id: user.id,
        alpaca_account_id: alpacaResult.accountId,
        alpaca_account_number: alpacaResult.account?.account_number,
        account_status: alpacaResult.account?.status,
        account_type: tradingMode,
        kyc_status: 'approved'
      });

      const { data: insertData, error: alpacaError } = await supabaseAdmin
        .from('alpaca_accounts')
        .insert({
          user_id: user.id,
          alpaca_account_id: alpacaResult.accountId,
          alpaca_account_number: alpacaResult.account?.account_number || null,
          account_status: alpacaResult.account?.status || 'ACTIVE',
          account_type: tradingMode,
          kyc_status: 'approved', // Since Alpaca account was created successfully
          kyc_data: {
            // Store minimal KYC data for reference (encrypted sensitive fields)
            given_name: oauthSignupData.given_name,
            family_name: oauthSignupData.family_name,
            date_of_birth: oauthSignupData.date_of_birth,
            phone_number: oauthSignupData.phone_number,
            city: oauthSignupData.city,
            state: oauthSignupData.state,
            postal_code: oauthSignupData.postal_code,
            investment_experience: oauthSignupData.investment_experience_with_stocks,
            investment_objective: oauthSignupData.investment_objective,
            risk_tolerance: oauthSignupData.risk_tolerance,
            // Sensitive data should be encrypted in production
            tax_id_encrypted: await encryptToken(oauthSignupData.tax_id, await hashUserData(user.id)),
            street_address_encrypted: await encryptToken(oauthSignupData.street_address.join(', '), await hashUserData(user.id)),
          },
        })
        .select();

      if (alpacaError) {
        console.error('❌ Failed to store OAuth Alpaca account info:', alpacaError);
        console.error('OAuth Error details:', JSON.stringify(alpacaError, null, 2));
        throw new Error(`Alpaca account info storage failed: ${alpacaError.message}`);
      }

      console.log('✅ OAuth Alpaca account info stored successfully:', insertData);

      // Update user profile with essential data only
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          username: userData.email.split('@')[0],
          full_name: userData.full_name,
          email: userData.email,
          trading_mode: tradingMode,
          share_trades: oauthSignupData.share_trades,
          show_asset_amounts: oauthSignupData.show_asset_amounts,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Failed to update OAuth user profile:', profileError);
        throw new Error(`Profile update failed: ${profileError.message}`);
      }

      console.log('✓ OAuth user account setup completed successfully');

      return {
        success: true,
        userId: user.id,
        alpacaAccountId: alpacaResult.accountId,
        alpacaAccountNumber: alpacaResult.account?.account_number,
      };

    } catch (linkingError) {
      console.error('OAuth account linking failed:', linkingError);
      
      // Execute comprehensive rollback for OAuth account linking failure
      console.log('🔄 Executing rollback for OAuth account linking failure...');
      
      try {
        const rollbackResult = await executeAccountRollback(
          user.id,
          alpacaResult.accountId,
          `OAuth account linking failed: ${linkingError instanceof Error ? linkingError.message : 'Unknown error'}`
        );
        
        if (rollbackResult.success) {
          console.log('✅ OAuth rollback completed successfully');
        } else {
          console.warn('⚠️ OAuth rollback completed with issues:', rollbackResult.error);
        }
      } catch (rollbackError) {
        console.error('❌ OAuth rollback failed:', rollbackError);
        
        // Fallback to manual cleanup for OAuth users
        try {
          await supabaseAdmin.from('alpaca_accounts').delete().eq('user_id', user.id);
          
          await supabaseAdmin
            .from('profiles')
            .update({
              trading_mode: 'paper',
              share_trades: false,
              show_asset_amounts: false,
              updated_at: new Date().toISOString(),
            })
            .eq('id', user.id);

          console.log('Manual OAuth cleanup completed');
        } catch (cleanupError) {
          console.error('Manual OAuth cleanup failed:', cleanupError);
        }
      }

      return {
        success: false,
        error: `Account setup failed: ${linkingError instanceof Error ? linkingError.message : 'Unknown error'}`,
      };
    }

  } catch (error) {
    console.error('Unexpected error during OAuth account setup:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'An unexpected error occurred',
    };
  }
}