#!/usr/bin/env node

/**
 * Apply Database Migrations Script
 * 
 * This script applies pending migrations to the Supabase database
 * by executing SQL files in chronological order.
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration
const SUPABASE_URL = process.env.PUBLIC_SUPABASE_URL || 'http://192.168.12.155:54321';
const SUPABASE_SERVICE_KEY = process.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: PUBLIC_SUPABASE_SERVICE_ROLE_KEY not found in environment');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migrations to apply in order (from the unapplied migrations report)
const MIGRATIONS_TO_APPLY = [
  '20250108_account_documents.sql',
  '20250109_ach_relationships.sql',
  '20250109_bank_relationships.sql',
  '20250109_corporate_actions.sql',
  '20250109_kyc_submissions.sql',
  '20250109_oauth_management.sql',
  '20250109_options_positions.sql',
  '20250109_rebalancing.sql',
  '20250109_transfers.sql',
  '20250109_watchlists.sql'
];

/**
 * Apply a single migration file
 */
async function applyMigration(filename) {
  const migrationPath = join(__dirname, '..', 'supabase', 'migrations', filename);
  
  console.log(`\n📄 Applying: ${filename}`);
  
  try {
    // Read the SQL file
    const sql = readFileSync(migrationPath, 'utf8');
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct execution if RPC fails
      console.log('   Trying direct execution...');
      const { error: directError } = await supabase.from('_migrations').insert({
        name: filename,
        executed_at: new Date().toISOString()
      });
      
      if (directError && directError.code !== '42P01') {
        throw directError;
      }
      
      // Execute SQL directly using raw query
      // Note: This requires the SQL to be executed via the REST API
      // For local development, we'll use a different approach
      console.log('   ⚠️  Direct execution not available via REST API');
      console.log('   Please apply this migration manually or use Supabase CLI');
      return false;
    }
    
    console.log(`   ✅ Successfully applied: ${filename}`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error applying ${filename}:`, error.message);
    return false;
  }
}

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
    // If error code is 42P01, table doesn't exist
    if (error && error.code === '42P01') {
      return false;
    }
    
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🔧 Database Migration Application Script');
  console.log('========================================\n');
  console.log(`📡 Connecting to: ${SUPABASE_URL}\n`);
  
  // Check which tables are missing
  const tablesToCheck = [
    'account_documents',
    'kyc_submissions',
    'onfido_sdk_tokens',
    'corporate_actions',
    'ach_relationships',
    'bank_relationships',
    'transfers',
    'options_positions',
    'watchlists',
    'watchlist_assets',
    'rebalancing_portfolios',
    'rebalancing_subscriptions',
    'rebalancing_runs',
    'oauth_authorizations',
    'oauth_access_tokens'
  ];
  
  console.log('🔍 Checking current database state...\n');
  
  const missingTables = [];
  for (const table of tablesToCheck) {
    const exists = await tableExists(table);
    if (!exists) {
      missingTables.push(table);
      console.log(`   ✗ ${table} - MISSING`);
    } else {
      console.log(`   ✓ ${table} - EXISTS`);
    }
  }
  
  if (missingTables.length === 0) {
    console.log('\n✅ All tables already exist! No migrations needed.');
    return;
  }
  
  console.log(`\n⚠️  Found ${missingTables.length} missing tables`);
  console.log('\n📋 Migrations to apply:\n');
  
  MIGRATIONS_TO_APPLY.forEach((migration, index) => {
    console.log(`   ${index + 1}. ${migration}`);
  });
  
  console.log('\n🚀 Starting migration process...\n');
  console.log('⚠️  NOTE: Direct SQL execution via REST API is limited.');
  console.log('   For best results, use one of these methods:\n');
  console.log('   1. Install Supabase CLI and run: supabase db push');
  console.log('   2. Apply migrations manually via Supabase Dashboard SQL Editor');
  console.log('   3. Use the provided shell script: bash scripts/apply-migrations.sh\n');
  
  // Try to apply migrations
  let successCount = 0;
  let failCount = 0;
  
  for (const migration of MIGRATIONS_TO_APPLY) {
    const success = await applyMigration(migration);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }
  
  console.log('\n========================================');
  console.log('📊 Migration Summary:');
  console.log(`   ✅ Successful: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log('========================================\n');
  
  if (failCount > 0) {
    console.log('⚠️  Some migrations could not be applied automatically.\n');
    console.log('📝 Manual Application Instructions:\n');
    console.log('1. Go to: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl');
    console.log('   OR for local: http://192.168.12.155:54323');
    console.log('2. Navigate to SQL Editor');
    console.log('3. For each migration file in supabase/migrations/:');
    console.log('   - Open the file');
    console.log('   - Copy the entire SQL content');
    console.log('   - Paste into SQL Editor');
    console.log('   - Click "Run"\n');
    console.log('Migration files to apply:');
    MIGRATIONS_TO_APPLY.forEach((migration, index) => {
      console.log(`   ${index + 1}. ${migration}`);
    });
    console.log('');
  }
  
  // Verify after applying
  console.log('🔍 Verifying database state after migration...\n');
  
  const stillMissing = [];
  for (const table of tablesToCheck) {
    const exists = await tableExists(table);
    if (!exists) {
      stillMissing.push(table);
    }
  }
  
  if (stillMissing.length === 0) {
    console.log('✅ All tables now exist! Migrations applied successfully.\n');
  } else {
    console.log(`⚠️  ${stillMissing.length} tables still missing:\n`);
    stillMissing.forEach(table => {
      console.log(`   ✗ ${table}`);
    });
    console.log('\nPlease apply the remaining migrations manually.\n');
  }
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
