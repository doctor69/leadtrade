import { z } from 'zod'

// Validation schemas
export const DocumentTypeSchema = z.enum([
  'identity_verification',
  'address_verification',
  'w8ben',
  'other'
])

export const MimeTypeSchema = z.enum([
  'application/pdf',
  'image/jpeg',
  'image/png'
])

export const DocumentUploadSchema = z.object({
  document_type: DocumentTypeSchema,
  document_sub_type: z.string().optional(),
  content: z.string(), // base64 encoded
  mime_type: MimeTypeSchema
})

export const DocumentSchema = z.object({
  id: z.string(),
  document_type: z.string(),
  document_sub_type: z.string().optional(),
  created_at: z.string(),
  mime_type: z.string().optional()
})

export const DocumentDownloadSchema = z.object({
  download_url: z.string().url()
})

// TypeScript types
export type DocumentType = z.infer<typeof DocumentTypeSchema>
export type MimeType = z.infer<typeof MimeTypeSchema>
export type DocumentUpload = z.infer<typeof DocumentUploadSchema>
export type Document = z.infer<typeof DocumentSchema>
export type DocumentDownload = z.infer<typeof DocumentDownloadSchema>

// Constants
export const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
export const ALLOWED_MIME_TYPES: MimeType[] = ['application/pdf', 'image/jpeg', 'image/png']
export const ALLOWED_DOCUMENT_TYPES: DocumentType[] = [
  'identity_verification',
  'address_verification',
  'w8ben',
  'other'
]

/**
 * Convert a File to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Remove data URL prefix if present
      const base64 = result.replace(/^data:.*?;base64,/, '')
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * Validate file before upload
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    }
  }

  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(file.type as MimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`
    }
  }

  return { valid: true }
}

/**
 * Upload a document to Alpaca
 */
export async function uploadDocument(
  documentData: DocumentUpload
): Promise<{ success: boolean; data?: Document; error?: string }> {
  try {
    // Validate input
    const validation = DocumentUploadSchema.safeParse(documentData)
    if (!validation.success) {
      return {
        success: false,
        error: `Validation error: ${validation.error.message}`
      }
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-documents/upload`

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(documentData),
      credentials: 'include'
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to upload document'
      }
    }

    // Validate response
    const documentValidation = DocumentSchema.safeParse(result)
    if (!documentValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      }
    }

    return {
      success: true,
      data: documentValidation.data
    }
  } catch (error) {
    console.error('Error uploading document:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * List all documents for the current account
 */
export async function listDocuments(): Promise<{
  success: boolean
  data?: Document[]
  error?: string
}> {
  try {
    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-documents`

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      credentials: 'include'
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to list documents'
      }
    }

    // Validate response
    const documentsValidation = z.array(DocumentSchema).safeParse(result)
    if (!documentsValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      }
    }

    return {
      success: true,
      data: documentsValidation.data
    }
  } catch (error) {
    console.error('Error listing documents:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get download URL for a specific document
 */
export async function getDocumentDownloadUrl(
  documentId: string
): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    if (!documentId) {
      return {
        success: false,
        error: 'Document ID is required'
      }
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-documents/${documentId}`

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      credentials: 'include'
    })

    const result = await response.json()

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to get document download URL'
      }
    }

    // Validate response
    const downloadValidation = DocumentDownloadSchema.safeParse(result)
    if (!downloadValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      }
    }

    return {
      success: true,
      data: downloadValidation.data.download_url
    }
  } catch (error) {
    console.error('Error getting document download URL:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Upload a file directly (convenience method)
 */
export async function uploadFile(
  file: File,
  documentType: DocumentType,
  documentSubType?: string
): Promise<{ success: boolean; data?: Document; error?: string }> {
  try {
    // Validate file
    const validation = validateFile(file)
    if (!validation.valid) {
      return {
        success: false,
        error: validation.error
      }
    }

    // Convert to base64
    const base64Content = await fileToBase64(file)

    // Upload document
    return await uploadDocument({
      document_type: documentType,
      document_sub_type: documentSubType,
      content: base64Content,
      mime_type: file.type as MimeType
    })
  } catch (error) {
    console.error('Error uploading file:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
