# KYC/CIP Database Schema

This migration creates the database schema for KYC (Know Your Customer) and CIP (Customer Identification Program) verification tracking.

## Migration File

`20250109_kyc_submissions.sql`

## Tables Created

### 1. kyc_submissions

Tracks all KYC/CIP verification submissions and their results.

**Columns:**
- `id` (UUID, PK): Unique identifier for the submission
- `account_id` (UUID, FK): Reference to user_profiles table
- `alpaca_account_id` (TEXT): Alpaca account identifier
- `provider_name` (TEXT): Verification provider (e.g., 'onfido', 'manual')
- `submission_type` (TEXT): Type of submission (cip, kyc, document, photo, identity, watchlist)
- `status` (TEXT): Verification status (pending, approved, rejected, review)
- `risk_level` (TEXT): Risk assessment (low, medium, high)
- `verification_results` (JSONB): Complete verification response from provider
- `failure_reasons` (TEXT[]): Array of failure reasons if rejected
- `submitted_at` (TIMESTAMP): When the verification was submitted
- `completed_at` (TIMESTAMP): When the verification was completed
- `expires_at` (TIMESTAMP): When the verification expires
- `metadata` (JSONB): Additional provider-specific metadata
- `created_at` (TIMESTAMP): Record creation timestamp
- `updated_at` (TIMESTAMP): Record last update timestamp

**Indexes:**
- `idx_kyc_submissions_account_id`: Fast lookup by account
- `idx_kyc_submissions_alpaca_account_id`: Fast lookup by Alpaca account
- `idx_kyc_submissions_status`: Filter by status
- `idx_kyc_submissions_provider`: Filter by provider
- `idx_kyc_submissions_submitted_at`: Sort by submission date

**RLS Policies:**
- Users can view their own submissions
- Users can create their own submissions
- Users can update their own pending submissions
- Service role has full access

### 2. onfido_sdk_tokens

Tracks Onfido SDK token generation for identity verification.

**Columns:**
- `id` (UUID, PK): Unique identifier for the token
- `account_id` (UUID, FK): Reference to user_profiles table
- `alpaca_account_id` (TEXT): Alpaca account identifier
- `sdk_token` (TEXT): The SDK token for Onfido integration
- `applicant_id` (TEXT): Onfido applicant identifier
- `expires_at` (TIMESTAMP): When the token expires
- `used` (BOOLEAN): Whether the token has been used
- `created_at` (TIMESTAMP): Record creation timestamp

**Indexes:**
- `idx_onfido_sdk_tokens_account_id`: Fast lookup by account
- `idx_onfido_sdk_tokens_expires_at`: Find expired tokens

**RLS Policies:**
- Users can view their own SDK tokens
- Service role has full access

## Triggers

### update_kyc_submissions_updated_at

Automatically updates the `updated_at` timestamp whenever a record in `kyc_submissions` is modified.

## Usage

### Running the Migration

```bash
# Apply migration
supabase db push

# Or if using migration files directly
psql -h your-db-host -U postgres -d your-database -f 20250109_kyc_submissions.sql
```

### Verifying the Migration

```sql
-- Check if tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('kyc_submissions', 'onfido_sdk_tokens');

-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE tablename IN ('kyc_submissions', 'onfido_sdk_tokens');

-- Check indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('kyc_submissions', 'onfido_sdk_tokens');
```

## Example Queries

### Insert a KYC Submission

```sql
INSERT INTO kyc_submissions (
  account_id,
  alpaca_account_id,
  provider_name,
  submission_type,
  status,
  submitted_at
) VALUES (
  'user-uuid',
  'alpaca-account-id',
  'onfido',
  'cip',
  'pending',
  NOW()
);
```

### Get Latest Submission for User

```sql
SELECT * FROM kyc_submissions
WHERE account_id = 'user-uuid'
ORDER BY submitted_at DESC
LIMIT 1;
```

### Get All Pending Submissions

```sql
SELECT * FROM kyc_submissions
WHERE status = 'pending'
ORDER BY submitted_at ASC;
```

### Update Submission Status

```sql
UPDATE kyc_submissions
SET 
  status = 'approved',
  risk_level = 'low',
  completed_at = NOW()
WHERE id = 'submission-uuid';
```

### Create Onfido SDK Token

```sql
INSERT INTO onfido_sdk_tokens (
  account_id,
  alpaca_account_id,
  sdk_token,
  applicant_id,
  expires_at
) VALUES (
  'user-uuid',
  'alpaca-account-id',
  'sdk-token-value',
  'applicant-id',
  NOW() + INTERVAL '1 hour'
);
```

### Mark SDK Token as Used

```sql
UPDATE onfido_sdk_tokens
SET used = TRUE
WHERE applicant_id = 'applicant-id';
```

### Clean Up Expired Tokens

```sql
DELETE FROM onfido_sdk_tokens
WHERE expires_at < NOW()
AND used = TRUE;
```

## Data Retention

### Recommended Retention Policies

1. **KYC Submissions**: Retain for 7 years (regulatory requirement)
2. **SDK Tokens**: Delete after 30 days if used, or after expiration
3. **Verification Results**: Archive after 1 year but retain for compliance

### Archival Query

```sql
-- Archive old submissions (example)
CREATE TABLE kyc_submissions_archive AS
SELECT * FROM kyc_submissions
WHERE completed_at < NOW() - INTERVAL '1 year';

-- Verify archive
SELECT COUNT(*) FROM kyc_submissions_archive;
```

## Security Considerations

1. **Sensitive Data**: Never log or expose SSN, tax IDs, or document images
2. **RLS Policies**: Ensure users can only access their own data
3. **Encryption**: Consider encrypting `verification_results` JSONB field
4. **Token Security**: SDK tokens should be single-use and expire quickly
5. **Audit Trail**: Keep complete history of status changes

## Troubleshooting

### Common Issues

1. **RLS Policy Errors**:
   ```sql
   -- Check if RLS is enabled
   SELECT tablename, rowsecurity 
   FROM pg_tables 
   WHERE tablename IN ('kyc_submissions', 'onfido_sdk_tokens');
   ```

2. **Foreign Key Violations**:
   ```sql
   -- Verify user_profiles table exists
   SELECT * FROM user_profiles LIMIT 1;
   ```

3. **Index Performance**:
   ```sql
   -- Analyze query performance
   EXPLAIN ANALYZE
   SELECT * FROM kyc_submissions
   WHERE account_id = 'user-uuid'
   ORDER BY submitted_at DESC;
   ```

## Rollback

To rollback this migration:

```sql
-- Drop tables (cascades to indexes and policies)
DROP TABLE IF EXISTS onfido_sdk_tokens CASCADE;
DROP TABLE IF EXISTS kyc_submissions CASCADE;

-- Drop trigger function
DROP FUNCTION IF EXISTS update_kyc_submissions_updated_at CASCADE;
```

## Related Documentation

- [KYC/CIP Integration Guide](../../docs/KYC_CIP_INTEGRATION.md)
- [Alpaca Broker API Documentation](https://alpaca.markets/docs/broker/)
- [Onfido SDK Documentation](https://documentation.onfido.com/)

## Support

For issues or questions:
1. Check the main documentation
2. Review Alpaca API logs
3. Verify RLS policies are correctly configured
4. Contact support with submission ID and error details
