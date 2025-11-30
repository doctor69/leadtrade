#!/usr/bin/env node

/**
 * Simple Database Schema Checker
 * Connects to Supabase and verifies all expected tables exist
 */

const https = require('https');
const http = require('http');

// Expected tables
const EXPECTED_TABLES = [
  'profiles',
  'alpaca_accounts',
  'copy_trading_subscriptions',
  'app_settings',
  'securities_cache',
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
  'oauth_access_tokens',
];

// Get environment variables
// Try remote URL first if local is not reachable
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || process.env.PUBLIC_SUPABASE_LOCAL_URL || 'https://bfbqlzpbkivyrnjkvqgl.supabase.co';
const supabaseKey = process.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔍 Database Schema Verification\n');
console.log(`📡 Connecting to: ${supabaseUrl}\n`);

// SQL query to check tables
const query = `
  SELECT table_name 
  FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  ORDER BY table_name
`;

// Parse URL
const url = new URL(supabaseUrl);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Prepare request
const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: '/rest/v1/rpc/exec_sql',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'apikey': supabaseKey,
    'Authorization': `Bearer ${supabaseKey}`,
  },
};

const postData = JSON.stringify({ sql: query });

const req = httpModule.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    if (res.statusCode !== 200) {
      console.error(`❌ HTTP Error: ${res.statusCode}`);
      console.error(data);
      
      // Fallback: try checking tables individually
      console.log('\n⚠️  Falling back to individual table checks...\n');
      checkTablesIndividually();
      return;
    }

    try {
      const result = JSON.parse(data);
      const existingTables = result.map(row => row.table_name);
      
      displayResults(existingTables);
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.log('\n⚠️  Falling back to individual table checks...\n');
      checkTablesIndividually();
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  console.log('\n⚠️  Falling back to individual table checks...\n');
  checkTablesIndividually();
});

req.write(postData);
req.end();

function displayResults(existingTables) {
  console.log('═'.repeat(60));
  console.log('\n📊 Table Verification Results:\n');
  
  const results = EXPECTED_TABLES.map(tableName => ({
    name: tableName,
    exists: existingTables.includes(tableName),
  }));
  
  const existing = results.filter(t => t.exists);
  const missing = results.filter(t => !t.exists);
  
  console.log(`✅ Existing Tables (${existing.length}/${EXPECTED_TABLES.length}):\n`);
  existing.forEach(table => {
    console.log(`   ✓ ${table.name}`);
  });
  
  if (missing.length > 0) {
    console.log(`\n❌ Missing Tables (${missing.length}):\n`);
    missing.forEach(table => {
      console.log(`   ✗ ${table.name}`);
    });
  }
  
  const unexpected = existingTables.filter(name => !EXPECTED_TABLES.includes(name));
  if (unexpected.length > 0) {
    console.log(`\n📋 Additional Tables (${unexpected.length}):\n`);
    unexpected.forEach(name => {
      console.log(`   • ${name}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📈 Summary: ${existing.length}/${EXPECTED_TABLES.length} expected tables exist\n`);
  
  if (missing.length > 0) {
    console.log('⚠️  Action Required:');
    console.log('   • Apply missing migrations from supabase/migrations/');
    console.log('   • Check Task 1.3 in tasks.md for migration instructions\n');
    process.exit(1);
  } else {
    console.log('✅ All expected tables exist!\n');
  }
}

async function checkTablesIndividually() {
  const results = [];
  
  for (const tableName of EXPECTED_TABLES) {
    const exists = await checkTableExists(tableName);
    results.push({ name: tableName, exists });
  }
  
  const existing = results.filter(t => t.exists);
  const missing = results.filter(t => !t.exists);
  
  console.log('═'.repeat(60));
  console.log('\n📊 Table Verification Results:\n');
  console.log(`✅ Existing Tables (${existing.length}/${EXPECTED_TABLES.length}):\n`);
  existing.forEach(table => {
    console.log(`   ✓ ${table.name}`);
  });
  
  if (missing.length > 0) {
    console.log(`\n❌ Missing Tables (${missing.length}):\n`);
    missing.forEach(table => {
      console.log(`   ✗ ${table.name}`);
    });
  }
  
  console.log('\n' + '═'.repeat(60));
  console.log(`\n📈 Summary: ${existing.length}/${EXPECTED_TABLES.length} expected tables exist\n`);
  
  if (missing.length > 0) {
    console.log('⚠️  Action Required:');
    console.log('   • Apply missing migrations from supabase/migrations/');
    console.log('   • Check Task 1.3 in tasks.md for migration instructions\n');
    process.exit(1);
  } else {
    console.log('✅ All expected tables exist!\n');
  }
}

function checkTableExists(tableName) {
  return new Promise((resolve) => {
    const url = new URL(supabaseUrl);
    const isHttps = url.protocol === 'https:';
    const httpModule = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `/rest/v1/${tableName}?select=*&limit=0`,
      method: 'HEAD',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    };
    
    const req = httpModule.request(options, (res) => {
      // If we get 200 or 206, table exists
      // If we get 404 or 400 with specific error, table doesn't exist
      resolve(res.statusCode === 200 || res.statusCode === 206);
    });
    
    req.on('error', () => {
      resolve(false);
    });
    
    req.end();
  });
}
