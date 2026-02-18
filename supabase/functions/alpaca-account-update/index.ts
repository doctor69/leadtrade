/**
 * LEADTRADE - Social Copy Trading Platform
 * Copyright (c) 2025 doctor
 * 
 * Licensed under the Fair Source License.
 * Non-commercial use permitted. Commercial use requires a paid license.
 * See LICENSE file for details or contact license@leadtrade.app
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALPACA_API_KEY = Deno.env.get('ALPACA_API_KEY')!
const ALPACA_API_SECRET = Deno.env.get('ALPACA_API_SECRET')!
const ALPACA_BASE_URL = Deno.env.get('ALPACA_BASE_URL') || 'https://broker-api.sandbox.alpaca.markets'

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    // Get auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    )

    // Verify user is authenticated
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const { account_id, updates } = await req.json()

    if (!account_id || !updates) {
      throw new Error('Missing required fields: account_id and updates')
    }

    // Validate that user owns this account
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('alpaca_account_id')
      .eq('id', user.id)
      .single()

    if (profile?.alpaca_account_id !== account_id) {
      throw new Error('Unauthorized: Account does not belong to user')
    }

    // Get current account status to check KYC
    const accountResponse = await fetch(
      `${ALPACA_BASE_URL}/v1/accounts/${account_id}`,
      {
        headers: {
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
        },
      }
    )

    if (!accountResponse.ok) {
      throw new Error('Failed to fetch account status')
    }

    const accountData = await accountResponse.json()

    // Restrict updates based on KYC status
    const isKYCApproved = accountData.status === 'ACTIVE' || accountData.status === 'APPROVED'

    if (isKYCApproved) {
      // After KYC approval, only allow contact and trusted_contact updates
      // Do NOT allow identity updates (name, DOB, SSN, etc.)
      if (updates.identity) {
        throw new Error(
          'Identity information cannot be changed after KYC approval. Please contact support.'
        )
      }
    }

    // Update account via Alpaca API
    const updateResponse = await fetch(
      `${ALPACA_BASE_URL}/v1/accounts/${account_id}`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'APCA-API-KEY-ID': ALPACA_API_KEY,
          'APCA-API-SECRET-KEY': ALPACA_API_SECRET,
        },
        body: JSON.stringify(updates),
      }
    )

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text()
      console.error('Alpaca API error:', errorText)
      throw new Error(`Failed to update account: ${errorText}`)
    }

    const updatedAccount = await updateResponse.json()

    return new Response(JSON.stringify({ success: true, account: updatedAccount }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error updating account:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
