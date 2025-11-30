import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'
import { 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  corsHeaders
} from '../_shared/index.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AlpacaDocument {
  document_type: string
  document_sub_type: string
  content?: string
  content_data?: null
  mime_type: string
}

interface AlpacaAccountData {
  user_id: string
  email: string
  full_name: string
  given_name: string
  family_name: string
  date_of_birth: string
  tax_id: string
  tax_id_type: string
  phone_number: string
  street_address: string | string[]
  city: string
  state: string
  postal_code: string
  country: string
  annual_income_min: string
  annual_income_max: string
  total_net_worth_min: string
  total_net_worth_max: string
  liquid_net_worth_min: string
  liquid_net_worth_max: string
  investment_experience: string
  investment_objective: string
  risk_tolerance: string
  employment_status: string
  employer_name?: string
  employer_address?: string
  employment_position: string
  is_control_person: boolean
  is_affiliated_exchange_or_finra: boolean
  is_politically_exposed: boolean
  immediate_family_exposed: boolean
  documents?: AlpacaDocument[]
}

serve(async (req: Request) => {
  return processRequest(req, async () => {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return createErrorResponse('Method not allowed', 405)
    }

    try {
    // Parse request body
    const body: AlpacaAccountData = await req.json()

    // Validate required fields - user_id is optional for pre-signup creation
    if (!body.email || !body.full_name) {
      return createErrorResponse('Missing required fields: email, full_name', 400)
    }

    // Additional validation for Alpaca requirements
    const validationErrors: string[] = []

    if (!body.given_name || body.given_name.trim().length < 1) {
      validationErrors.push('First name is required')
    }
    if (!body.family_name || body.family_name.trim().length < 1) {
      validationErrors.push('Last name is required')
    }
    if (!body.date_of_birth) {
      validationErrors.push('Date of birth is required')
    } else {
      // Check age requirement and date format
      const birthDate = new Date(body.date_of_birth)
      if (isNaN(birthDate.getTime())) {
        validationErrors.push('Invalid date of birth format. Use YYYY-MM-DD')
      } else {
        const today = new Date()
        let age = today.getFullYear() - birthDate.getFullYear()
        const monthDiff = today.getMonth() - birthDate.getMonth()
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
          age--
        }
        if (age < 18) {
          validationErrors.push('You must be at least 18 years old')
        }
        if (age > 120) {
          validationErrors.push('Invalid date of birth')
        }
      }
    }
    if (!body.tax_id) {
      validationErrors.push('Social Security Number is required')
    } else {
      const cleanTaxId = body.tax_id.replace(/[-\s]/g, '')
      if (!/^\d{9}$/.test(cleanTaxId)) {
        validationErrors.push('Valid 9-digit Social Security Number is required')
      }
      // Check for valid test SSN patterns for sandbox
      const testSSNPatterns = ['078051120', '900700000', '123456789', '000000000']
      if (testSSNPatterns.includes(cleanTaxId)) {
        console.log('Using test SSN pattern for sandbox environment')
      }
    }
    if (!body.phone_number) {
      validationErrors.push('Phone number is required')
    } else {
      const cleanPhone = body.phone_number.replace(/[-\s\(\)]/g, '')
      if (!/^\d{10}$/.test(cleanPhone)) {
        validationErrors.push('Valid 10-digit phone number is required')
      }
    }
    if (!body.street_address || !body.city || !body.state || !body.postal_code) {
      validationErrors.push('Complete address is required')
    } else {
      const streetAddress = Array.isArray(body.street_address) ? body.street_address[0] : String(body.street_address)
      if (streetAddress && streetAddress.trim().length < 5) {
        validationErrors.push('Street address must be at least 5 characters')
      }
      if (body.city.trim().length < 2) {
        validationErrors.push('City must be at least 2 characters')
      }
      if (!/^[A-Z]{2}$/.test(body.state.toUpperCase())) {
        validationErrors.push('State must be a valid 2-letter code (e.g., NY, CA)')
      }
      if (!/^\d{5}(-\d{4})?$/.test(body.postal_code)) {
        validationErrors.push('ZIP code must be in format 12345 or 12345-6789')
      }
    }

    if (validationErrors.length > 0) {
      return createErrorResponse(`Validation failed: ${validationErrors.join('; ')}`, 400)
    }

    console.log(`Creating Alpaca account for user: ${body.email}`)
    console.log('Account data:', {
      given_name: body.given_name,
      family_name: body.family_name,
      date_of_birth: body.date_of_birth,
      tax_id: body.tax_id ? '***masked***' : 'missing',
      phone_number: body.phone_number,
      street_address: body.street_address,
      city: body.city,
      state: body.state,
      postal_code: body.postal_code,
    })

    // Get environment variables with validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    console.log('🔧 Environment check:', {
      hasSupabaseUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      supabaseUrl: supabaseUrl
    })

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase environment variables')
      return createErrorResponse('Server configuration error', 500)
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    console.log('✅ Supabase client initialized with service role')

    // Clean and format data for Alpaca
    const cleanTaxId = body.tax_id.replace(/[-\s]/g, '')
    const cleanPhone = body.phone_number.replace(/[-\s\(\)]/g, '')
    const formattedPhone = `+1${cleanPhone}`
    
    // For Alpaca sandbox, use a known valid test SSN format
    const testSSN = '078051120' // This SSN format works with Alpaca sandbox
    const finalTaxId = cleanTaxId === '123456789' ? testSSN : cleanTaxId
    
    // Prepare Alpaca account data
    const alpacaAccountData = {
      given_name: body.given_name.trim(),
      family_name: body.family_name.trim(),
      date_of_birth: body.date_of_birth,
      tax_id: finalTaxId,
      tax_id_type: body.tax_id_type || 'USA_SSN',
      phone_number: formattedPhone,
      email_address: body.email.toLowerCase().trim(),
      street_address: Array.isArray(body.street_address) ? body.street_address : [String(body.street_address).trim()],
      city: body.city.trim(),
      state: body.state.toUpperCase().trim(),
      postal_code: body.postal_code.trim(),
      country: body.country || 'USA',
      annual_income_min: body.annual_income_min || '25000',
      annual_income_max: body.annual_income_max || '49999',
      total_net_worth_min: body.total_net_worth_min || '25000',
      total_net_worth_max: body.total_net_worth_max || '49999',
      liquid_net_worth_min: body.liquid_net_worth_min || '10000',
      liquid_net_worth_max: body.liquid_net_worth_max || '24999',
      investment_experience: body.investment_experience || 'limited',
      investment_objective: body.investment_objective || 'growth',
      risk_tolerance: body.risk_tolerance || 'moderate',
    }

    // Get Alpaca API configuration
    const alpacaConfig = {
      brokerBaseUrl: Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_BASE_URL') || 'https://broker-api.sandbox.alpaca.markets',
      brokerApiKey: Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_KEY'),
      brokerApiSecret: Deno.env.get('PUBLIC_ALPACA_BROKER_SANDBOX_API_SECRET'),
    }

    if (!alpacaConfig.brokerApiKey || !alpacaConfig.brokerApiSecret) {
      console.error('Missing Alpaca API credentials:', {
        hasApiKey: !!alpacaConfig.brokerApiKey,
        hasApiSecret: !!alpacaConfig.brokerApiSecret,
        baseUrl: alpacaConfig.brokerBaseUrl
      })
      return createErrorResponse('Alpaca API credentials not configured', 500)
    }

    console.log('Alpaca config loaded:', {
      baseUrl: alpacaConfig.brokerBaseUrl,
      hasApiKey: !!alpacaConfig.brokerApiKey,
      hasApiSecret: !!alpacaConfig.brokerApiSecret
    })

    // Prepare the Alpaca account creation payload (correct format)
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

    console.log(`Creating Alpaca account for ${body.email}...`)
    console.log('Tax ID being sent:', finalTaxId)
    console.log('Alpaca payload identity section:', JSON.stringify(alpacaPayload.identity, null, 2))

    // Make the API call to Alpaca using Broker API authentication (HTTP Basic)
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
      let errorDetails: any = null

      try {
        const errorData = JSON.parse(errorText)

        // Handle different types of Alpaca error responses
        if (errorData.message) {
          errorMessage = errorData.message
        } else if (errorData.error) {
          errorMessage = errorData.error
        } else if (errorData.errors && Array.isArray(errorData.errors)) {
          // Handle validation errors array
          const validationErrors = errorData.errors.map((err: any) => {
            if (typeof err === 'string') return err
            if (err.message) return err.message
            if (err.field && err.error) return `${err.field}: ${err.error}`
            return JSON.stringify(err)
          })
          errorMessage = validationErrors.join('; ')
        }

        errorDetails = errorData
      } catch {
        errorMessage = `HTTP ${alpacaResponse.status}: ${alpacaResponse.statusText}`
      }

      // Provide more helpful error messages for common issues
      if (errorMessage.includes('tax_id')) {
        errorMessage = 'Invalid Social Security Number format. Please enter a valid 9-digit SSN.'
      } else if (errorMessage.includes('date_of_birth')) {
        errorMessage = 'Invalid date of birth. You must be at least 18 years old.'
      } else if (errorMessage.includes('phone_number')) {
        errorMessage = 'Invalid phone number format. Please enter a valid US phone number.'
      } else if (errorMessage.includes('email')) {
        errorMessage = 'Invalid email address format.'
      } else if (errorMessage.includes('address')) {
        errorMessage = 'Invalid address information. Please check your street address, city, state, and ZIP code.'
      }

      return createErrorResponse(errorMessage, alpacaResponse.status)
    }

    const alpacaAccount = await alpacaResponse.json()
    console.log(`✅ Alpaca account created successfully: ${alpacaAccount.id}`)
    console.log('Alpaca account details:', {
      id: alpacaAccount.id,
      account_number: alpacaAccount.account_number,
      status: alpacaAccount.status
    })

    // Only store in database if user_id is provided (after LeadTrade account creation)
    console.log('🔍 Checking if user_id is provided for database storage:', {
      user_id: body.user_id,
      hasUserId: !!body.user_id,
      bodyKeys: Object.keys(body),
      fullBody: JSON.stringify(body, null, 2)
    })
    
    if (body.user_id) {
      // Store KYC data in user metadata
      const { error: metadataError } = await supabase.auth.admin.updateUserById(
        body.user_id,
        {
          user_metadata: {
            kyc_data: {
              ...alpacaAccountData,
              kyc_completed: true,
              kyc_completed_at: new Date().toISOString()
            }
          }
        }
      )

      if (metadataError) {
        console.error('Failed to update user metadata:', metadataError)
      }

      // Store Alpaca account info in database
      console.log('💾 Storing Alpaca account info in database...')
      console.log('Database insert data:', {
        user_id: body.user_id,
        alpaca_account_id: alpacaAccount.id,
        alpaca_account_number: alpacaAccount.account_number,
        account_status: alpacaAccount.status,
        account_type: 'paper',
        kyc_status: 'approved'
      })

      const { data: insertData, error: alpacaError } = await supabase
        .from('alpaca_accounts')
        .upsert({
          user_id: body.user_id,
          alpaca_account_id: alpacaAccount.id,
          alpaca_account_number: alpacaAccount.account_number,
          account_status: alpacaAccount.status,
          account_type: 'paper', // Default to paper trading
          kyc_status: 'approved', // Since Alpaca account was created successfully
          kyc_data: {
            // Store minimal KYC data for reference
            given_name: alpacaAccountData.given_name,
            family_name: alpacaAccountData.family_name,
            date_of_birth: alpacaAccountData.date_of_birth,
            phone_number: alpacaAccountData.phone_number,
            city: alpacaAccountData.city,
            state: alpacaAccountData.state,
            postal_code: alpacaAccountData.postal_code,
            investment_experience: alpacaAccountData.investment_experience,
            investment_objective: alpacaAccountData.investment_objective,
            risk_tolerance: alpacaAccountData.risk_tolerance,
          },
        })
        .select()

      if (alpacaError) {
        console.error('❌ Failed to store Alpaca account info:', alpacaError)
        console.error('Error details:', JSON.stringify(alpacaError, null, 2))
        return createErrorResponse(`Failed to store account information: ${alpacaError.message}`, 500)
      }

      console.log('✅ Alpaca account info stored successfully:', insertData)

      // Update user profile - Note: profiles table doesn't have alpaca_account_id column
      // The alpaca_account_id is stored in the alpaca_accounts table instead
      console.log('✅ Alpaca account info stored in database successfully')

      if (profileError) {
        console.error('Failed to update profile:', profileError)
      }
    } else {
      console.log('⚠️ No user_id provided - skipping database storage')
      console.log('Request body keys:', Object.keys(body))
    }

    return createSuccessResponse({
      success: true,
      accountId: alpacaAccount.id,
      accountNumber: alpacaAccount.account_number,
      status: alpacaAccount.status,
      message: 'Alpaca brokerage account created successfully'
    })

    } catch (error) {
      console.error('Alpaca account creation error:', error)
      return createErrorResponse(
        error instanceof Error ? error.message : 'Unknown error occurred',
        500
      )
    }
  })
})