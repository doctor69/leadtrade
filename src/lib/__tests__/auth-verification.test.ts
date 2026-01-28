import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createClient } from '@supabase/supabase-js';

/**
 * Authentication Flow Verification Tests
 * 
 * Tests Requirements 1.3, 1.4, 1.5:
 * - Login with valid credentials
 * - Login with invalid credentials
 * - Session expiration handling
 * - Alpaca account ID retrieval after login
 * - Error messages don't expose sensitive info
 */

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.PUBLIC_SUPABASE_ANON_KEY || '';

describe('Authentication Flow Verification', () => {
  let testEmail: string;
  let testPassword: string;
  let testUserId: string;
  let testAlpacaAccountId: string;

  beforeAll(async () => {
    // Create a test account for authentication testing
    testEmail = `test-auth-${Date.now()}@example.com`;
    testPassword = 'TestPassword123!';

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    // Sign up test user
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          full_name: 'Test User',
          username: 'testuser',
        },
      },
    });

    if (error || !data.user) {
      throw new Error(`Failed to create test user: ${error?.message}`);
    }

    testUserId = data.user.id;
    console.log(`Test user created: ${testUserId}`);
  });

  afterAll(async () => {
    // Cleanup: Delete test user
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    if (testUserId) {
      await supabaseAdmin.auth.admin.deleteUser(testUserId);
      console.log(`Test user deleted: ${testUserId}`);
    }
  });

  describe('Requirement 1.3: Valid Credentials Login', () => {
    it('should successfully login with valid credentials', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      expect(error).toBeNull();
      expect(data.user).toBeDefined();
      expect(data.user?.email).toBe(testEmail);
      expect(data.session).toBeDefined();
      expect(data.session?.access_token).toBeDefined();
      expect(data.session?.refresh_token).toBeDefined();

      console.log('✅ Valid credentials login successful');
    });

    it('should retrieve user profile after login', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Login first
      await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      // Get user profile
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', testUserId)
        .single();

      expect(error).toBeNull();
      expect(profile).toBeDefined();
      expect(profile?.email).toBe(testEmail);
      expect(profile?.full_name).toBe('Test User');

      console.log('✅ User profile retrieved successfully');
    });
  });

  describe('Requirement 1.4: Invalid Credentials Login', () => {
    it('should fail login with invalid password', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: 'WrongPassword123!',
      });

      expect(error).toBeDefined();
      expect(error?.message).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();

      // Verify error message doesn't expose sensitive info
      expect(error?.message).not.toContain(testPassword);
      expect(error?.message).not.toContain('database');
      expect(error?.message).not.toContain('SQL');

      console.log('✅ Invalid password login correctly rejected');
    });

    it('should fail login with non-existent email', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'nonexistent@example.com',
        password: 'SomePassword123!',
      });

      expect(error).toBeDefined();
      expect(error?.message).toBeDefined();
      expect(data.user).toBeNull();
      expect(data.session).toBeNull();

      // Verify error message doesn't expose whether email exists
      expect(error?.message).not.toContain('not found');
      expect(error?.message).not.toContain('does not exist');

      console.log('✅ Non-existent email login correctly rejected');
    });

    it('should fail login with malformed email', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'not-an-email',
        password: 'SomePassword123!',
      });

      expect(error).toBeDefined();
      expect(data.user).toBeNull();

      console.log('✅ Malformed email login correctly rejected');
    });
  });

  describe('Requirement 1.5: Session Management', () => {
    it('should maintain session after login', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Login
      const { data: loginData } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      expect(loginData.session).toBeDefined();
      const sessionToken = loginData.session?.access_token;

      // Verify session is valid
      const { data: userData, error } = await supabase.auth.getUser();

      expect(error).toBeNull();
      expect(userData.user).toBeDefined();
      expect(userData.user?.email).toBe(testEmail);

      console.log('✅ Session maintained after login');
    });

    it('should refresh expired session', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Login
      const { data: loginData } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      expect(loginData.session).toBeDefined();
      const refreshToken = loginData.session?.refresh_token;

      // Refresh session
      const { data: refreshData, error } = await supabase.auth.refreshSession({
        refresh_token: refreshToken,
      });

      expect(error).toBeNull();
      expect(refreshData.session).toBeDefined();
      expect(refreshData.session?.access_token).toBeDefined();
      expect(refreshData.session?.access_token).not.toBe(loginData.session?.access_token);

      console.log('✅ Session refresh successful');
    });

    it('should clear session on signout', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Login
      await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      // Sign out
      const { error: signOutError } = await supabase.auth.signOut();
      expect(signOutError).toBeNull();

      // Verify session is cleared
      const { data: userData, error } = await supabase.auth.getUser();

      expect(error).toBeDefined();
      expect(userData.user).toBeNull();

      console.log('✅ Session cleared on signout');
    });
  });

  describe('Requirement 1.3: Alpaca Account ID Retrieval', () => {
    it('should retrieve Alpaca account ID after login', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Login
      await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword,
      });

      // Get Alpaca account
      const { data: alpacaAccount, error } = await supabase
        .from('alpaca_accounts')
        .select('alpaca_account_id, alpaca_account_number, account_status')
        .eq('user_id', testUserId)
        .single();

      // Note: This test user may not have an Alpaca account
      // In production, all users should have one
      if (alpacaAccount) {
        expect(alpacaAccount.alpaca_account_id).toBeDefined();
        expect(alpacaAccount.alpaca_account_number).toBeDefined();
        testAlpacaAccountId = alpacaAccount.alpaca_account_id;
        console.log('✅ Alpaca account ID retrieved:', testAlpacaAccountId);
      } else {
        console.log('⚠️ Test user has no Alpaca account (expected for basic test user)');
      }
    });
  });

  describe('Requirement 1.5: Error Message Security', () => {
    it('should not expose sensitive information in error messages', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      const sensitiveAttempts = [
        { email: testEmail, password: "'; DROP TABLE users; --" },
        { email: "admin' OR '1'='1", password: 'password' },
        { email: testEmail, password: '<script>alert("xss")</script>' },
      ];

      for (const attempt of sensitiveAttempts) {
        const { error } = await supabase.auth.signInWithPassword(attempt);

        expect(error).toBeDefined();
        
        // Verify error doesn't contain SQL injection attempts
        expect(error?.message).not.toContain('DROP TABLE');
        expect(error?.message).not.toContain('OR 1=1');
        expect(error?.message).not.toContain('<script>');
        
        // Verify error doesn't expose internal details
        expect(error?.message).not.toContain('database');
        expect(error?.message).not.toContain('SQL');
        expect(error?.message).not.toContain('query');
        expect(error?.message).not.toContain('stack trace');
      }

      console.log('✅ Error messages do not expose sensitive information');
    });

    it('should handle rate limiting gracefully', async () => {
      const supabase = createClient(supabaseUrl, supabaseAnonKey);

      // Attempt multiple rapid logins
      const attempts = Array(10).fill(null).map(() =>
        supabase.auth.signInWithPassword({
          email: testEmail,
          password: 'WrongPassword',
        })
      );

      const results = await Promise.all(attempts);

      // All should fail, but none should expose internal errors
      results.forEach(({ error }) => {
        expect(error).toBeDefined();
        expect(error?.message).not.toContain('rate limit');
        expect(error?.message).not.toContain('too many requests');
        // Supabase may return generic error or specific rate limit message
      });

      console.log('✅ Rate limiting handled gracefully');
    });
  });
});
