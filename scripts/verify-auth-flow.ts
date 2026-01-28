#!/usr/bin/env tsx

/**
 * Authentication Flow Verification Script
 * 
 * Manual verification of authentication requirements:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Session expiration handling
 * - Alpaca account ID retrieval
 * - Error message security
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

function logResult(test: string, status: 'PASS' | 'FAIL' | 'WARN', message: string, details?: any) {
  results.push({ test, status, message, details });
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`${icon} ${test}: ${message}`);
  if (details) {
    console.log('   Details:', JSON.stringify(details, null, 2));
  }
}

async function verifyAuthFlow() {
  console.log('🔍 Starting Authentication Flow Verification\n');

  const supabase = createClient(supabaseUrl, supabaseAnonKey);
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  // Create test user
  const testEmail = `auth-verify-${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  let testUserId: string | null = null;

  try {
    console.log('📝 Creating test user...');
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Auth Test User',
          username: 'authtest',
        },
      },
    });

    if (signupError || !signupData.user) {
      logResult('Test User Creation', 'FAIL', signupError?.message || 'No user returned');
      return;
    }

    testUserId = signupData.user.id;
    logResult('Test User Creation', 'PASS', `Created user: ${testUserId}`);

    // Test 1: Login with valid credentials
    console.log('\n📋 Test 1: Login with Valid Credentials');
    try {
      const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (loginError || !loginData.user || !loginData.session) {
        logResult('Valid Login', 'FAIL', loginError?.message || 'No session returned');
      } else {
        logResult('Valid Login', 'PASS', 'Successfully logged in', {
          userId: loginData.user.id,
          hasAccessToken: !!loginData.session.access_token,
          hasRefreshToken: !!loginData.session.refresh_token,
        });
      }
    } catch (error) {
      logResult('Valid Login', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 2: Login with invalid password
    console.log('\n📋 Test 2: Login with Invalid Password');
    try {
      const { data: invalidData, error: invalidError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'WrongPassword123!',
      });

      if (invalidError && !invalidData.user) {
        // Check error message doesn't expose sensitive info
        const errorMsg = invalidError.message.toLowerCase();
        const hasSensitiveInfo = 
          errorMsg.includes('database') ||
          errorMsg.includes('sql') ||
          errorMsg.includes('query') ||
          errorMsg.includes(testPassword.toLowerCase());

        if (hasSensitiveInfo) {
          logResult('Invalid Password', 'FAIL', 'Error message exposes sensitive information', {
            errorMessage: invalidError.message,
          });
        } else {
          logResult('Invalid Password', 'PASS', 'Correctly rejected with safe error message', {
            errorMessage: invalidError.message,
          });
        }
      } else {
        logResult('Invalid Password', 'FAIL', 'Should have rejected invalid password');
      }
    } catch (error) {
      logResult('Invalid Password', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 3: Login with non-existent email
    console.log('\n📋 Test 3: Login with Non-existent Email');
    try {
      const { data: noUserData, error: noUserError } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      });

      if (noUserError && !noUserData.user) {
        // Check error message doesn't reveal if email exists
        const errorMsg = noUserError.message.toLowerCase();
        const revealsExistence = 
          errorMsg.includes('not found') ||
          errorMsg.includes('does not exist') ||
          errorMsg.includes('no user');

        if (revealsExistence) {
          logResult('Non-existent Email', 'WARN', 'Error message may reveal email existence', {
            errorMessage: noUserError.message,
          });
        } else {
          logResult('Non-existent Email', 'PASS', 'Correctly rejected without revealing email existence', {
            errorMessage: noUserError.message,
          });
        }
      } else {
        logResult('Non-existent Email', 'FAIL', 'Should have rejected non-existent email');
      }
    } catch (error) {
      logResult('Non-existent Email', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 4: Session management
    console.log('\n📋 Test 4: Session Management');
    try {
      // Login
      const { data: sessionData } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      if (!sessionData.session) {
        logResult('Session Management', 'FAIL', 'No session created');
      } else {
        // Verify session is valid
        const { data: userData, error: userError } = await supabase.auth.getUser();

        if (userError || !userData.user) {
          logResult('Session Management', 'FAIL', 'Session not maintained');
        } else {
          logResult('Session Management', 'PASS', 'Session maintained correctly', {
            userId: userData.user.id,
            email: userData.user.email,
          });
        }

        // Test session refresh
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession({
          refresh_token: sessionData.session.refresh_token,
        });

        if (refreshError || !refreshData.session) {
          logResult('Session Refresh', 'FAIL', 'Session refresh failed');
        } else {
          logResult('Session Refresh', 'PASS', 'Session refreshed successfully');
        }

        // Test signout
        const { error: signOutError } = await supabase.auth.signOut();
        if (signOutError) {
          logResult('Session Signout', 'FAIL', 'Signout failed');
        } else {
          const { data: afterSignout } = await supabase.auth.getUser();
          if (afterSignout.user) {
            logResult('Session Signout', 'FAIL', 'Session not cleared after signout');
          } else {
            logResult('Session Signout', 'PASS', 'Session cleared on signout');
          }
        }
      }
    } catch (error) {
      logResult('Session Management', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 5: Alpaca account ID retrieval
    console.log('\n📋 Test 5: Alpaca Account ID Retrieval');
    try {
      // Login again
      await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      const { data: alpacaAccount, error: alpacaError } = await supabase
        .from('alpaca_accounts')
        .select('alpaca_account_id, alpaca_account_number, account_status')
        .eq('user_id', testUserId)
        .single();

      if (alpacaError) {
        logResult('Alpaca Account Retrieval', 'WARN', 'No Alpaca account found (expected for test user)', {
          error: alpacaError.message,
        });
      } else if (alpacaAccount) {
        logResult('Alpaca Account Retrieval', 'PASS', 'Alpaca account retrieved successfully', {
          alpacaAccountId: alpacaAccount.alpaca_account_id,
          accountNumber: alpacaAccount.alpaca_account_number,
          status: alpacaAccount.account_status,
        });
      }
    } catch (error) {
      logResult('Alpaca Account Retrieval', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

    // Test 6: SQL injection protection
    console.log('\n📋 Test 6: SQL Injection Protection');
    try {
      const sqlInjectionAttempts = [
        "'; DROP TABLE users; --",
        "admin' OR '1'='1",
        "' OR 1=1 --",
      ];

      let allProtected = true;
      for (const attempt of sqlInjectionAttempts) {
        const { error } = await supabase.auth.signInWithPassword({
          email: testEmail,
          password: attempt,
        });

        if (error) {
          const errorMsg = error.message.toLowerCase();
          if (errorMsg.includes('drop table') || errorMsg.includes('or 1=1')) {
            allProtected = false;
            break;
          }
        }
      }

      if (allProtected) {
        logResult('SQL Injection Protection', 'PASS', 'All SQL injection attempts safely handled');
      } else {
        logResult('SQL Injection Protection', 'FAIL', 'SQL injection attempt exposed in error message');
      }
    } catch (error) {
      logResult('SQL Injection Protection', 'FAIL', error instanceof Error ? error.message : 'Unknown error');
    }

  } finally {
    // Cleanup
    if (testUserId) {
      console.log('\n🧹 Cleaning up test user...');
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
      console.log('✅ Test user deleted');
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`📝 Total: ${results.length}`);

  if (failed > 0) {
    console.log('\n❌ VERIFICATION FAILED');
    process.exit(1);
  } else if (warned > 0) {
    console.log('\n⚠️  VERIFICATION PASSED WITH WARNINGS');
  } else {
    console.log('\n✅ ALL VERIFICATIONS PASSED');
  }
}

// Run verification
verifyAuthFlow().catch((error) => {
  console.error('❌ Verification script error:', error);
  process.exit(1);
});
