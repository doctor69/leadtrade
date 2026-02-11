/// <reference lib="deno.ns" />

import { AlpacaClient } from '../_shared/alpaca-client.ts'
import { validateAuth } from '../_shared/auth.ts'
import { corsHeaders, handleCors } from '../_shared/cors.ts'
import { createErrorResponse, createSuccessResponse } from '../_shared/response.ts'
import { createLogger } from '../_shared/logging.ts'

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
    const authResult = await validateAuth(req)
    if ('status' in authResult) {
      return createErrorResponse(authResult.message, authResult.status)
    }

    const context = authResult
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/').filter(Boolean)

    // Create logger with context
    const logger = createLogger('alpaca-documents', context.userId, {
      tradingMode: context.tradingMode,
      alpacaAccountId: context.alpacaAccountId
    })

    logger.info('Document management request', {
      method: req.method,
      path: url.pathname
    })

    // Initialize Alpaca client
    const alpacaClient = new AlpacaClient(context, (message, data) => {
      logger.debug(message, data)
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
      logger.error('Alpaca account not found', accountError, { userId: context.userId })
      return createErrorResponse('Alpaca account not found', 404)
    }

    const accountId = alpacaAccount.alpaca_account_id

    // Route based on method and path
    if (req.method === 'POST' && pathParts[pathParts.length - 1] === 'upload') {
      // Upload document
      const body = await req.json()

      // Validate request
      const validation = validateDocumentUpload(body)
      if (!validation.valid) {
        return createErrorResponse(validation.error!, 400)
      }

      logger.info('Uploading document', {
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
        logger.error('Document upload failed', result.error)
        return createErrorResponse(
          result.error?.message || 'Failed to upload document',
          result.error?.status || 500
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
        logger.error('Failed to store document metadata', dbError)
        // Don't fail the request, document is uploaded to Alpaca
      }

      logger.info('Document uploaded successfully', { documentId: result.data?.id })
      return createSuccessResponse(result.data)

    } else if (req.method === 'GET') {
      // Parse the path - handle both direct calls and function URLs
      // URL will be like /functions/v1/alpaca-documents or /functions/v1/alpaca-documents/{documentId}
      
      // Find the index of 'alpaca-documents' in the path
      const funcIndex = pathParts.findIndex(part => part === 'alpaca-documents')
      
      // If there's a part after 'alpaca-documents', it's the document ID
      const documentId = funcIndex >= 0 && funcIndex < pathParts.length - 1 
        ? pathParts[funcIndex + 1] 
        : null
      
      if (!documentId) {
        // List all documents
        logger.info('Listing documents', { accountId })

        const result = await alpacaClient.listDocuments(accountId)

        if (!result.success) {
          logger.error('Failed to list documents', result.error)
          return createErrorResponse(
            result.error?.message || 'Failed to list documents',
            result.error?.status || 500
          )
        }

        logger.info('Documents listed successfully', { count: result.data?.length || 0 })
        return createSuccessResponse(result.data)

      } else {
        // Get specific document (download URL)
        logger.info('Getting document download URL', { accountId, documentId })

        const result = await alpacaClient.getDocumentDownloadUrl(accountId, documentId)

        if (!result.success) {
          logger.error('Failed to get document download URL', result.error)
          return createErrorResponse(
            result.error?.message || 'Failed to get document',
            result.error?.status || 500
          )
        }

        logger.info('Document URL retrieved successfully', { 
          documentId, 
          hasDownloadUrl: !!result.data?.download_url,
          dataKeys: result.data ? Object.keys(result.data) : []
        })
        return createSuccessResponse(result.data)
      }

    } else {
      return createErrorResponse('Method not allowed', 405)
    }

  } catch (error) {
    console.error('Unexpected error in document management:', error)

    return createErrorResponse(
      'Internal server error',
      500
    )
  }
})
