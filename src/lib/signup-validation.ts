/**
 * Signup Flow Validation Service
 * Ensures all signup methods follow proper transactional flow
 */

import { validateTransactionalFlow } from './account-rollback';

export interface SignupFlowValidation {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
}

export interface EdgeFunctionValidation {
  isAvailable: boolean;
  followsTransactionalFlow: boolean;
  issues: string[];
}

/**
 * Validate that the signup Edge Function follows proper transactional flow
 */
export async function validateEdgeFunctionSignup(): Promise<EdgeFunctionValidation> {
  const issues: string[] = [];
  let isAvailable = false;
  let followsTransactionalFlow = false;

  try {
    // Test if the signup Edge Function is available
    const testResponse = await fetch(`${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY}`
      },
      body: JSON.stringify({
        // Send invalid data to test error handling
        test: true,
        email: 'test@validation.com'
      })
    });

    isAvailable = true;

    // Check if the response indicates proper validation
    const responseText = await testResponse.text();
    
    // Look for indicators that the Edge Function follows proper flow
    if (responseText.includes('alpaca') || responseText.includes('validation')) {
      followsTransactionalFlow = true;
    } else {
      issues.push('Edge Function may not implement proper Alpaca-first validation');
    }

    if (testResponse.status === 200) {
      issues.push('Edge Function should reject invalid test data');
    }

  } catch (error) {
    issues.push(`Edge Function not available: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    isAvailable,
    followsTransactionalFlow,
    issues
  };
}

/**
 * Comprehensive validation of the entire signup flow
 */
export async function validateSignupFlow(): Promise<SignupFlowValidation> {
  const issues: string[] = [];
  const recommendations: string[] = [];

  // 1. Validate local transactional flow
  const localValidation = validateTransactionalFlow();
  if (!localValidation.isValid) {
    issues.push(...localValidation.issues);
  }

  // 2. Validate Edge Function implementation
  const edgeFunctionValidation = await validateEdgeFunctionSignup();
  if (!edgeFunctionValidation.isAvailable) {
    issues.push('Signup Edge Function is not available');
    recommendations.push('Deploy the signup Edge Function to Supabase');
  } else if (!edgeFunctionValidation.followsTransactionalFlow) {
    issues.push('Edge Function may not follow proper transactional flow');
    recommendations.push('Ensure Edge Function creates Alpaca account before Supabase account');
  }

  if (edgeFunctionValidation.issues.length > 0) {
    issues.push(...edgeFunctionValidation.issues);
  }

  // 3. Check environment variables
  const requiredEnvVars = [
    'PUBLIC_SUPABASE_URL',
    'PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];

  for (const envVar of requiredEnvVars) {
    if (!import.meta.env[envVar]) {
      issues.push(`Missing required environment variable: ${envVar}`);
    }
  }

  // 4. Validate rollback mechanisms
  try {
    const { executeAccountRollback } = await import('./account-rollback');
    if (typeof executeAccountRollback !== 'function') {
      issues.push('Account rollback function not available');
    }
  } catch (error) {
    issues.push('Account rollback system not accessible');
  }

  // 5. Add recommendations based on findings
  if (issues.length === 0) {
    recommendations.push('Signup flow validation passed - all systems operational');
  } else {
    recommendations.push('Address the identified issues to ensure proper account creation flow');
    recommendations.push('Test the signup flow in a development environment before production deployment');
  }

  return {
    isValid: issues.length === 0,
    issues,
    recommendations
  };
}

/**
 * Runtime check to ensure signup follows proper flow
 * This can be called before account creation to validate the system state
 */
export async function preSignupValidation(): Promise<{
  canProceed: boolean;
  blockingIssues: string[];
  warnings: string[];
}> {
  const blockingIssues: string[] = [];
  const warnings: string[] = [];

  // Check critical services
  try {
    const { createAlpacaAccount } = await import('./alpaca-account');
    if (typeof createAlpacaAccount !== 'function') {
      blockingIssues.push('Alpaca account creation service not available');
    }
  } catch (error) {
    blockingIssues.push('Cannot access Alpaca account service');
  }

  try {
    const { createUserAccount } = await import('./signup-service');
    if (typeof createUserAccount !== 'function') {
      blockingIssues.push('User account creation service not available');
    }
  } catch (error) {
    blockingIssues.push('Cannot access signup service');
  }

  // Check rollback system
  try {
    const { executeAccountRollback } = await import('./account-rollback');
    if (typeof executeAccountRollback !== 'function') {
      warnings.push('Account rollback system not available - manual cleanup may be required');
    }
  } catch (error) {
    warnings.push('Rollback system not accessible - ensure manual cleanup procedures are in place');
  }

  // Check environment configuration
  if (!import.meta.env.PUBLIC_SUPABASE_URL) {
    blockingIssues.push('Supabase URL not configured');
  }

  if (!import.meta.env.PUBLIC_SUPABASE_ANON_KEY) {
    blockingIssues.push('Supabase anonymous key not configured');
  }

  return {
    canProceed: blockingIssues.length === 0,
    blockingIssues,
    warnings
  };
}

/**
 * Post-signup validation to ensure account was created properly
 */
export async function postSignupValidation(
  userId: string,
  alpacaAccountId?: string
): Promise<{
  isValid: boolean;
  issues: string[];
  requiresRollback: boolean;
}> {
  const issues: string[] = [];
  let requiresRollback = false;

  try {
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );

    // Check if user exists in auth
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId);
    if (userError || !user) {
      issues.push('User not found in authentication system');
      requiresRollback = true;
    }

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      issues.push('User profile not created');
      requiresRollback = true;
    }

    // Check if Alpaca account is linked (if provided)
    if (alpacaAccountId) {
      const { data: alpacaAccount, error: alpacaError } = await supabase
        .from('alpaca_accounts')
        .select('alpaca_account_id')
        .eq('user_id', userId)
        .eq('alpaca_account_id', alpacaAccountId)
        .single();

      if (alpacaError || !alpacaAccount) {
        issues.push('Alpaca account not properly linked');
        requiresRollback = true;
      }
    }

  } catch (error) {
    issues.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    requiresRollback = true;
  }

  return {
    isValid: issues.length === 0,
    issues,
    requiresRollback
  };
}