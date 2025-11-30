/**
 * Alpaca Trading Configuration API Client
 * 
 * Provides functions for managing account trading configurations including:
 * - Day Trade Buying Power checks
 * - Trade confirmation emails
 * - Trading suspension
 * - Short selling restrictions
 * - Fractional trading
 * - Margin multipliers
 * - Pattern Day Trader checks
 * - Options trading levels
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { z } from 'zod'

// Validation schemas
export const TradingConfigurationSchema = z.object({
  dtbp_check: z.enum(['entry', 'exit', 'both']),
  trade_confirm_email: z.enum(['all', 'none']),
  suspend_trade: z.boolean(),
  no_shorting: z.boolean(),
  fractional_trading: z.boolean(),
  max_margin_multiplier: z.string(),
  pdt_check: z.enum(['entry', 'exit', 'both']),
  ptp_no_exception_entry: z.boolean(),
  max_options_trading_level: z.number().min(0).max(3)
})

export const TradingConfigUpdateSchema = z.object({
  dtbp_check: z.enum(['entry', 'exit', 'both']).optional(),
  trade_confirm_email: z.enum(['all', 'none']).optional(),
  suspend_trade: z.boolean().optional(),
  no_shorting: z.boolean().optional(),
  fractional_trading: z.boolean().optional(),
  max_margin_multiplier: z.string().optional(),
  pdt_check: z.enum(['entry', 'exit', 'both']).optional(),
  ptp_no_exception_entry: z.boolean().optional(),
  max_options_trading_level: z.number().min(0).max(3).optional()
})

// TypeScript types
export type TradingConfiguration = z.infer<typeof TradingConfigurationSchema>
export type TradingConfigUpdate = z.infer<typeof TradingConfigUpdateSchema>

/**
 * Get trading configuration for an account
 * 
 * @param accountId - The Alpaca account ID
 * @returns Promise with trading configuration or error
 */
export async function getTradingConfiguration(
  accountId: string
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  try {
    if (!accountId) {
      return {
        success: false,
        error: 'Account ID is required'
      }
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-trading-config/${accountId}`

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      credentials: 'include'
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to fetch trading configuration'
      }
    }

    // Validate response
    const configValidation = TradingConfigurationSchema.safeParse(result)
    if (!configValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      }
    }

    return {
      success: true,
      config: configValidation.data
    }
  } catch (error) {
    console.error('Error fetching trading configuration:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Update trading configuration for an account
 * 
 * @param accountId - The Alpaca account ID
 * @param config - Configuration fields to update
 * @returns Promise with updated configuration or error
 */
export async function updateTradingConfiguration(
  accountId: string,
  config: TradingConfigUpdate
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  try {
    if (!accountId) {
      return {
        success: false,
        error: 'Account ID is required'
      }
    }

    // Validate input
    const validation = TradingConfigUpdateSchema.safeParse(config)
    if (!validation.success) {
      return {
        success: false,
        error: `Validation error: ${validation.error.message}`
      }
    }

    // Validate at least one field is provided
    if (Object.keys(config).length === 0) {
      return {
        success: false,
        error: 'At least one configuration field must be provided'
      }
    }

    // Validate max_margin_multiplier range
    if (config.max_margin_multiplier !== undefined) {
      const multiplier = parseFloat(config.max_margin_multiplier)
      if (isNaN(multiplier) || multiplier < 1 || multiplier > 4) {
        return {
          success: false,
          error: 'max_margin_multiplier must be a number between 1 and 4'
        }
      }
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-trading-config/${accountId}`

    const response = await fetch(edgeFunctionUrl, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(config),
      credentials: 'include'
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to update trading configuration'
      }
    }

    // Validate response
    const configValidation = TradingConfigurationSchema.safeParse(result)
    if (!configValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      }
    }

    return {
      success: true,
      config: configValidation.data
    }
  } catch (error) {
    console.error('Error updating trading configuration:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Enable fractional trading for an account
 * 
 * @param accountId - The Alpaca account ID
 * @returns Promise with updated configuration or error
 */
export async function enableFractionalTrading(
  accountId: string
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  return updateTradingConfiguration(accountId, { fractional_trading: true })
}

/**
 * Disable fractional trading for an account
 * 
 * @param accountId - The Alpaca account ID
 * @returns Promise with updated configuration or error
 */
export async function disableFractionalTrading(
  accountId: string
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  return updateTradingConfiguration(accountId, { fractional_trading: false })
}

/**
 * Suspend trading for an account
 * 
 * @param accountId - The Alpaca account ID
 * @returns Promise with updated configuration or error
 */
export async function suspendTrading(
  accountId: string
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  return updateTradingConfiguration(accountId, { suspend_trade: true })
}

/**
 * Resume trading for an account
 * 
 * @param accountId - The Alpaca account ID
 * @returns Promise with updated configuration or error
 */
export async function resumeTrading(
  accountId: string
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  return updateTradingConfiguration(accountId, { suspend_trade: false })
}

/**
 * Enable short selling for an account
 * 
 * @param accountId - The Alpaca account ID
 * @returns Promise with updated configuration or error
 */
export async function enableShortSelling(
  accountId: string
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  return updateTradingConfiguration(accountId, { no_shorting: false })
}

/**
 * Disable short selling for an account
 * 
 * @param accountId - The Alpaca account ID
 * @returns Promise with updated configuration or error
 */
export async function disableShortSelling(
  accountId: string
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  return updateTradingConfiguration(accountId, { no_shorting: true })
}

/**
 * Set maximum margin multiplier for an account
 * 
 * @param accountId - The Alpaca account ID
 * @param multiplier - Margin multiplier (1-4)
 * @returns Promise with updated configuration or error
 */
export async function setMarginMultiplier(
  accountId: string,
  multiplier: number
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  return updateTradingConfiguration(accountId, { 
    max_margin_multiplier: multiplier.toString() 
  })
}

/**
 * Set maximum options trading level for an account
 * 
 * @param accountId - The Alpaca account ID
 * @param level - Options trading level (0-3)
 * @returns Promise with updated configuration or error
 */
export async function setOptionsLevel(
  accountId: string,
  level: number
): Promise<{ success: boolean; config?: TradingConfiguration; error?: string }> {
  return updateTradingConfiguration(accountId, { 
    max_options_trading_level: level 
  })
}
