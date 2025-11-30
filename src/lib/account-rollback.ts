/**
 * Enhanced Account Rollback System
 * Handles comprehensive rollback for failed account creation scenarios
 */

import { createClient } from '@supabase/supabase-js';

export interface RollbackContext {
  userId?: string;
  alpacaAccountId?: string;
  alpacaAccountNumber?: string;
  reason: string;
  timestamp: string;
  rollbackSteps: RollbackStep[];
}

export interface RollbackStep {
  step: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

export interface RollbackResult {
  success: boolean;
  context: RollbackContext;
  error?: string;
}

/**
 * Comprehensive rollback for failed account creation
 * Handles both Supabase and Alpaca account cleanup
 */
export class AccountRollbackManager {
  private supabase;

  constructor() {
    this.supabase = createClient(
      import.meta.env.PUBLIC_SUPABASE_URL,
      import.meta.env.SUPABASE_SERVICE_ROLE_KEY || import.meta.env.PUBLIC_SUPABASE_ANON_KEY
    );
  }

  /**
   * Execute comprehensive rollback for failed signup
   */
  async executeRollback(context: Partial<RollbackContext>): Promise<RollbackResult> {
    const rollbackContext: RollbackContext = {
      userId: context.userId,
      alpacaAccountId: context.alpacaAccountId,
      alpacaAccountNumber: context.alpacaAccountNumber,
      reason: context.reason || 'Unknown failure',
      timestamp: new Date().toISOString(),
      rollbackSteps: []
    };

    console.log(`🔄 Starting comprehensive rollback: ${rollbackContext.reason}`);

    try {
      // Step 1: Clean up Supabase database records
      if (rollbackContext.userId) {
        await this.rollbackSupabaseData(rollbackContext);
      }

      // Step 2: Handle Alpaca account (log for manual cleanup since no delete API)
      if (rollbackContext.alpacaAccountId) {
        await this.handleAlpacaAccountCleanup(rollbackContext);
      }

      // Step 3: Call rollback API if available
      if (rollbackContext.userId) {
        await this.callRollbackAPI(rollbackContext);
      }

      // Step 4: Log rollback for audit trail
      await this.logRollbackEvent(rollbackContext);

      const allStepsSuccessful = rollbackContext.rollbackSteps.every(step => step.success);

      return {
        success: allStepsSuccessful,
        context: rollbackContext,
        error: allStepsSuccessful ? undefined : 'Some rollback steps failed'
      };

    } catch (error) {
      console.error('❌ Rollback execution failed:', error);
      
      rollbackContext.rollbackSteps.push({
        step: 'rollback_execution',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });

      return {
        success: false,
        context: rollbackContext,
        error: error instanceof Error ? error.message : 'Rollback execution failed'
      };
    }
  }

  /**
   * Clean up Supabase database records
   */
  private async rollbackSupabaseData(context: RollbackContext): Promise<void> {
    const steps = [
      { table: 'alpaca_accounts', description: 'Alpaca account records' },
      { table: 'copy_trading_subscriptions', description: 'Copy trading subscriptions (follower)' },
      { table: 'copy_trading_subscriptions', description: 'Copy trading subscriptions (leader)' },
      { table: 'user_details', description: 'User details' },
      { table: 'profiles', description: 'User profiles' },
      { table: 'auth.users', description: 'Authentication user' }
    ];

    for (const step of steps) {
      try {
        let deleteResult;

        if (step.table === 'auth.users') {
          // Use admin API for auth user deletion
          deleteResult = await this.supabase.auth.admin.deleteUser(context.userId!);
        } else if (step.table === 'copy_trading_subscriptions' && step.description.includes('follower')) {
          deleteResult = await this.supabase
            .from('copy_trading_subscriptions')
            .delete()
            .eq('follower_id', context.userId!);
        } else if (step.table === 'copy_trading_subscriptions' && step.description.includes('leader')) {
          deleteResult = await this.supabase
            .from('copy_trading_subscriptions')
            .delete()
            .eq('leader_id', context.userId!);
        } else {
          deleteResult = await this.supabase
            .from(step.table)
            .delete()
            .eq(step.table === 'profiles' ? 'id' : 'user_id', context.userId!);
        }

        const success = !deleteResult.error;
        
        context.rollbackSteps.push({
          step: `cleanup_${step.table}`,
          success,
          error: deleteResult.error?.message,
          timestamp: new Date().toISOString()
        });

        if (success) {
          console.log(`✅ Cleaned up ${step.description}`);
        } else {
          console.warn(`⚠️ Failed to clean up ${step.description}:`, deleteResult.error?.message);
        }

      } catch (error) {
        console.error(`❌ Error cleaning up ${step.description}:`, error);
        
        context.rollbackSteps.push({
          step: `cleanup_${step.table}`,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
  }

  /**
   * Handle Alpaca account cleanup (logging for manual cleanup)
   */
  private async handleAlpacaAccountCleanup(context: RollbackContext): Promise<void> {
    try {
      // Since Alpaca doesn't provide a delete API, we log this for manual cleanup
      const alpacaCleanupInfo = {
        alpacaAccountId: context.alpacaAccountId,
        alpacaAccountNumber: context.alpacaAccountNumber,
        reason: context.reason,
        timestamp: context.timestamp,
        requiresManualCleanup: true
      };

      console.warn('🚨 ALPACA ACCOUNT REQUIRES MANUAL CLEANUP:', alpacaCleanupInfo);

      // Store this information for admin review
      try {
        await this.supabase
          .from('alpaca_cleanup_log')
          .insert({
            alpaca_account_id: context.alpacaAccountId,
            alpaca_account_number: context.alpacaAccountNumber,
            user_id: context.userId,
            reason: context.reason,
            cleanup_status: 'pending_manual_cleanup',
            created_at: context.timestamp
          });

        context.rollbackSteps.push({
          step: 'log_alpaca_cleanup',
          success: true,
          timestamp: new Date().toISOString()
        });

      } catch (logError) {
        console.error('Failed to log Alpaca cleanup requirement:', logError);
        
        context.rollbackSteps.push({
          step: 'log_alpaca_cleanup',
          success: false,
          error: logError instanceof Error ? logError.message : 'Failed to log cleanup requirement',
          timestamp: new Date().toISOString()
        });
      }

      // TODO: In the future, if Alpaca provides a delete API, implement it here
      // For now, we rely on manual cleanup processes

    } catch (error) {
      console.error('Error handling Alpaca account cleanup:', error);
      
      context.rollbackSteps.push({
        step: 'handle_alpaca_cleanup',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Call the rollback API endpoint
   */
  private async callRollbackAPI(context: RollbackContext): Promise<void> {
    try {
      const response = await fetch('/api/rollback-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: context.userId,
          reason: context.reason,
        }),
      });

      const success = response.ok;
      let error: string | undefined;

      if (!success) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown API error' }));
        error = errorData.error || `HTTP ${response.status}`;
      }

      context.rollbackSteps.push({
        step: 'rollback_api_call',
        success,
        error,
        timestamp: new Date().toISOString()
      });

      if (success) {
        console.log('✅ Rollback API call completed successfully');
      } else {
        console.warn('⚠️ Rollback API call failed:', error);
      }

    } catch (error) {
      console.warn('⚠️ Rollback API not available or failed:', error);
      
      context.rollbackSteps.push({
        step: 'rollback_api_call',
        success: false,
        error: error instanceof Error ? error.message : 'API call failed',
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * Log rollback event for audit trail
   */
  private async logRollbackEvent(context: RollbackContext): Promise<void> {
    try {
      await this.supabase
        .from('rollback_audit_log')
        .insert({
          user_id: context.userId,
          alpaca_account_id: context.alpacaAccountId,
          reason: context.reason,
          rollback_steps: context.rollbackSteps,
          rollback_timestamp: context.timestamp,
          success: context.rollbackSteps.every(step => step.success)
        });

      console.log('📝 Rollback event logged for audit trail');

    } catch (error) {
      console.warn('Failed to log rollback event:', error);
      // Don't fail the rollback if logging fails
    }
  }
}

/**
 * Convenience function for executing rollback
 */
export async function executeAccountRollback(
  userId?: string,
  alpacaAccountId?: string,
  reason: string = 'Account creation failed'
): Promise<RollbackResult> {
  const rollbackManager = new AccountRollbackManager();
  
  return rollbackManager.executeRollback({
    userId,
    alpacaAccountId,
    reason
  });
}

/**
 * Validate that account creation follows proper transactional flow
 */
export function validateTransactionalFlow(): {
  isValid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check that signup service exists and exports the right functions
  try {
    // This will be checked at build time
    const signupService = require('./signup-service');
    
    if (typeof signupService.createUserAccount !== 'function') {
      issues.push('createUserAccount function not found in signup service');
    }
    
    if (typeof signupService.createOAuthUserAccount !== 'function') {
      issues.push('createOAuthUserAccount function not found in signup service');
    }

  } catch (error) {
    issues.push('Signup service not accessible');
  }

  // Check that Alpaca account service exists
  try {
    const alpacaService = require('./alpaca-account');
    
    if (typeof alpacaService.createAlpacaAccount !== 'function') {
      issues.push('createAlpacaAccount function not found in Alpaca service');
    }

  } catch (error) {
    issues.push('Alpaca account service not accessible');
  }

  return {
    isValid: issues.length === 0,
    issues
  };
}