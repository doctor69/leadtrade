#!/usr/bin/env node

/**
 * Manual Migration Application Helper
 * 
 * This script helps you apply migrations manually by:
 * 1. Checking which tables are missing
 * 2. Identifying which migrations need to be applied
 * 3. Providing the SQL content for easy copy-paste
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

// Create Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Migrations to apply in order
const MIGRATIONS_TO_APPLY = [
  {
    file: '20250108_account_documents.sql',
    tables: ['account_documents'],
    description: 'Document metadata for KYC uploads'
  },
  {
    file: '20250109_ach_relationships.sql',
    tables: ['ach_relationships'],
    description: 'ACH bank account linking'
  },
  {
    file: '20250109_bank_relationships.sql',
    tables: ['bank_relationships'],
    description: 'Wire transfer bank relationships'
  },
  {
    file: '20250109_corporate_actions.sql',
    tables: ['corporate_actions'],
    description: 'Corporate action announcements'
  },
  {
    file: '20250109_kyc_submissions.sql',
    tables: ['kyc_submissions', 'onfido_sdk_tokens'],
    description: 'KYC/CIP verification submissions'
  },
  {
    file: '20250109_oauth_management.sql',
    tables: ['oauth_authorizations', 'oauth_access_tokens'],
    description: 'OAuth authorization management'
  },
  {
    file: '20250109_options_positions.sql',
    tables: ['options_positions'],
    description: 'Options positions tracking'
  },
  {
    file: '20250109_rebalancing.sql',
    tables: ['rebalancing_portfolios', 'rebalancing_subscriptions', 'rebalancing_runs'],
    description: 'Portfolio rebalancing functionality'
  },
  {
    file: '20250109_transfers.sql',
    tables: ['transfers'],
    description: 'Transfer history (ACH, wire, sandbox)'
  },
  {
    file: '20250109_watchlists.sql',
    tables: ['watchlists', 'watchlist_assets'],
    description: 'User watchlists for tracking securities'
  }
];

/**
 * Check if a table exists
 */
async function tableExists(tableName) {
  try {
    const { error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    
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
  console.log('🔧 Manual Migration Application Helper');
  console.log('======================================\n');
  console.log(`📡 Connecting to: ${SUPABASE_URL}\n`);
  
  // Check which migrations need to be applied
  console.log('🔍 Checking which migrations are needed...\n');
  
  const migrationsNeeded = [];
  
  for (const migration of MIGRATIONS_TO_APPLY) {
    let allTablesExist = true;
    const missingTables = [];
    
    for (const table of migration.tables) {
      const exists = await tableExists(table);
      if (!exists) {
        allTablesExist = false;
        missingTables.push(table);
      }
    }
    
    if (!allTablesExist) {
      migrationsNeeded.push({
        ...migration,
        missingTables
      });
    }
  }
  
  if (migrationsNeeded.length === 0) {
    console.log('✅ All migrations have been applied! No action needed.\n');
    return;
  }
  
  console.log(`⚠️  Found ${migrationsNeeded.length} migrations that need to be applied:\n`);
  
  migrationsNeeded.forEach((migration, index) => {
    console.log(`${index + 1}. ${migration.file}`);
    console.log(`   Description: ${migration.description}`);
    console.log(`   Missing tables: ${migration.missingTables.join(', ')}`);
    console.log('');
  });
  
  console.log('========================================');
  console.log('📝 Manual Application Instructions');
  console.log('========================================\n');
  
  const isLocal = SUPABASE_URL.includes('192.168') || SUPABASE_URL.includes('localhost');
  
  if (isLocal) {
    console.log('🏠 Local Supabase Instance Detected\n');
    console.log('Option 1: Use Supabase Studio (Recommended)');
    console.log('   1. Open: http://192.168.12.155:54323');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Apply each migration below\n');
    console.log('Option 2: Use Supabase CLI');
    console.log('   1. Install CLI: brew install supabase/tap/supabase');
    console.log('   2. Run: supabase db push\n');
  } else {
    console.log('☁️  Remote Supabase Instance\n');
    console.log('Option 1: Use Supabase Dashboard (Recommended)');
    console.log('   1. Go to: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Apply each migration below\n');
    console.log('Option 2: Use Supabase CLI');
    console.log('   1. Install CLI: brew install supabase/tap/supabase');
    console.log('   2. Link project: supabase link --project-ref bfbqlzpbkivyrnjkvqgl');
    console.log('   3. Run: supabase db push\n');
  }
  
  console.log('========================================');
  console.log('📄 Migrations to Apply (in order)');
  console.log('========================================\n');
  
  migrationsNeeded.forEach((migration, index) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Migration ${index + 1}: ${migration.file}`);
    console.log(`${'='.repeat(60)}`);
    console.log(`Description: ${migration.description}`);
    console.log(`Creates tables: ${migration.tables.join(', ')}`);
    console.log(`Missing: ${migration.missingTables.join(', ')}`);
    console.log(`\nFile location: supabase/migrations/${migration.file}`);
    console.log(`\n${'='.repeat(60)}\n`);
    
    // Read and display the SQL content
    try {
      const migrationPath = join(__dirname, '..', 'supabase', 'migrations', migration.file);
      const sql = readFileSync(migrationPath, 'utf8');
      
      console.log('SQL Content (copy and paste into SQL Editor):\n');
      console.log('```sql');
      console.log(sql);
      console.log('```\n');
    } catch (error) {
      console.error(`❌ Error reading migration file: ${error.message}\n`);
    }
  });
  
  console.log('\n========================================');
  console.log('✅ Next Steps');
  console.log('========================================\n');
  console.log('1. Copy the SQL content for each migration above');
  console.log('2. Paste into SQL Editor (in order)');
  console.log('3. Click "Run" for each migration');
  console.log('4. Verify no errors occurred');
  console.log('5. Run this script again to verify all tables exist\n');
  console.log('Or simply run: npm run verify:schema\n');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
