#!/usr/bin/env node

/**
 * Script to update the app-level trading mode
 * Usage: node scripts/set-trading-mode.ts [paper|live]
 */

import { createClient } from '@supabase/supabase-js';

const mode = process.argv[2] || 'paper';

if (!['paper', 'live'].includes(mode)) {
  console.error('❌ Invalid mode. Use "paper" or "live"');
  process.exit(1);
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables:');
  console.error('   PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setTradingMode() {
  console.log(`🔄 Setting trading mode to: ${mode.toUpperCase()}`);
  
  const { data, error } = await supabase
    .from('app_settings')
    .update({ 
      setting_value: mode,
      updated_at: new Date().toISOString()
    })
    .eq('setting_key', 'trading_mode')
    .select();

  if (error) {
    console.error('❌ Failed to update trading mode:', error);
    process.exit(1);
  }

  console.log('✅ Trading mode updated successfully!');
  console.log('📊 Current setting:', data);
  
  // Verify
  const { data: verification } = await supabase
    .from('app_settings')
    .select('*')
    .eq('setting_key', 'trading_mode')
    .single();
    
  console.log('\n📋 Verification:');
  console.log(`   Mode: ${verification?.setting_value}`);
  console.log(`   Updated: ${verification?.updated_at}`);
  
  if (mode === 'live') {
    console.log('\n⚠️  WARNING: LIVE MODE ACTIVE');
    console.log('   All trades will execute with REAL MONEY');
    console.log('   Make sure you have:');
    console.log('   - Signed business agreement with Alpaca');
    console.log('   - Configured live API keys');
    console.log('   - Completed all compliance requirements');
  } else {
    console.log('\n🟢 SANDBOX MODE ACTIVE');
    console.log('   All trades are simulated');
    console.log('   Safe for testing and development');
  }
}

setTradingMode();
