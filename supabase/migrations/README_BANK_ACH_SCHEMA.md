# Bank and ACH Relationships Database Schema

## Overview

This document describes the database schema for managing bank relationships and ACH relationships in the LeadTrade platform. These tables support the Alpaca Broker API integration for funding operations.

## Tables

### bank_relationships

Stores bank relationship information for user accounts, supporting both US (ABA routing) and international (BIC/SWIFT) bank accounts.

**Schema:**
```sql
CREATE TABLE bank_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_bank_id TEXT UNIQUE NOT NULL,
  account_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  bank_code TEXT NOT NULL,
  bank_code_type TEXT NOT NULL CHECK (bank_code_type IN ('aba', 'bic')),
  account_number_last4 TEXT,
  country TEXT,
  state_province TEXT,
  postal_code TEXT,
  city TEXT,
  street_address TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Fields:**
- `id`: Primary key (UUID)
- `user_id`: Reference to auth.users (required)
- `alpaca_bank_id`: Unique identifier from Alpaca API (required)
- `account_id`: Reference to user_profiles (optional)
- `name`: Bank relationship name (required)
- `bank_code`: ABA routing number or BIC/SWIFT code (required)
- `bank_code_type`: Type of bank code - 'aba' or 'bic' (required)
- `account_number_last4`: Last 4 digits of account number for display
- `country`: Bank country
- `state_province`: Bank state/province
- `postal_code`: Bank postal code
- `city`: Bank city
- `street_address`: Bank street address
- `status`: Relationship status (default: 'pending')
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp (auto-updated)

**Indexes:**
- `idx_bank_relationships_user_id` on `user_id`
- `idx_bank_relationships_account_id` on `account_id`
- `idx_bank_relationships_alpaca_bank_id` on `alpaca_bank_id`
- `idx_bank_relationships_status` on `status`

**RLS Policies:**
- Users can view their own bank relationships
- Users can insert their own bank relationships
- Users can update their own bank relationships
- Users can delete their own bank relationships

### ach_relationships

Stores ACH relationship information for user accounts, supporting both manual entry and Plaid processor token integration.

**Schema:**
```sql
CREATE TABLE ach_relationships (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  alpaca_ach_id TEXT UNIQUE NOT NULL,
  account_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'approved', 'pending', 'sent_to_clearing', 'rejected', 'canceled')),
  account_owner_name TEXT NOT NULL,
  bank_account_type TEXT NOT NULL CHECK (bank_account_type IN ('checking', 'savings')),
  bank_account_number_last4 TEXT,
  bank_routing_number TEXT NOT NULL,
  nickname TEXT,
  processor_token TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Fields:**
- `id`: Primary key (UUID)
- `user_id`: Reference to auth.users (required)
- `alpaca_ach_id`: Unique identifier from Alpaca API (required)
- `account_id`: Reference to user_profiles (optional)
- `status`: ACH relationship status - 'queued', 'approved', 'pending', 'sent_to_clearing', 'rejected', or 'canceled' (required, default: 'queued')
- `account_owner_name`: Name of the account owner (required)
- `bank_account_type`: Type of bank account - 'checking' or 'savings' (required)
- `bank_account_number_last4`: Last 4 digits of account number for display
- `bank_routing_number`: 9-digit ABA routing number (required)
- `nickname`: User-friendly name for the ACH relationship
- `processor_token`: Plaid processor token for integration
- `created_at`: Creation timestamp
- `updated_at`: Last update timestamp (auto-updated)

**Indexes:**
- `idx_ach_relationships_user_id` on `user_id`
- `idx_ach_relationships_account_id` on `account_id`
- `idx_ach_relationships_alpaca_ach_id` on `alpaca_ach_id`
- `idx_ach_relationships_status` on `status`
- `idx_ach_relationships_bank_routing_number` on `bank_routing_number`

**RLS Policies:**
- Users can view their own ACH relationships
- Users can insert their own ACH relationships
- Users can update their own ACH relationships
- Users can delete their own ACH relationships

## Triggers

Both tables have automatic timestamp update triggers:

- `bank_relationships_updated_at`: Updates `updated_at` on row modification
- `ach_relationships_updated_at`: Updates `updated_at` on row modification

## Security

Both tables have Row Level Security (RLS) enabled with policies that ensure:
1. Users can only access their own relationships
2. All operations (SELECT, INSERT, UPDATE, DELETE) are restricted to the authenticated user
3. Cascade deletion when user account is deleted

## Requirements Satisfied

This schema satisfies the following requirements from the Alpaca Broker API Complete specification:

- **Requirement 3.1**: Bank relationship storage with bank_code, bank_code_type, account_number, and account owner details
- **Requirement 3.2**: ACH relationship validation with routing number and account number format
- **Requirement 3.3**: Bank relationship filtering by status and bank_name (via indexes)
- **Requirement 3.4**: Verification of no pending transfers before deletion (enforced at application level)
- **Requirement 3.5**: Support for both manual entry and Plaid processor tokens

## Migration Files

- `20250109_bank_relationships.sql`: Creates bank_relationships table
- `20250109_ach_relationships.sql`: Creates ach_relationships table

## Related Documentation

- [Bank Relationships Implementation](../../docs/BANK_RELATIONSHIPS.md)
- [ACH Relationships Implementation](../../docs/ACH_RELATIONSHIPS.md)
- [Alpaca Broker API Complete Spec](../../.kiro/specs/alpaca-broker-api-complete/)
