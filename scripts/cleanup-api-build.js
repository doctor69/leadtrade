#!/usr/bin/env node

/**
 * Cleanup script to remove any accidentally built API routes from static build
 * All API routes should be handled by Supabase Edge Functions
 */

import { rmSync, existsSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distApiPath = join(__dirname, '..', 'dist', 'api');
const distAuthPath = join(__dirname, '..', 'dist', 'auth');

// Remove API directory if it exists
if (existsSync(distApiPath)) {
  console.log('🧹 Removing API routes from static build...');
  rmSync(distApiPath, { recursive: true, force: true });
  console.log('✅ API routes removed - they will be handled by Supabase Edge Functions');
}

// Keep auth/callback for OAuth flow, but remove any other auth routes
if (existsSync(distAuthPath)) {
  const callbackPath = join(distAuthPath, 'callback');
  if (!existsSync(callbackPath)) {
    console.log('🧹 Removing auth routes (except callback) from static build...');
    rmSync(distAuthPath, { recursive: true, force: true });
  }
}

console.log('✅ Build cleanup complete');
