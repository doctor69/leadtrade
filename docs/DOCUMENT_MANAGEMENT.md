# Document Management API

This document describes the document upload and management functionality for Alpaca accounts.

## Overview

The document management system allows users to upload, list, and download documents required for KYC (Know Your Customer) compliance and account verification.

## Features

- Upload documents with base64 encoding
- Support for multiple document types (identity verification, address verification, W-8BEN, other)
- File size validation (max 10MB)
- Mime type validation (PDF, JPEG, PNG)
- List all uploaded documents
- Download documents via pre-signed URLs
- Database tracking of document metadata

## API Endpoints

All endpoints are implemented as Supabase Edge Functions and called directly from the frontend.

### Upload Document

**POST** `{SUPABASE_URL}/functions/v1/alpaca-documents/upload`

Upload a document for the authenticated user's Alpaca account.

**Request Body:**
```json
{
  "document_type": "identity_verification",
  "document_sub_type": "passport",
  "content": "base64_encoded_content",
  "mime_type": "application/pdf"
}
```

**Response:**
```json
{
  "id": "doc-123",
  "document_type": "identity_verification",
  "created_at": "2025-01-08T00:00:00Z"
}
```

### List Documents

**GET** `{SUPABASE_URL}/functions/v1/alpaca-documents`

List all documents for the authenticated user's Alpaca account.

**Response:**
```json
[
  {
    "id": "doc-123",
    "document_type": "identity_verification",
    "document_sub_type": "passport",
    "created_at": "2025-01-08T00:00:00Z"
  }
]
```

### Get Document Download URL

**GET** `{SUPABASE_URL}/functions/v1/alpaca-documents/{documentId}`

Get a pre-signed download URL for a specific document.

**Response:**
```json
{
  "download_url": "https://example.com/download/doc-123?signature=..."
}
```

## Document Types

- `identity_verification` - Government-issued ID, passport, driver's license
- `address_verification` - Utility bill, bank statement, lease agreement
- `w8ben` - W-8BEN tax form for non-US persons
- `other` - Other supporting documents

## File Requirements

- **Maximum file size:** 10MB
- **Allowed formats:**
  - PDF (`application/pdf`)
  - JPEG (`image/jpeg`)
  - PNG (`image/png`)

## Frontend Usage

### Using the Library

```typescript
import { uploadFile, listDocuments, getDocumentDownloadUrl } from '@/lib/alpaca-documents'

// Upload a file
const file = document.getElementById('file-input').files[0]
const result = await uploadFile(file, 'identity_verification', 'passport')

if (result.success) {
  console.log('Document uploaded:', result.data)
} else {
  console.error('Upload failed:', result.error)
}

// List documents
const documents = await listDocuments()

// Get download URL
const downloadUrl = await getDocumentDownloadUrl('doc-123')
```

### Using the Component

```tsx
import { DocumentUpload } from '@/components/account/DocumentUpload'

function AccountSettings() {
  return (
    <div>
      <h1>Account Settings</h1>
      <DocumentUpload />
    </div>
  )
}
```

## Database Schema

The `account_documents` table stores metadata for uploaded documents:

```sql
CREATE TABLE account_documents (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES auth.users(id),
  alpaca_document_id TEXT,
  document_type TEXT,
  document_sub_type TEXT,
  mime_type TEXT,
  status TEXT,
  uploaded_at TIMESTAMP,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);
```

## Security

- Row Level Security (RLS) policies ensure users can only access their own documents
- Documents are stored securely in Alpaca's system
- Download URLs are pre-signed and time-limited
- All API requests require authentication

## Error Handling

Common error responses:

- `400 Bad Request` - Invalid document type, file too large, or invalid mime type
- `401 Unauthorized` - Missing or invalid authentication
- `404 Not Found` - Alpaca account not found or document not found
- `500 Internal Server Error` - Server-side error

## Testing

Run the test suite:

```bash
npm run test -- src/lib/__tests__/alpaca-documents.test.ts --run
```

## Architecture

### Edge Function (`supabase/functions/alpaca-documents/index.ts`)

The `alpaca-documents` Edge Function handles:
- Authentication and authorization via Supabase Auth
- Request validation (document type, file size, mime type)
- Alpaca API communication using the shared Alpaca client
- Database metadata storage in `account_documents` table
- Comprehensive error handling and logging
- CORS support for cross-origin requests

### Shared Alpaca Client (`supabase/functions/_shared/alpaca-client.ts`)

Document management methods added to the shared client:
- `uploadDocument()` - Upload documents with base64 content
- `listDocuments()` - List all account documents
- `getDocument()` - Get pre-signed download URLs

### Frontend Library (`src/lib/alpaca-documents.ts`)

The `alpaca-documents.ts` library provides:
- Direct Edge Function calls (no Astro API routes)
- Type-safe API client functions
- Zod validation schemas for runtime type checking
- File validation utilities (size, mime type)
- Base64 encoding helpers
- Comprehensive error handling

### React Component (`src/components/account/DocumentUpload.tsx`)

The `DocumentUpload.tsx` component provides:
- File selection and validation UI
- Document type selection dropdown
- Upload progress indication
- Document list display with metadata
- Download functionality via pre-signed URLs
- Real-time error and success feedback
