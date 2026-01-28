import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';

/**
 * Authentication Statistics API
 * 
 * GET /api/admin/auth-stats
 * 
 * Returns authentication statistics for the verification dashboard
 */
export const GET: APIRoute = async ({ request }) => {
  try {
    const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    const serviceRoleKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Server configuration error',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Get signup statistics
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, created_at');

    if (profilesError) {
      throw profilesError;
    }

    const { data: alpacaAccounts, error: alpacaError } = await supabase
      .from('alpaca_accounts')
      .select('user_id, created_at');

    if (alpacaError) {
      throw alpacaError;
    }

    const totalSignups = profiles?.length || 0;
    const successfulSignups = alpacaAccounts?.length || 0;
    const failedSignups = totalSignups - successfulSignups;
    const successRate = totalSignups > 0 ? (successfulSignups / totalSignups) * 100 : 0;

    // Get session statistics
    const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();

    if (usersError) {
      throw usersError;
    }

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const activeSessions = usersData.users.filter(user => {
      const lastSignIn = user.last_sign_in_at ? new Date(user.last_sign_in_at) : null;
      return lastSignIn && lastSignIn > oneHourAgo;
    }).length;

    // Get test accounts
    const { data: testAccounts, error: testAccountsError } = await supabase
      .from('test_accounts')
      .select('*')
      .order('created_at', { ascending: false });

    if (testAccountsError) {
      throw testAccountsError;
    }

    // Calculate signup trends (last 7 days)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const recentSignups = profiles?.filter(p => 
      new Date(p.created_at) > sevenDaysAgo
    ).length || 0;

    const recentSuccessful = alpacaAccounts?.filter(a => 
      new Date(a.created_at) > sevenDaysAgo
    ).length || 0;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          signups: {
            total: totalSignups,
            successful: successfulSignups,
            failed: failedSignups,
            successRate: successRate.toFixed(2),
            recentSignups,
            recentSuccessful,
          },
          sessions: {
            activeSessions,
            totalUsers: usersData.users.length,
            activityRate: usersData.users.length > 0 
              ? ((activeSessions / usersData.users.length) * 100).toFixed(2)
              : '0.00',
          },
          testAccounts: {
            total: testAccounts?.length || 0,
            accounts: testAccounts || [],
          },
        },
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Auth stats error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
