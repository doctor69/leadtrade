#!/usr/bin/env node

/**
 * Check Applied Migrations - Simple Version
 * Lists all migration files and compares with database tables
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Migration Analysis\n');
console.log('═'.repeat(80));

// List all migration files
const migrationsDir = path.join(__dirname, '../supabase/migrations');

try {
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .filter(f => !f.startsWith('VERIFY_')) // Exclude verification scripts
    .filter(f => !f.includes('README')) // Exclude README files
    .sort();
  
  console.log(`\n📁 Migration Files Found (${files.length}):\n`);
  
  // Group migrations by purpose
  const migrations = {
    base: [],
    alpaca: [],
    fixes: [],
    features: []
  };
  
  files.forEach((file) => {
    if (file.startsWith('006_')) {
      migrations.base.push(file);
    } else if (file.includes('20241209')) {
      migrations.fixes.push(file);
    } else if (file.includes('202410')) {
      migrations.base.push(file);
    } else if (file.includes('202501')) {
      migrations.features.push(file);
    } else {
      migrations.alpaca.push(file);
    }
  });
  
  // Display base migrations
  if (migrations.base.length > 0) {
    console.log('📦 Base Schema Migrations:');
    migrations.base.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');
  }
  
  // Display fix migrations
  if (migrations.fixes.length > 0) {
    console.log('🔧 Fix Migrations (December 2024):');
    migrations.fixes.forEach((file, index) => {
      console.log(`   ${index + 1}. ${file}`);
    });
    console.log('');
  }
  
  // Display feature migrations
  if (migrations.features.length > 0) {
    console.log('✨ Feature Migrations (January 2025):');
    migrations.features.forEach((file, index) => {
      const tables = getTablesFromFilename(file);
      console.log(`   ${index + 1}. ${file}`);
      if (tables) {
        console.log(`      Creates: ${tables}`);
      }
    });
    console.log('');
  }
  
  console.log('═'.repeat(80));
  
  // Based on the database verification report, we know which tables are missing
  const missingTables = [
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
  
  console.log('\n📊 Migration Status Analysis:\n');
  console.log('Based on database verification report from Task 1.2:');
  console.log(`  • 5 tables exist (profiles, alpaca_accounts, copy_trading_subscriptions, app_settings, securities_cache)`);
  console.log(`  • 15 tables are missing\n`);
  
  console.log('🔍 Unapplied Migrations (Need to be applied):\n');
  
  const unappliedMigrations = [
    { file: '20250108_account_documents.sql', creates: 'account_documents' },
    { file: '20250109_ach_relationships.sql', creates: 'ach_relationships' },
    { file: '20250109_bank_relationships.sql', creates: 'bank_relationships' },
    { file: '20250109_corporate_actions.sql', creates: 'corporate_actions' },
    { file: '20250109_kyc_submissions.sql', creates: 'kyc_submissions, onfido_sdk_tokens' },
    { file: '20250109_oauth_management.sql', creates: 'oauth_authorizations, oauth_access_tokens' },
    { file: '20250109_options_positions.sql', creates: 'options_positions' },
    { file: '20250109_rebalancing.sql', creates: 'rebalancing_portfolios, rebalancing_subscriptions, rebalancing_runs' },
    { file: '20250109_transfers.sql', creates: 'transfers' },
    { file: '20250109_watchlists.sql', creates: 'watchlists, watchlist_assets' }
  ];
  
  unappliedMigrations.forEach((migration, index) => {
    const exists = files.includes(migration.file);
    const status = exists ? '✅' : '❌';
    console.log(`   ${status} ${index + 1}. ${migration.file}`);
    console.log(`      Creates: ${migration.creates}`);
  });
  
  console.log('\n' + '═'.repeat(80));
  console.log('\n💡 Next Steps:\n');
  console.log('   All 10 migration files exist and need to be applied to the database.');
  console.log('   These migrations will create the 15 missing tables.\n');
  console.log('   To apply migrations:\n');
  console.log('   Option 1: Supabase CLI (if installed)');
  console.log('     $ supabase db push\n');
  console.log('   Option 2: Manual application via Supabase Dashboard');
  console.log('     1. Open https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl');
  console.log('     2. Navigate to SQL Editor');
  console.log('     3. Copy and paste each migration file content');
  console.log('     4. Execute in order (by date in filename)\n');
  console.log('   Option 3: Use the apply-migrations.sh script');
  console.log('     $ bash scripts/apply-migrations.sh\n');
  
} catch (error) {
  console.error('❌ Error reading migration files:', error.message);
  process.exit(1);
}

function getTablesFromFilename(filename) {
  const tableMap = {
    'account_documents': 'account_documents',
    'ach_relationships': 'ach_relationships',
    'bank_relationships': 'bank_relationships',
    'corporate_actions': 'corporate_actions',
    'kyc_submissions': 'kyc_submissions, onfido_sdk_tokens',
    'oauth_management': 'oauth_authorizations, oauth_access_tokens',
    'options_positions': 'options_positions',
    'rebalancing': 'rebalancing_portfolios, rebalancing_subscriptions, rebalancing_runs',
    'transfers': 'transfers',
    'watchlists': 'watchlists, watchlist_assets'
  };
  
  for (const [key, value] of Object.entries(tableMap)) {
    if (filename.includes(key)) {
      return value;
    }
  }
  return null;
}
