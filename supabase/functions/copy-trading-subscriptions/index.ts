import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser()

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const url = new URL(req.url)
    const leaderId = url.searchParams.get('leaderId')

    if (req.method === 'GET') {
      // Get user's subscriptions or leader's followers
      let query = supabaseClient
        .from('copy_trading_subscriptions')
        .select(`
          *,
          leader:profiles!leader_id (
            id,
            username,
            full_name,
            share_trades,
            show_asset_amounts
          )
        `)

      if (leaderId) {
        // Get followers for a specific leader
        query = query.eq('leader_id', leaderId).eq('is_active', true)
      } else {
        // Get user's subscriptions
        query = query.eq('follower_id', user.id)
      }

      const { data: subscriptions, error } = await query.order('created_at', { ascending: false })

      if (error) {
        return new Response(
          JSON.stringify({ error: error.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Calculate summary for user's subscriptions
      if (!leaderId) {
        const activeSubscriptions = subscriptions?.filter(sub => sub.is_active) || []
        const totalAllocation = activeSubscriptions.reduce(
          (total, sub) => total + parseFloat(sub.allocation_percentage.toString()), 
          0
        )

        return new Response(
          JSON.stringify({
            success: true,
            data: {
              subscriptions: subscriptions || [],
              totalAllocation,
              remainingAllocation: Math.max(0, 100 - totalAllocation),
              activeSubscriptions: activeSubscriptions.length
            }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      } else {
        return new Response(
          JSON.stringify({
            success: true,
            data: { subscriptions: subscriptions || [] }
          }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

    } else if (req.method === 'POST') {
      // Create new subscription
      const { leaderId, allocationPercentage } = await req.json()

      if (!leaderId || !allocationPercentage) {
        return new Response(
          JSON.stringify({ error: 'Leader ID and allocation percentage required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Validate allocation percentage
      if (allocationPercentage <= 0 || allocationPercentage > 100) {
        return new Response(
          JSON.stringify({ error: 'Allocation percentage must be between 0.1 and 100' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if user is trying to follow themselves
      if (user.id === leaderId) {
        return new Response(
          JSON.stringify({ error: 'Cannot follow yourself' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check if subscription already exists
      const { data: existingSubscription } = await supabaseClient
        .from('copy_trading_subscriptions')
        .select('id')
        .eq('follower_id', user.id)
        .eq('leader_id', leaderId)
        .single()

      if (existingSubscription) {
        return new Response(
          JSON.stringify({ error: 'Already following this trader' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Check total allocation doesn't exceed 100%
      const { data: currentSubscriptions } = await supabaseClient
        .from('copy_trading_subscriptions')
        .select('allocation_percentage')
        .eq('follower_id', user.id)
        .eq('is_active', true)

      const currentTotal = currentSubscriptions?.reduce(
        (total, sub) => total + parseFloat(sub.allocation_percentage.toString()), 
        0
      ) || 0

      if (currentTotal + allocationPercentage > 100) {
        return new Response(
          JSON.stringify({ 
            error: `Total allocation would exceed 100%. Available: ${100 - currentTotal}%` 
          }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      // Create subscription
      const { data: newSubscription, error: createError } = await supabaseClient
        .from('copy_trading_subscriptions')
        .insert({
          follower_id: user.id,
          leader_id: leaderId,
          allocation_percentage: allocationPercentage,
          is_active: true
        })
        .select(`
          *,
          leader:profiles!leader_id (
            id,
            username,
            full_name,
            share_trades,
            show_asset_amounts
          )
        `)
        .single()

      if (createError) {
        return new Response(
          JSON.stringify({ error: createError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ success: true, data: newSubscription }),
        { 
          status: 201, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )

    } else if (req.method === 'DELETE') {
      // Delete subscription
      const { leaderId } = await req.json()

      if (!leaderId) {
        return new Response(
          JSON.stringify({ error: 'Leader ID required' }),
          { 
            status: 400, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      const { error: deleteError } = await supabaseClient
        .from('copy_trading_subscriptions')
        .delete()
        .eq('follower_id', user.id)
        .eq('leader_id', leaderId)

      if (deleteError) {
        return new Response(
          JSON.stringify({ error: deleteError.message }),
          { 
            status: 500, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        )
      }

      return new Response(
        JSON.stringify({ success: true }),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { 
        status: 405, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})