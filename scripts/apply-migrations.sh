#!/bin/bash

# Apply Missing Database Migrations
# This script applies all pending migrations to the Supabase database

set -e

echo "🔧 Database Migration Application Script"
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "⚠️  Supabase CLI not found"
    echo ""
    echo "Options:"
    echo "1. Install Supabase CLI: https://supabase.com/docs/guides/cli"
    echo "2. Apply migrations manually via Supabase Dashboard"
    echo ""
    echo "Manual Application Steps:"
    echo "1. Go to: https://supabase.com/dashboard/project/bfbqlzpbkivyrnjkvqgl"
    echo "2. Navigate to SQL Editor"
    echo "3. Copy and paste each migration file from supabase/migrations/"
    echo "4. Execute in order (by date in filename)"
    echo ""
    echo "Migration files to apply:"
    echo "  - 20250108_account_documents.sql"
    echo "  - 20250109_ach_relationships.sql"
    echo "  - 20250109_bank_relationships.sql"
    echo "  - 20250109_corporate_actions.sql"
    echo "  - 20250109_kyc_submissions.sql"
    echo "  - 20250109_oauth_management.sql"
    echo "  - 20250109_options_positions.sql"
    echo "  - 20250109_rebalancing.sql"
    echo "  - 20250109_transfers.sql"
    echo "  - 20250109_watchlists.sql"
    exit 1
fi

echo "✅ Supabase CLI found"
echo ""

# Check if we're linked to a project
if [ ! -f ".supabase/config.toml" ]; then
    echo "⚠️  Not linked to a Supabase project"
    echo ""
    echo "Run: supabase link --project-ref bfbqlzpbkivyrnjkvqgl"
    exit 1
fi

echo "📋 Checking migration status..."
echo ""

# Check migration status
supabase db remote commit

echo ""
echo "🚀 Applying migrations..."
echo ""

# Apply migrations
supabase db push

echo ""
echo "✅ Migrations applied successfully!"
echo ""

# Verify the schema
echo "🔍 Verifying database schema..."
echo ""

# Run verification script
if [ -f "scripts/check-database.cjs" ]; then
    node scripts/check-database.cjs
else
    echo "⚠️  Verification script not found"
    echo "Run manually: node scripts/check-database.cjs"
fi

echo ""
echo "✅ Migration process complete!"
echo ""
