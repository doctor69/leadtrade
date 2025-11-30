#!/usr/bin/env node

/**
 * Check Applied Migrations
 * Queries the supabase_migrations.schema_migrations table to see which migrations have been applied
 */

const https = require('https');
const http = require('http');

// Get environment variables
const supabaseUrl = process.env.PUBLIC_SUPABASE_URL || 'https://bfbqlzpbkivyrnjkvqgl.supabase.co';
const supabaseKey = process.env.PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  console.error('   Required: PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('🔍 Checking Applied Migrations\n');
console.log(`📡 Connecting to: ${supabaseUrl}\n`);

// SQL query to check applied migrations
const query = `
  SELECT version, name, executed_at 
  FROM supabase_migrations.schema_migrations 
  ORDER BY version
`;

// Parse URL
const url = new URL(supabaseUrl);
const isHttps = url.protocol === 'https:';
const httpModule = isHttps ? https : http;

// Prepare request - use PostgREST to query
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
      console.log('\n⚠️  Note: If schema_migrations table does not exist, no migrations have been tracked.');
      console.log('   This is normal for databases that were set up manually.\n');
      process.exit(1);
    }

    try {
      const result = JSON.parse(data);
      
      if (result.length === 0) {
        console.log('⚠️  No migrations found in schema_migrations table.');
        console.log('   This could mean:');
        console.log('   1. No migrations have been applied via Supabase CLI');
        console.log('   2. Database was set up manually');
        console.log('   3. Migrations were applied directly via SQL Editor\n');
      } else {
        console.log('═'.repeat(80));
        console.log(`\n📋 Applied Migrations (${result.length}):\n`);
        
        result.forEach((row, index) => {
          const date = new Date(row.executed_at).toLocaleString();
          console.log(`${index + 1}. ${row.version}`);
          if (row.name) {
            console.log(`   Name: ${row.name}`);
          }
          console.log(`   Executed: ${date}\n`);
        });
        
        console.log('═'.repeat(80));
      }
      
      // Now list all migration files
      listMigrationFiles(result.map(r => r.version));
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.error('Response:', data);
      process.exit(1);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Connection error:', error.message);
  process.exit(1);
});

req.write(postData);
req.end();

function listMigrationFiles(appliedVersions) {
  const fs = require('fs');
  const path = require('path');
  
  const migrationsDir = path.join(__dirname, '../supabase/migrations');
  
  try {
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .filter(f => !f.startsWith('VERIFY_')) // Exclude verification scripts
      .sort();
    
    console.log(`\n📁 Migration Files in supabase/migrations/ (${files.length}):\n`);
    
    const unapplied = [];
    
    files.forEach((file, index) => {
      // Extract version from filename (everything before first underscore or .sql)
      const version = file.replace('.sql', '');
      const isApplied = appliedVersions.includes(version);
      
      const status = isApplied ? '✅' : '❌';
      console.log(`${status} ${index + 1}. ${file}`);
      
      if (!isApplied) {
        unapplied.push(file);
      }
    });
    
    console.log('\n' + '═'.repeat(80));
    
    if (unapplied.length > 0) {
      console.log(`\n⚠️  Unapplied Migrations (${unapplied.length}):\n`);
      unapplied.forEach((file, index) => {
        console.log(`   ${index + 1}. ${file}`);
      });
      
      console.log('\n💡 To apply these migrations:');
      console.log('   Option 1: Use Supabase CLI');
      console.log('     $ supabase db push\n');
      console.log('   Option 2: Apply manually via Supabase Dashboard');
      console.log('     1. Open SQL Editor in Supabase Dashboard');
      console.log('     2. Copy and paste each migration file content');
      console.log('     3. Execute in order\n');
    } else {
      console.log('\n✅ All migration files have been applied!\n');
    }
    
  } catch (error) {
    console.error('❌ Error reading migration files:', error.message);
  }
}
