import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as bcrypt from "https://deno.land/x/bcrypt@v0.4.1/mod.ts"

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }

  try {
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)
    const body = await req.json()

    // Validate required fields
    const requiredFields = [
      'email', 'password', 'given_name', 'family_name', 'date_of_birth',
      'tax_id', 'phone_number', 'street_address', 'city', 'state', 'postal_code',
      'investment_experience_with_stocks', 'investment_objective', 'risk_tolerance'
    ]

    for (const field of requiredFields) {
      if (!body[field]) {
        return new Response(
          JSON.stringify({ error: `${field} is required` }),
          { 
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(body.password, 12)

    // Step 1: Create Supabase user
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: body.email,
      password: body.password,
      email_confirm: true,
      user_metadata: {
        full_name: `${body.given_name} ${body.family_name}`,
      }
    })

    if (authError || !authData.user) {
      return new Response(
        JSON.stringify({
          error: 'Failed to create user account',
          details: authError?.message
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const userId = authData.user.id

    try {
      // Step 2: Store user profile
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: userId,
          username: body.email.split('@')[0],
          full_name: `${body.given_name} ${body.family_name}`,
        })

      if (profileError) {
        console.warn('Profile creation warning:', profileError.message)
      }

      // Step 3: Store comprehensive user details
      const { error: detailsError } = await supabaseAdmin
        .from('user_details')
        .insert({
          user_id: userId,
          email: body.email,
          password_hash: hashedPassword,
          given_name: body.given_name,
          family_name: body.family_name,
          date_of_birth: body.date_of_birth,
          tax_id: body.tax_id,
          tax_id_type: body.tax_id_type || 'USA_SSN',
          phone_number: body.phone_number,
          street_address: body.street_address,
          city: body.city,
          state: body.state,
          postal_code: body.postal_code,
          country_of_citizenship: body.country_of_citizenship || 'USA',
          country_of_birth: body.country_of_birth || 'USA',
          country_of_tax_residence: body.country_of_tax_residence || 'USA',
          funding_source: body.funding_source || ['employment_income'],
          investment_experience_with_stocks: body.investment_experience_with_stocks,
          investment_objective: body.investment_objective,
          risk_tolerance: body.risk_tolerance,
        })

      if (detailsError) {
        throw new Error(`Failed to store user details: ${detailsError.message}`)
      }

      // Step 4: Create initial portfolio record
      const { error: portfolioError } = await supabaseAdmin
        .from('portfolios')
        .insert({
          user_id: userId,
          total_value: 100000,
          cash: 100000,
        })

      if (portfolioError) {
        console.warn('Failed to create portfolio record:', portfolioError.message)
      }

      return new Response(
        JSON.stringify({
          success: true,
          message: 'LEADTRADE account created successfully',
          data: {
            user_id: userId,
            email: body.email,
            full_name: `${body.given_name} ${body.family_name}`,
          }
        }),
        {
          status: 201,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )

    } catch (error) {
      // Cleanup: Delete the created user if something fails
      await supabaseAdmin.auth.admin.deleteUser(userId)
      throw error
    }

  } catch (error) {
    console.error('Account creation error:', error)
    return new Response(
      JSON.stringify({
        error: 'Failed to create account',
        message: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})