# Account Documents Migration

## Overview

This migration creates the `account_documents` table for storing metadata about documents uploaded to Alpaca for KYC and compliance purposes.

## Schema Details

### Table: account_documents

Stores metadata for documents uploaded through the Alpaca Broker API.

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier for the document record |
| `account_id` | UUID | NOT NULL, FK to auth.users | User who owns the document |
| `alpaca_document_id` | TEXT | UNIQUE | Document ID from Alpaca API |
| `document_type` | TEXT | NOT NULL, CHECK constraint | Type of document (identity_verification, address_verification, w8ben, other) |
| `document_sub_type` | TEXT | - | Optional sub-type for additional categorization |
| `mime_type` | TEXT | CHECK constraint | MIME type (application/pdf, image/jpeg, image/png) |
| `file_size_bytes` | INTEGER | CHECK <= 10MB | Size of the uploaded file in bytes |
| `status` | TEXT | CHECK constraint | Document status (pending, uploaded, verified, rejected, failed) |
| `uploaded_at` | TIMESTAMPTZ | DEFAULT NOW() | When the document was uploaded |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | Last update timestamp |

#### Constraints

- **file_size_limit**: Ensures file size does not exceed 10MB (10,485,760 bytes)
- **document_type**: Must be one of: identity_verification, address_verification, w8ben, other
- **mime_type**: Must be one of: application/pdf, image/jpeg, image/png
- **status**: Must be one of: pending, uploaded, verified, rejected, failed

### Indexes

Optimized for common query patterns:

1. **idx_account_documents_account_id**: Fast lookup by user account
2. **idx_account_documents_alpaca_id**: Fast lookup by Alpaca document ID (partial index)
3. **idx_account_documents_type**: Filter by document type
4. **idx_account_documents_status**: Filter by status
5. **idx_account_documents_account_type**: Composite index for user + type queries
6. **idx_account_documents_uploaded_at**: Sort by upload date (descending)

### Row Level Security (RLS)

All policies enforce that users can only access their own documents:

- **SELECT**: Users can view their own documents
- **INSERT**: Users can insert their own documents
- **UPDATE**: Users can update their own documents
- **DELETE**: Users can delete their own documents

### Triggers

- **account_documents_updated_at**: Automatically updates `updated_at` timestamp on row updates

## Requirements Coverage

This schema satisfies the following requirements:

- **2.1**: Stores document_type, document_sub_type, mime_type metadata
- **2.2**: Supports document listing and retrieval (via RLS policies)
- **2.3**: Returns all documents associated with an account (via indexes and RLS)
- **2.5**: Enforces 10MB file size limit (via CHECK constraint)

## Usage Examples

### Insert a new document record
```sql
INSERT INTO account_documents (
  account_id,
  alpaca_document_id,
  document_type,
  mime_type,
  file_size_bytes,
  status
) VALUES (
  auth.uid(),
  'doc_abc123',
  'identity_verification',
  'application/pdf',
  2048576,
  'uploaded'
);
```

### Query user's documents
```sql
SELECT * FROM account_documents
WHERE account_id = auth.uid()
ORDER BY uploaded_at DESC;
```

### Filter by document type
```sql
SELECT * FROM account_documents
WHERE account_id = auth.uid()
  AND document_type = 'identity_verification'
  AND status = 'verified';
```

## Migration Application

To apply this migration:

```bash
npx supabase db push
```

Or in production:

```bash
npx supabase db push --linked
```

## Rollback

To rollback this migration:

```sql
DROP TRIGGER IF EXISTS account_documents_updated_at ON account_documents;
DROP FUNCTION IF EXISTS update_account_documents_updated_at();
DROP TABLE IF EXISTS account_documents CASCADE;
```
