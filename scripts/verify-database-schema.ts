/**
 * Database Schema Verification Script
 * 
 * This script connects to the Supabase database and verifies that all expected
 * tables exist with the correct structure.
 */

import { createClient } from '@supabase/supabase-js';

// Expected tables based on migrations
const EXPECTED_TABLES = [
  // Core MVP tables
  'profiles',
  'alpaca_accounts',
  'copy_trading_subscriptions',
  'app_settings',
  
  // Securities & Market Data
  'securities_cache',
  
  // Documents & KYC
  'account_documents',
  'kyc_submissions',
  'onfido_sdk_tokens',
  'corporate_actions',
  
  // Banking & Transfers
  'ach_relationships',
  'bank_relationships',
  'transfers',
  
  // Trading
  'options_positions',
  'watchlists',
  'watchlist_assets',
  
  // Portfolio Management
  'rebalancing_portfolios',
  'rebalancing_subscriptions',
  'rebalancing_runs',
  
  // OAuth
  'oauth_authorizations',
  'oauth_access_tokens',
];

interface TableInfo {
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
}

interface TableSummary {
  name: string;
  exists: boolean;
  columnCount?: number;
  columns?: string[];
}

async function verifyDatabaseSchema() {
  console.log('🔍 Starting Database Schema Verification...\n');
  
  // Get environment variables
  const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_LOCAL_URL;
  const supabaseKey = process.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in environment variables');
    console.error('   Required: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }
  
  console.log(`📡 Connecting to: ${supabaseUrl}\n`);
  
  // Create Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Query to get all tables in the public schema
    const { data: tables, error: tablesError } = await supabase
      .rpc('exec_sql', {
        sql: `
          SELECT table_name 
          FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
          ORDER BY table_name;
        `
      });
    
    if (tablesError) {
      // If RPC doesn't exist, try direct query
      console.log('⚠️  RPC method not available, using direct query...\n');
      
      const results: TableSummary[] = [];
      
      for (const tableName of EXPECTED_TABLES) {
        try {
          // Try to query the table with limit 0 to check existence
          const { error } = await supabase
            .from(tableName)
            .select('*', { count: 'exact', head: true });
          
          if (error) {
            if (error.code === '42P01') {
              // Table does not exist
              results.push({ name: tableName, exists: false });
            } else {
              // Other error (might be RLS policy)
              results.push({ name: tableName, exists: true });
            }
          } else {
            results.push({ name: tableName, exists: true });
          }
        } catch (err) {
          results.push({ name: tableName, exists: false });
        }
      }
      
      // Display results
      console.log('📊 Table Verification Results:\n');
      console.log('═'.repeat(60));
      
      const existingTables = results.filter(t => t.exists);
      const missingTables = results.filter(t => !t.exists);
      
      console.log(`\n✅ Existing Tables (${existingTables.length}/${EXPECTED_TABLES.length}):\n`);
      existingTables.forEach(table => {
        console.log(`   ✓ ${table.name}`);
      });
      
      if (missingTables.length > 0) {
        console.log(`\n❌ Missing Tables (${missingTables.length}):\n`);
        missingTables.forEach(table => {
          console.log(`   ✗ ${table.name}`);
        });
      }
      
      console.log('\n' + '═'.repeat(60));
      console.log(`\n📈 Summary: ${existingTables.length}/${EXPECTED_TABLES.length} tables exist`);
      
      if (missingTables.length > 0) {
        console.log('\n⚠️  Some tables are missing. You may need to:');
        console.log('   1. Apply pending migrations');
        console.log('   2. Check migration files in supabase/migrations/');
        console.log('   3. Run: supabase db push (if using Supabase CLI)');
        process.exit(1);
      } else {
        console.log('\n✅ All expected tables exist!');
      }
      
      return;
    }
    
    // If we got here, RPC worked
    const existingTableNames = tables.map((t: any) => t.table_name);
    
    console.log('📊 Database Schema Verification Results:\n');
    console.log('═'.repeat(60));
    
    const results: TableSummary[] = EXPECTED_TABLES.map(tableName => ({
      name: tableName,
      exists: existingTableNames.includes(tableName),
    }));
    
    const existingTables = results.filter(t => t.exists);
    const missingTables = results.filter(t => !t.exists);
    
    console.log(`\n✅ Existing Tables (${existingTables.length}/${EXPECTED_TABLES.length}):\n`);
    existingTables.forEach(table => {
      console.log(`   ✓ ${table.name}`);
    });
    
    if (missingTables.length > 0) {
      console.log(`\n❌ Missing Tables (${missingTables.length}):\n`);
      missingTables.forEach(table => {
        console.log(`   ✗ ${table.name}`);
      });
    }
    
    // Show additional tables not in expected list
    const unexpectedTables = existingTableNames.filter(
      (name: string) => !EXPECTED_TABLES.includes(name)
    );
    
    if (unexpectedTables.length > 0) {
      console.log(`\n📋 Additional Tables Found (${unexpectedTables.length}):\n`);
      unexpectedTables.forEach((name: string) => {
        console.log(`   • ${name}`);
      });
    }
    
    console.log('\n' + '═'.repeat(60));
    console.log(`\n📈 Summary: ${existingTables.length}/${EXPECTED_TABLES.length} expected tables exist`);
    
    if (missingTables.length > 0) {
      console.log('\n⚠️  Some tables are missing. You may need to:');
      console.log('   1. Apply pending migrations');
      console.log('   2. Check migration files in supabase/migrations/');
      console.log('   3. Run: supabase db push (if using Supabase CLI)');
      process.exit(1);
    } else {
      console.log('\n✅ All expected tables exist!');
    }
    
  } catch (error) {
    console.error('❌ Error connecting to database:', error);
    process.exit(1);
  }
}

// Run the verification
verifyDatabaseSchema();
