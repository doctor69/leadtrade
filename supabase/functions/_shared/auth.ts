import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from './cors.ts'

export interface AuthContext {
  userId: string
  sessionToken: string
  isAuthenticated: boolean
  tradingMode: 'paper' | 'live'
  alpacaAccessToken: string
  alpacaAccountId?: string
  alpacaAccountNumber?: string
  alpacaAccountStatus?: string
}

export interface AuthError {
  status: number
  message: string
  code: string
}

/**
 * Validates the authentication token and extracts user context
 * @param req The incoming request object
 * @returns AuthContext object or AuthError if validation fails
 */
export async function validateAuth(req: Request): Promise<AuthContext | AuthError> {
  try {
    const authHeader = req.headers.get('Authorization')
    
    if (!authHeader) {
      return {
        status: 401,
        message: 'Missing authorization header',
        code: 'AUTHENTICATION_FAILED'
      }
    }

    // Create Supabase client with the auth token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return {
        status: 401,
        message: userError?.message || 'Unauthorized',
        code: 'AUTHENTICATION_FAILED'
      }
    }

    // Get app-level trading mode from app_settings (not per-user)
    const { data: appSettings, error: settingsError } = await supabaseClient
      .from('app_settings')
      .select('setting_value')
      .eq('setting_key', 'trading_mode')
      .single()

    if (settingsError) {
      console.warn(`Failed to fetch app trading mode: ${settingsError.message}, defaulting to paper`)
    }

    const tradingMode = (appSettings?.setting_value === 'live' ? 'live' : 'paper') as 'paper' | 'live'
    
    console.log(`App-level trading mode: ${tradingMode}`)

    // Get Alpaca account information
    const { data: alpacaAccounts, error: alpacaError } = await supabaseClient
      .from('alpaca_accounts')
      .select('alpaca_account_id, alpaca_account_number, account_status')
      .eq('user_id', user.id)

    if (alpacaError) {
      return {
        status: 500,
        message: `Failed to fetch Alpaca account: ${alpacaError.message}`,
        code: 'DATABASE_ERROR'
      }
    }

    if (!alpacaAccounts || alpacaAccounts.length === 0) {
      return {
        status: 400,
        message: 'Alpaca account not found. Please complete account setup.',
        code: 'MISSING_ALPACA_ACCOUNT'
      }
    }

    if (alpacaAccounts.length > 1) {
      console.warn(`Multiple Alpaca accounts found for user ${user.id}, using the first one`)
    }

    const alpacaAccount = alpacaAccounts[0]

    // Extract session token from auth header
    const sessionToken = authHeader.replace('Bearer ', '')

    return {
      userId: user.id,
      sessionToken,
      isAuthenticated: true,
      tradingMode, // App-level setting from database
      alpacaAccessToken: '', // We'll use API keys instead
      alpacaAccountId: alpacaAccount.alpaca_account_id,
      alpacaAccountNumber: alpacaAccount.alpaca_account_number,
      alpacaAccountStatus: alpacaAccount.account_status
    }
  } catch (error) {
    return {
      status: 500,
      message: error instanceof Error ? error.message : 'Unknown authentication error',
      code: 'AUTHENTICATION_ERROR'
    }
  }
}

/**
 * Creates a standardized error response for authentication failures
 * @param error The authentication error
 * @returns Response object with appropriate status and error details
 */
export function createAuthErrorResponse(error: AuthError): Response {
  return new Response(
    JSON.stringify({
      success: false,
      error: error.message,
      code: error.code
    }),
    {
      status: error.status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  )
}

/**
 * Helper function to handle authentication in Edge Functions
 * @param req The incoming request object
 * @param handler The handler function to execute if authentication succeeds
 * @returns Response from the handler or an error response
 */
export async function withAuth(
  req: Request,
  handler: (authContext: AuthContext) => Promise<Response>
): Promise<Response> {
  const authResult = await validateAuth(req)
  
  if ('status' in authResult) {
    return createAuthErrorResponse(authResult)
  }
  
  return await handler(authResult)
}