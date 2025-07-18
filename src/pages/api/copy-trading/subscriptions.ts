import type { APIRoute } from 'astro';
import { z } from 'zod';
import { supabase } from '../../../lib/supabase';
import { DatabaseService } from '../../../lib/database';

// Validation schemas
const createSubscriptionSchema = z.object({
  leader_id: z.string().uuid(),
  allocation_percentage: z.number().min(0.1).max(100),
});

const updateSubscriptionSchema = z.object({
  allocation_percentage: z.number().min(0.1).max(100).optional(),
  is_active: z.boolean().optional(),
});

const subscriptionParamsSchema = z.object({
  id: z.string().uuid(),
});

// GET - Get user's subscriptions
export const GET: APIRoute = async ({ request }) => {
  try {
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get user's subscriptions with leader profile information
    const { data: subscriptions, error } = await supabase
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
      .eq('follower_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return new Response(JSON.stringify({ 
        error: 'Failed to fetch subscriptions',
        details: error.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Calculate total allocation
    const totalAllocation = subscriptions
      ?.filter(sub => sub.is_active)
      ?.reduce((total, sub) => total + parseFloat(sub.allocation_percentage), 0) || 0;

    return new Response(JSON.stringify({
      success: true,
      data: subscriptions || [],
      totalAllocation,
      remainingAllocation: Math.max(0, 100 - totalAllocation)
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Subscriptions GET error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST - Create new subscription
export const POST: APIRoute = async ({ request }) => {
  try {
    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = createSubscriptionSchema.parse(body);

    // Check if user is trying to follow themselves
    if (validatedData.leader_id === user.id) {
      return new Response(JSON.stringify({ 
        error: 'Cannot follow yourself' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify leader exists and shares trades
    const { data: leader, error: leaderError } = await supabase
      .from('profiles')
      .select('id, share_trades')
      .eq('id', validatedData.leader_id)
      .single();

    if (leaderError || !leader) {
      return new Response(JSON.stringify({ 
        error: 'Leader not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (!leader.share_trades) {
      return new Response(JSON.stringify({ 
        error: 'This trader is not sharing trades' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('copy_trading_subscriptions')
      .select('id')
      .eq('follower_id', user.id)
      .eq('leader_id', validatedData.leader_id)
      .single();

    if (existingSubscription) {
      return new Response(JSON.stringify({ 
        error: 'Already following this trader' 
      }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate total allocation doesn't exceed 100%
    const isValidAllocation = await DatabaseService.validateAllocationPercentage(
      user.id, 
      validatedData.allocation_percentage
    );

    if (!isValidAllocation) {
      return new Response(JSON.stringify({ 
        error: 'Total allocation would exceed 100%' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create subscription
    const subscriptionData = {
      follower_id: user.id,
      leader_id: validatedData.leader_id,
      allocation_percentage: validatedData.allocation_percentage,
      is_active: true
    };

    const { data: newSubscription, error: createError } = await supabase
      .from('copy_trading_subscriptions')
      .insert(subscriptionData)
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
      .single();

    if (createError) {
      console.error('Error creating subscription:', createError);
      return new Response(JSON.stringify({ 
        error: 'Failed to create subscription',
        details: createError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: newSubscription,
      message: 'Successfully subscribed to trader'
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request data',
        details: error.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('Subscription POST error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT - Update existing subscription
export const PUT: APIRoute = async ({ request, url }) => {
  try {
    // Get subscription ID from URL
    const subscriptionId = url.searchParams.get('id');
    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: 'Subscription ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate subscription ID format
    const validatedParams = subscriptionParamsSchema.parse({ id: subscriptionId });

    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse and validate request body
    const body = await request.json();
    const validatedData = updateSubscriptionSchema.parse(body);

    // Verify subscription exists and belongs to user
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('copy_trading_subscriptions')
      .select('*')
      .eq('id', validatedParams.id)
      .eq('follower_id', user.id)
      .single();

    if (fetchError || !existingSubscription) {
      return new Response(JSON.stringify({ 
        error: 'Subscription not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If updating allocation percentage, validate total doesn't exceed 100%
    if (validatedData.allocation_percentage !== undefined) {
      const isValidAllocation = await DatabaseService.validateAllocationPercentage(
        user.id, 
        validatedData.allocation_percentage,
        validatedParams.id
      );

      if (!isValidAllocation) {
        return new Response(JSON.stringify({ 
          error: 'Total allocation would exceed 100%' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Update subscription
    const { data: updatedSubscription, error: updateError } = await supabase
      .from('copy_trading_subscriptions')
      .update(validatedData)
      .eq('id', validatedParams.id)
      .eq('follower_id', user.id)
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
      .single();

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return new Response(JSON.stringify({ 
        error: 'Failed to update subscription',
        details: updateError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      data: updatedSubscription,
      message: 'Subscription updated successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request data',
        details: error.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('Subscription PUT error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE - Remove subscription
export const DELETE: APIRoute = async ({ request, url }) => {
  try {
    // Get subscription ID from URL
    const subscriptionId = url.searchParams.get('id');
    if (!subscriptionId) {
      return new Response(JSON.stringify({ error: 'Subscription ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate subscription ID format
    const validatedParams = subscriptionParamsSchema.parse({ id: subscriptionId });

    // Get user from session
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid authentication' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify subscription exists and belongs to user
    const { data: existingSubscription, error: fetchError } = await supabase
      .from('copy_trading_subscriptions')
      .select('id')
      .eq('id', validatedParams.id)
      .eq('follower_id', user.id)
      .single();

    if (fetchError || !existingSubscription) {
      return new Response(JSON.stringify({ 
        error: 'Subscription not found' 
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete subscription
    const { error: deleteError } = await supabase
      .from('copy_trading_subscriptions')
      .delete()
      .eq('id', validatedParams.id)
      .eq('follower_id', user.id);

    if (deleteError) {
      console.error('Error deleting subscription:', deleteError);
      return new Response(JSON.stringify({ 
        error: 'Failed to delete subscription',
        details: deleteError.message 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Subscription deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(JSON.stringify({ 
        error: 'Invalid request data',
        details: error.errors 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.error('Subscription DELETE error:', error);
    return new Response(JSON.stringify({ 
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};