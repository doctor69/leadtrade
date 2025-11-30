# KYC/CIP Integration

This document describes the implementation of KYC (Know Your Customer) and CIP (Customer Identification Program) verification through the Alpaca Broker API.

## Overview

The KYC/CIP integration provides identity verification capabilities required for regulatory compliance when opening brokerage accounts. It supports multiple verification providers, with primary support for Onfido SDK integration.

## Requirements

- **Requirement 15.1**: Upload CIP information with provider name and verification data
- **Requirement 15.2**: Retrieve CIP verification results
- **Requirement 15.3**: Generate Onfido SDK tokens and submit outcomes
- **Requirement 15.4**: Provide detailed failure reasons for failed verifications
- **Requirement 15.5**: Update account status based on verification results

## Architecture

### Components

1. **Edge Function** (`supabase/functions/alpaca-kyc-cip/`)
   - Proxies requests to Alpaca Broker API
   - Manages authentication and authorization
   - Stores verification results in database

2. **Frontend Library** (`src/lib/alpaca-kyc-cip.ts`)
   - Provides TypeScript functions for KYC operations
   - Handles API communication
   - Includes helper functions for status display

3. **Database Schema** (`supabase/migrations/20250109_kyc_submissions.sql`)
   - `kyc_submissions` table for tracking verification submissions
   - `onfido_sdk_tokens` table for managing SDK tokens
   - RLS policies for secure data access

4. **Type Definitions** (`src/types/kyc.ts`)
   - Complete TypeScript types for all KYC/CIP operations
   - Onfido-specific types for SDK integration

## API Endpoints

### Upload CIP Information

```typescript
POST /alpaca-kyc-cip/cip

// Request body
{
  provider_name: string
  kyc?: {
    given_name?: string
    family_name?: string
    date_of_birth?: string
    tax_id?: string
    tax_id_type?: 'USA_SSN' | 'ARG_AR_CUIT' | 'BRA_BR_CPF'
    country_of_citizenship?: string
    // ... additional fields
  }
  document?: {
    document_type?: 'passport' | 'drivers_license' | 'identity_card'
    document_number?: string
    document_front?: string // base64
    document_back?: string // base64
    // ... additional fields
  }
  photo?: {
    photo_type?: 'selfie' | 'video'
    content?: string // base64
  }
  identity?: { /* identity fields */ }
  watchlist?: { /* watchlist fields */ }
}

// Response
{
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'review'
  provider_name: string
  created_at: string
}
```

### Get CIP Verification Results

```typescript
GET /alpaca-kyc-cip/cip

// Response
{
  id: string
  status: 'pending' | 'approved' | 'rejected' | 'review'
  provider_name: string
  risk_level?: 'low' | 'medium' | 'high'
  verification_results?: {
    kyc?: { status: string, result?: string }
    document?: { status: string, result?: string }
    photo?: { status: string, result?: string }
    identity?: { status: string, result?: string }
    watchlist?: { status: string, result?: string }
  }
  failure_reasons?: string[]
  created_at: string
  completed_at?: string
}
```

### Generate Onfido SDK Token

```typescript
POST /alpaca-kyc-cip/onfido/sdk-token

// Request body (optional)
{
  referrer?: string
}

// Response
{
  sdk_token: string
  applicant_id: string
  expires_at: string
}
```

### Submit Onfido Outcome

```typescript
POST /alpaca-kyc-cip/onfido/outcome

// Request body
{
  applicant_id: string
  check_id: string
  result: 'clear' | 'consider' | 'rejected'
  sub_result?: string
  breakdown?: {
    document?: { result: string }
    facial_similarity_photo?: { result: string }
    facial_similarity_video?: { result: string }
    watchlist?: { result: string }
  }
}

// Response
{
  status: string
  message: string
}
```

### Get KYC Submissions

```typescript
GET /alpaca-kyc-cip/submissions

// Response
[
  {
    id: string
    account_id: string
    alpaca_account_id: string
    provider_name: string
    submission_type: 'cip' | 'kyc' | 'document' | 'photo' | 'identity' | 'watchlist'
    status: 'pending' | 'approved' | 'rejected' | 'review'
    risk_level?: 'low' | 'medium' | 'high'
    verification_results?: object
    failure_reasons?: string[]
    submitted_at: string
    completed_at?: string
    created_at: string
    updated_at: string
  }
]
```

## Frontend Usage

### Upload CIP Information

```typescript
import { uploadCIP } from '@/lib/alpaca-kyc-cip'

const result = await uploadCIP({
  provider_name: 'onfido',
  kyc: {
    given_name: 'John',
    family_name: 'Doe',
    date_of_birth: '1990-01-01',
    tax_id: '123-45-6789',
    tax_id_type: 'USA_SSN',
    country_of_citizenship: 'USA'
  }
})

if (result.success) {
  console.log('CIP uploaded:', result.data)
} else {
  console.error('Upload failed:', result.error)
}
```

### Get CIP Status

```typescript
import { getCIP } from '@/lib/alpaca-kyc-cip'

const result = await getCIP()

if (result.success) {
  console.log('CIP status:', result.data?.status)
  console.log('Risk level:', result.data?.risk_level)
} else {
  console.error('Failed to get CIP:', result.error)
}
```

### Onfido SDK Integration

```typescript
import { generateOnfidoSDKToken, submitOnfidoOutcome } from '@/lib/alpaca-kyc-cip'

// Step 1: Generate SDK token
const tokenResult = await generateOnfidoSDKToken(window.location.href)

if (tokenResult.success) {
  const { sdk_token, applicant_id } = tokenResult.data!
  
  // Step 2: Initialize Onfido SDK (requires Onfido SDK library)
  // See: https://documentation.onfido.com/sdk/web/
  
  // Step 3: After verification, submit outcome
  const outcomeResult = await submitOnfidoOutcome({
    applicant_id,
    check_id: 'check_id_from_onfido',
    result: 'clear',
    breakdown: {
      document: { result: 'clear' },
      facial_similarity_photo: { result: 'clear' }
    }
  })
  
  if (outcomeResult.success) {
    console.log('Verification complete:', outcomeResult.data)
  }
}
```

### Get All Submissions

```typescript
import { getKYCSubmissions, getLatestKYCStatus } from '@/lib/alpaca-kyc-cip'

// Get all submissions
const allSubmissions = await getKYCSubmissions()

// Get latest status
const latestStatus = await getLatestKYCStatus()

if (latestStatus.success) {
  console.log('Latest status:', latestStatus.data?.status)
}
```

### Helper Functions

```typescript
import { 
  isKYCRequired, 
  getKYCStatusMessage, 
  getKYCStatusClass 
} from '@/lib/alpaca-kyc-cip'

// Check if KYC is required
const required = await isKYCRequired()

// Get user-friendly status message
const message = getKYCStatusMessage('pending')
// Returns: "Your verification is being processed"

// Get CSS class for status badge
const className = getKYCStatusClass('approved')
// Returns: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
```

## Database Schema

### kyc_submissions Table

```sql
CREATE TABLE kyc_submissions (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES user_profiles(id),
  alpaca_account_id TEXT,
  provider_name TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  risk_level TEXT,
  verification_results JSONB,
  failure_reasons TEXT[],
  submitted_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

### onfido_sdk_tokens Table

```sql
CREATE TABLE onfido_sdk_tokens (
  id UUID PRIMARY KEY,
  account_id UUID REFERENCES user_profiles(id),
  alpaca_account_id TEXT,
  sdk_token TEXT NOT NULL,
  applicant_id TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
```

## Security

### Row Level Security (RLS)

- Users can only view and manage their own KYC submissions
- Service role has full access for administrative operations
- SDK tokens are protected and can only be accessed by the owning user

### Data Protection

- Sensitive data (SSN, tax IDs) is never logged
- All API communications use HTTPS
- Verification results are stored encrypted in the database
- SDK tokens expire after use or timeout

## Error Handling

### Common Errors

| Error | Status | Description |
|-------|--------|-------------|
| `Unauthorized` | 401 | User not authenticated |
| `Alpaca account not found` | 404 | No Alpaca account linked to user |
| `provider_name is required` | 400 | Missing required field |
| `Failed to upload CIP` | 500 | Alpaca API error |
| `Failed to generate SDK token` | 500 | Onfido token generation failed |

### Error Response Format

```typescript
{
  error: string // Error message
}
```

## Testing

### Manual Testing

1. **Upload CIP**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/alpaca-kyc-cip/cip \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{
       "provider_name": "onfido",
       "kyc": {
         "given_name": "John",
         "family_name": "Doe",
         "date_of_birth": "1990-01-01"
       }
     }'
   ```

2. **Get CIP Status**:
   ```bash
   curl https://your-project.supabase.co/functions/v1/alpaca-kyc-cip/cip \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```

3. **Generate SDK Token**:
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/alpaca-kyc-cip/onfido/sdk-token \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"referrer": "https://your-app.com"}'
   ```

## Best Practices

1. **Always check verification status** before allowing trading
2. **Store SDK tokens securely** and mark as used after verification
3. **Handle failure reasons gracefully** and provide clear user feedback
4. **Implement retry logic** for transient failures
5. **Monitor verification completion** and send notifications to users
6. **Keep verification data up to date** by periodically checking status

## Compliance Notes

- KYC/CIP verification is required by law for brokerage accounts
- Verification must be completed before allowing trading
- Failed verifications must be reported and may require manual review
- Verification data must be retained for regulatory compliance
- Users must be notified of verification status changes

## Future Enhancements

- Support for additional verification providers
- Automated document upload from mobile devices
- Real-time verification status updates via webhooks
- Batch verification for multiple accounts
- Enhanced risk scoring and fraud detection
