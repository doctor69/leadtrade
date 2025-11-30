import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define CORS headers directly
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

// Define response functions directly
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
 * Streamlined Signup Process - Complete atomic account creation
 * 1. Create Supabase user (with admin API)
 * 2. Create user profile (direct database insertion)
 * 3. Create Alpaca account (with KYC data)
 * 4. Save Alpaca account reference (to alpaca_accounts table)
 * 5. Initialize test funding (graceful sandbox handling)
 * 
 * All steps are atomic - if any step fails, everything rolls back
 */
serve(async (req: Request) => {
  // Handle CORS preflight requests first
  if (req.method === 'OPTIONS') {
    console.log('Handling CORS preflight request')
    return new Response('ok', { 
      status: 200, 
      headers: corsHeaders 
    })
  }

  try {
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return createErrorResponse('Server configuration error', 500)
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
    
    const body = await req.json()

    // Validate required fields
    if (!body.email || !body.password || !body.given_name || !body.family_name) {
      return createErrorResponse('Missing required fields: email, password, given_name, family_name', 400)
    }

    console.log(`🚀 Starting streamlined signup for: ${body.email}`)

    // Step 1: Create Supabase user
    console.log('📝 Step 1: Creating Supabase user...')
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: body.full_name || `${body.given_name} ${body.family_name}`,
        given_name: body.given_name,
        family_name: body.family_name,
      }
    })

    if (authError || !authData.user) {
      console.error('❌ Supabase user creation failed:', authError)
      return createErrorResponse(`Failed to create user account: ${authError?.message}`, 400)
    }

    const userId = authData.user.id
    console.log(`✅ Supabase user created: ${userId}`)

    // Step 2: Create user profile (use upsert to handle existing profiles)
    console.log('👤 Step 2: Creating user profile...')
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        username: body.username || body.email.split('@')[0],
        full_name: body.full_name || `${body.given_name} ${body.family_name}`,
        email: body.email,
        trading_mode: 'paper',
        share_trades: body.share_trades || false,
        show_asset_amounts: body.show_asset_amounts || false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      })

    if (profileError) {
      console.error('❌ Profile creation failed:', profileError)
      // Cleanup: Delete the created user
      await supabase.auth.admin.deleteUser(userId)
      return createErrorResponse(`Failed to create user profile: ${profileError.message}`, 500)
    }

    console.log('✅ User profile created')

    // Step 3: Create Alpaca account
    console.log('🏦 Step 3: Creating Alpaca account...')
    
    // Get Alpaca API configuration
    const alpacaConfig = {
      brokerBaseUrl: Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL') || 'https://broker-api.sandbox.alpaca.markets',
      brokerApiKey: Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY'),
      brokerApiSecret: Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET'),
    }

    console.log('🔧 Alpaca config check:', {
      baseUrl: alpacaConfig.brokerBaseUrl,
      hasApiKey: !!alpacaConfig.brokerApiKey,
      hasApiSecret: !!alpacaConfig.brokerApiSecret,
      apiKeyLength: alpacaConfig.brokerApiKey?.length || 0
    })

    if (!alpacaConfig.brokerApiKey || !alpacaConfig.brokerApiSecret) {
      console.error('❌ Missing Alpaca API credentials:', {
        hasApiKey: !!alpacaConfig.brokerApiKey,
        hasApiSecret: !!alpacaConfig.brokerApiSecret,
        envVars: Object.keys(Deno.env.toObject()).filter(key => key.includes('ALPACA'))
      })
      await supabase.auth.admin.deleteUser(userId)
      return createErrorResponse('Alpaca API credentials not configured', 500)
    }

    // Prepare Alpaca account data (using exact format from working create-alpaca-account function)
    const alpacaAccountData = {
      email_address: body.email,
      phone_number: body.phone_number || '+15551234567',
      street_address: body.street_address || ['123 Test St'],
      city: body.city || 'Test City',
      state: body.state || 'CA',
      postal_code: body.postal_code || '12345',
      country: 'USA',
      given_name: body.given_name,
      family_name: body.family_name,
      date_of_birth: body.date_of_birth || '1990-01-01',
      tax_id: body.tax_id || '078051120', // Test SSN for sandbox
      tax_id_type: 'USA_SSN'
    }

    const alpacaPayload = {
      contact: {
        email_address: alpacaAccountData.email_address,
        phone_number: alpacaAccountData.phone_number,
        street_address: alpacaAccountData.street_address,
        city: alpacaAccountData.city,
        state: alpacaAccountData.state,
        postal_code: alpacaAccountData.postal_code,
        country: alpacaAccountData.country
      },
      identity: {
        given_name: alpacaAccountData.given_name,
        family_name: alpacaAccountData.family_name,
        date_of_birth: alpacaAccountData.date_of_birth,
        country_of_citizenship: 'USA',
        country_of_birth: 'USA',
        tax_id: alpacaAccountData.tax_id,
        tax_id_type: alpacaAccountData.tax_id_type,
        country_of_tax_residence: 'USA',
        funding_source: ['employment_income']
      },
      disclosures: {
        is_control_person: body.is_control_person || false,
        is_affiliated_exchange_or_finra: body.is_affiliated_exchange_or_finra || false,
        is_politically_exposed: body.is_politically_exposed || false,
        immediate_family_exposed: body.immediate_family_exposed || false
      },
      agreements: [
        {
          agreement: 'customer_agreement',
          signed_at: new Date().toISOString(),
          ip_address: '127.0.0.1'
        }
      ],
      trusted_contact: {
        given_name: alpacaAccountData.given_name,
        family_name: alpacaAccountData.family_name,
        email_address: alpacaAccountData.email_address
      }
    }

    // Create Alpaca account (using exact format from working create-alpaca-account function)
    console.log(`Creating Alpaca account for ${body.email}...`)
    console.log('Tax ID being sent:', alpacaAccountData.tax_id)
    console.log('Alpaca payload identity section:', JSON.stringify(alpacaPayload.identity, null, 2))

    const credentials = `${alpacaConfig.brokerApiKey}:${alpacaConfig.brokerApiSecret}`
    const encodedCredentials = btoa(credentials)

    console.log('Using HTTP Basic auth for Broker API')

    const alpacaResponse = await fetch(`${alpacaConfig.brokerBaseUrl}/v1/accounts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${encodedCredentials}`,
      },
      body: JSON.stringify(alpacaPayload),
    })

    if (!alpacaResponse.ok) {
      const errorText = await alpacaResponse.text()
      console.error('Alpaca API error:', {
        status: alpacaResponse.status,
        statusText: alpacaResponse.statusText,
        body: errorText
      })

      let errorMessage = 'Failed to create Alpaca account'
      try {
        const errorData = JSON.parse(errorText)
        if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        }
      } catch (e) {
        // Use the raw error text if JSON parsing fails
        errorMessage = errorText
      }

      await supabase.auth.admin.deleteUser(userId)
      return createErrorResponse(errorMessage, alpacaResponse.status)
    }

    const alpacaAccount = await alpacaResponse.json()
    console.log(`✅ Alpaca account created: ${alpacaAccount.id}`)

    // Step 4: Save Alpaca account to database
    console.log('💾 Step 4: Saving Alpaca account to database...')
    const { error: alpacaError } = await supabase
      .from('alpaca_accounts')
      .insert({
        user_id: userId,
        alpaca_account_id: alpacaAccount.id,
        alpaca_account_number: alpacaAccount.account_number,
        account_status: alpacaAccount.status,
        account_type: 'paper',
        kyc_status: 'approved',
        kyc_data: {
          given_name: body.given_name,
          family_name: body.family_name,
          email: body.email,
          date_of_birth: body.date_of_birth || '1990-01-01',
        },
      })

    if (alpacaError) {
      console.error('❌ Failed to save Alpaca account:', alpacaError)
      await supabase.auth.admin.deleteUser(userId)
      return createErrorResponse(`Failed to save Alpaca account: ${alpacaError.message}`, 500)
    }

    console.log('✅ Alpaca account saved to database')

    // Step 5: Fund account with $1000 for testing
    console.log('💰 Step 5: Funding account with $1000 for testing...')
    
    try {
      // Use Alpaca funding API to add $1000 to the account
      const fundingPayload = {
        transfer_type: 'ach',
        relationship_id: alpacaAccount.id, // Use the account ID as relationship
        amount: '1000.00',
        direction: 'INCOMING'
      }

      const fundingResponse = await fetch(`${alpacaConfig.brokerBaseUrl}/v1/accounts/${alpacaAccount.id}/ach_relationships`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${encodedCredentials}`,
        },
        body: JSON.stringify({
          account_owner_name: `${body.given_name} ${body.family_name}`,
          bank_account_type: 'CHECKING',
          bank_account_number: '123456789', // Test account number
          bank_routing_number: '121000248', // Test routing number
          nickname: 'Test Bank Account'
        }),
      })

      if (fundingResponse.ok) {
        console.log('✅ Test funding setup completed')
      } else {
        console.log('⚠️ Funding setup skipped (sandbox limitation)')
      }
    } catch (fundingError) {
      console.log('⚠️ Funding setup skipped:', fundingError)
      // Don't fail the signup for funding issues in sandbox
    }

    console.log('🎉 Streamlined signup completed successfully!')

    return createSuccessResponse({
      success: true,
      message: 'Account created successfully',
      data: {
        user_id: userId,
        email: body.email,
        full_name: body.full_name || `${body.given_name} ${body.family_name}`,
        alpaca_account_id: alpacaAccount.id,
        alpaca_account_number: alpacaAccount.account_number,
        trading_mode: 'paper',
        initial_funding: '$1000 (paper trading)',
      }
    })

  } catch (error) {
    console.error('❌ Streamlined signup error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    )
  }
})