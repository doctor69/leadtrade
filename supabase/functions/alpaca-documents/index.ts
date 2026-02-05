/// <reference lib="deno.ns" />

import { AlpacaClient } from '../_shared/alpaca-client.ts'
import { authenticateRequest } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createErrorResponse, createSuccessResponse } from '../_shared/response.ts'
import { logInfo, logError } from '../_shared/logging.ts'

// Document validation constants
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB in bytes
const ALLOWED_MIME_TYPES = ['application/pdf', 'image/jpeg', 'image/png']
const ALLOWED_DOCUMENT_TYPES = ['identity_verification', 'address_verification', 'w8ben', 'other']

/**
 * Validate base64 content size
 */
function validateBase64Size(base64Content: string): boolean {
  // Remove data URL prefix if present
  const base64Data = base64Content.replace(/^data:.*?;base64,/, '')
  
  // Calculate approximate size (base64 is ~33% larger than binary)
  const sizeInBytes = (base64Data.length * 3) / 4
  
  return sizeInBytes <= MAX_FILE_SIZE
}

/**
 * Validate document upload request
 */
function validateDocumentUpload(body: any): { valid: boolean; error?: string } {
  if (!body.document_type || !ALLOWED_DOCUMENT_TYPES.includes(body.document_type)) {
    return {
      valid: false,
      error: `Invalid document_type. Must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`
    }
  }

  if (!body.content || typeof body.content !== 'string') {
    return { valid: false, error: 'content is required and must be a base64 encoded string' }
  }

  if (!body.mime_type || !ALLOWED_MIME_TYPES.includes(body.mime_type)) {
    return {
      valid: false,
      error: `Invalid mime_type. Must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`
    }
  }

  if (!validateBase64Size(body.content)) {
    return { valid: false, error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB` }
  }

  return { valid: true }
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    // Authenticate request
    const authResult = await authenticateRequest(req)
    if (!authResult.success || !authResult.context) {
      logError('Authentication failed', { error: authResult.error })
      return createErrorResponse(authResult.error || 'Authentication failed', 401, corsHeaders)
    }

    const { context } = authResult
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    logInfo('Document management request', {
      method: req.method,
      path: url.pathname,
      userId: context.userId,
      tradingMode: context.tradingMode
    })

    // Initialize Alpaca client
    const alpacaClient = new AlpacaClient(context, (message, data) => {
      logInfo(message, data)
    })

    // Get user's Alpaca account ID
    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.52.0')
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { data: alpacaAccount, error: accountError } = await supabase
      .from('alpaca_accounts')
      .select('alpaca_account_id')
      .eq('user_id', context.userId)
      .single()

    if (accountError || !alpacaAccount?.alpaca_account_id) {
      logError('Alpaca account not found', { userId: context.userId, error: accountError })
      return createErrorResponse('Alpaca account not found', 404, corsHeaders)
    }

    const accountId = alpacaAccount.alpaca_account_id

    // Route based on method and path
    if (req.method === 'POST' && pathParts[pathParts.length - 1] === 'upload') {
      // Upload document
      const body = await req.json()

      // Validate request
      const validation = validateDocumentUpload(body)
      if (!validation.valid) {
        return createErrorResponse(validation.error!, 400, corsHeaders)
      }

      logInfo('Uploading document', {
        accountId,
        documentType: body.document_type,
        mimeType: body.mime_type,
        hasSubType: !!body.document_sub_type
      })

      // Upload to Alpaca
      const result = await alpacaClient.uploadDocument(accountId, {
        document_type: body.document_type,
        document_sub_type: body.document_sub_type,
        content: body.content,
        mime_type: body.mime_type
      })

      if (!result.success) {
        logError('Document upload failed', { error: result.error })
        return createErrorResponse(
          result.error?.message || 'Failed to upload document',
          result.error?.status || 500,
          corsHeaders
        )
      }

      // Calculate file size from base64 content
      const base64Data = body.content.replace(/^data:.*?;base64,/, '')
      const fileSizeBytes = Math.floor((base64Data.length * 3) / 4)

      // Store document metadata in database
      const { error: dbError } = await supabase
        .from('account_documents')
        .insert({
          account_id: context.userId,
          alpaca_document_id: result.data?.id,
          document_type: body.document_type,
          document_sub_type: body.document_sub_type,
          mime_type: body.mime_type,
          file_size_bytes: fileSizeBytes,
          status: 'uploaded'
        })

      if (dbError) {
        logError('Failed to store document metadata', { error: dbError })
        // Don't fail the request, document is uploaded to Alpaca
      }

      logInfo('Document uploaded successfully', { documentId: result.data?.id })
      return createSuccessResponse(result.data, corsHeaders)

    } else if (req.method === 'GET' && pathParts.length > 0) {
      const lastPart = pathParts[pathParts.length - 1]

      // Check if requesting specific document or list
      if (lastPart === 'documents' || lastPart === 'alpaca-documents') {
        // List all documents
        logInfo('Listing documents', { accountId })

        const result = await alpacaClient.listDocuments(accountId)

        if (!result.success) {
          logError('Failed to list documents', { error: result.error })
          return createErrorResponse(
            result.error?.message || 'Failed to list documents',
            result.error?.status || 500,
            corsHeaders
          )
        }

        logInfo('Documents listed successfully', { count: result.data?.length || 0 })
        return createSuccessResponse(result.data, corsHeaders)

      } else {
        // Get specific document (download URL)
        const documentId = lastPart
        logInfo('Getting document download URL', { accountId, documentId })

        const result = await alpacaClient.getDocument(accountId, documentId)

        if (!result.success) {
          logError('Failed to get document', { error: result.error })
          return createErrorResponse(
            result.error?.message || 'Failed to get document',
            result.error?.status || 500,
            corsHeaders
          )
        }

        logInfo('Document URL retrieved successfully', { documentId })
        return createSuccessResponse(result.data, corsHeaders)
      }

    } else {
      return createErrorResponse('Method not allowed', 405, corsHeaders)
    }

  } catch (error) {
    logError('Unexpected error in document management', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    })

    return createErrorResponse(
      'Internal server error',
      500,
      corsHeaders
    )
  }
})
