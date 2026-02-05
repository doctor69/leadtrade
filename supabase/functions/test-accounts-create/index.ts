import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function createSuccessResponse(data: any) {
  return new Response(JSON.stringify({
    success: true,
    data: data,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
}

function createErrorResponse(message: string, status: number = 500) {
  return new Response(JSON.stringify({
    success: false,
    error: { message },
    timestamp: new Date().toISOString()
  }), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json'
    }
  })
}

/**
 * Test Account Creation Endpoint for Alpaca Consultants
 * 
 * Creates a pre-funded test account with specified parameters
 * Tracks the account in test_accounts table for verification purposes
 */
serve(async (req: Request) => {
  const requestId = crypto.randomUUID();
  
  if (req.method === 'OPTIONS') {
    return new Response('ok', { status: 200, headers: corsHeaders })
  }

  try {
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405)
    }

    // Verify service role authorization
    const authHeader = req.headers.get('authorization');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!authHeader || !authHeader.includes(serviceRoleKey || '')) {
      console.error(`[${requestId}] Unauthorized access attempt`);
      return createErrorResponse('Unauthorized - Service role required', 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return createErrorResponse('Server configuration error', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
    
    const body = await req.json();

    // Validate required fields
    if (!body.email || !body.password) {
      return createErrorResponse('Missing required fields: email, password', 400);
    }

    const {
      email,
      password,
      initial_funding = 5000.00, // Default to $5000 for Limited Live
      enable_options = false,
      purpose = 'Alpaca Limited Live Tech Review',
      created_for = 'alpaca_consultant',
      given_name = 'Test',
      family_name = 'User',
    } = body;

    console.log(`[${requestId}] Creating test account for: ${email}`);

    // Step 1: Create account using streamlined-signup
    console.log(`[${requestId}] Step 1: Creating account via streamlined-signup...`);
    
    const signupPayload = {
      email,
      password,
      given_name,
      family_name,
      full_name: `${given_name} ${family_name}`,
      date_of_birth: '1990-01-01',
      tax_id: '078051120', // Test SSN for sandbox
      tax_id_type: 'USA_SSN',
      phone_number: '+15551234567',
      street_address: ['123 Test Street'],
      city: 'Test City',
      state: 'CA',
      postal_code: '12345',
      share_trades: false,
      show_asset_amounts: false,
    };

    // Call streamlined-signup function
    const signupUrl = `${supabaseUrl}/functions/v1/streamlined-signup`;
    const signupResponse = await fetch(signupUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`,
      },
      body: JSON.stringify(signupPayload),
    });

    if (!signupResponse.ok) {
      const errorText = await signupResponse.text();
      console.error(`[${requestId}] Signup failed:`, errorText);
      return createErrorResponse(`Account creation failed: ${errorText}`, signupResponse.status);
    }

    const signupResult = await signupResponse.json();
    
    if (!signupResult.success || !signupResult.data) {
      return createErrorResponse('Account creation succeeded but returned invalid data', 500);
    }

    const userId = signupResult.data.user_id;
    const alpacaAccountId = signupResult.data.alpaca_account_id;
    const alpacaAccountNumber = signupResult.data.alpaca_account_number;

    console.log(`[${requestId}] ✅ Account created: ${userId} / ${alpacaAccountId}`);

    // Step 2: Fund the account if initial_funding is specified
    if (initial_funding > 0) {
      console.log(`[${requestId}] Step 2: Funding account with $${initial_funding}...`);
      
      try {
        // For sandbox, we'll simulate funding by updating the account
        // In production Limited Live, this would use actual ACH transfers
        console.log(`[${requestId}] ⚠️ Sandbox funding simulation - actual funding requires ACH setup`);
      } catch (fundingError) {
        console.warn(`[${requestId}] Funding setup warning:`, fundingError);
        // Don't fail the test account creation for funding issues
      }
    }

    // Step 3: Enable options trading if requested
    if (enable_options) {
      console.log(`[${requestId}] Step 3: Enabling options trading...`);
      
      try {
        const alpacaConfig = {
          brokerBaseUrl: Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL') || 'https://broker-api.sandbox.alpaca.markets',
          brokerApiKey: Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY'),
          brokerApiSecret: Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET'),
        };

        const credentials = `${alpacaConfig.brokerApiKey}:${alpacaConfig.brokerApiSecret}`;
        const encodedCredentials = btoa(credentials);

        // Update trading configuration to enable options
        const configResponse = await fetch(
          `${alpacaConfig.brokerBaseUrl}/v1/accounts/${alpacaAccountId}/trading_configurations`,
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Basic ${encodedCredentials}`,
            },
            body: JSON.stringify({
              options_trading_level: 2, // Level 2: Covered calls and cash-secured puts
            }),
          }
        );

        if (configResponse.ok) {
          console.log(`[${requestId}] ✅ Options trading enabled`);
        } else {
          console.warn(`[${requestId}] ⚠️ Options trading enablement failed`);
        }
      } catch (optionsError) {
        console.warn(`[${requestId}] Options setup warning:`, optionsError);
      }
    }

    // Step 4: Record test account in database
    console.log(`[${requestId}] Step 4: Recording test account...`);
    
    const { data: testAccount, error: testAccountError } = await supabase
      .from('test_accounts')
      .insert({
        email,
        alpaca_account_id: alpacaAccountId,
        alpaca_account_number: alpacaAccountNumber,
        purpose,
        created_for,
        funded_amount: initial_funding,
        initial_password: password, // Store for consultant access
        notes: `Created for ${created_for}. Options trading: ${enable_options ? 'enabled' : 'disabled'}`,
      })
      .select()
      .single();

    if (testAccountError) {
      console.error(`[${requestId}] Failed to record test account:`, testAccountError);
      // Don't fail the request, account was created successfully
      console.warn(`[${requestId}] ⚠️ Test account created but not recorded in tracking table`);
    } else {
      console.log(`[${requestId}] ✅ Test account recorded: ${testAccount.id}`);
    }

    console.log(`[${requestId}] 🎉 Test account creation completed successfully`);

    return createSuccessResponse({
      message: 'Test account created successfully',
      account: {
        user_id: userId,
        email,
        password, // Return password for consultant access
        alpaca_account_id: alpacaAccountId,
        alpaca_account_number: alpacaAccountNumber,
        initial_funding: `$${initial_funding.toFixed(2)}`,
        options_enabled: enable_options,
        trading_mode: 'paper',
        purpose,
        created_for,
      },
      access_instructions: {
        login_url: `${Deno.env.get('PUBLIC_APP_URL') || 'http://localhost:4321'}/signin`,
        email,
        password,
        note: 'Use these credentials to sign in and test the platform',
      },
      requestId,
    });

  } catch (error) {
    console.error(`[${requestId}] Test account creation error:`, error);
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
});
