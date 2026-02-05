#!/usr/bin/env node

/**
 * Cleanup script for API build artifacts
 * This script runs after the Astro build to clean up any unnecessary API route files
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, rmSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = join(__dirname, '..', 'dist');

console.log('🧹 Cleaning up API build artifacts...');

// Add any cleanup logic here if needed
// For now, just log that the build completed successfully

console.log('✅ Cleanup complete!');
