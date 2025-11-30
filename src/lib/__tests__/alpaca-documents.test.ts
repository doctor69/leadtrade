import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  validateFile,
  fileToBase64,
  uploadDocument,
  listDocuments,
  getDocumentDownloadUrl,
  uploadFile,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  type DocumentUpload,
  type Document
} from '../alpaca-documents'

// Mock fetch
global.fetch = vi.fn()

describe('alpaca-documents', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateFile', () => {
    it('should validate file size', () => {
      const largeFile = new File(['x'.repeat(MAX_FILE_SIZE + 1)], 'large.pdf', {
        type: 'application/pdf'
      })

      const result = validateFile(largeFile)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('exceeds maximum limit')
    })

    it('should validate mime type', () => {
      const invalidFile = new File(['content'], 'file.txt', {
        type: 'text/plain'
      })

      const result = validateFile(invalidFile)

      expect(result.valid).toBe(false)
      expect(result.error).toContain('Invalid file type')
    })

    it('should accept valid files', () => {
      const validFile = new File(['content'], 'document.pdf', {
        type: 'application/pdf'
      })

      const result = validateFile(validFile)

      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should accept all allowed mime types', () => {
      ALLOWED_MIME_TYPES.forEach((mimeType) => {
        const file = new File(['content'], `file.${mimeType.split('/')[1]}`, {
          type: mimeType
        })

        const result = validateFile(file)

        expect(result.valid).toBe(true)
      })
    })
  })

  describe('fileToBase64', () => {
    it('should convert file to base64', async () => {
      const file = new File(['test content'], 'test.pdf', {
        type: 'application/pdf'
      })

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: 'data:application/pdf;base64,dGVzdCBjb250ZW50'
      }

      vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

      const promise = fileToBase64(file)

      // Trigger onload
      mockFileReader.onload()

      const result = await promise

      expect(result).toBe('dGVzdCBjb250ZW50')
      expect(mockFileReader.readAsDataURL).toHaveBeenCalledWith(file)
    })
  })

  describe('uploadDocument', () => {
    it('should upload document successfully', async () => {
      const mockDocument: Document = {
        id: 'doc-123',
        document_type: 'identity_verification',
        created_at: '2025-01-08T00:00:00Z'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument
      } as Response)

      const documentData: DocumentUpload = {
        document_type: 'identity_verification',
        content: 'base64content',
        mime_type: 'application/pdf'
      }

      const result = await uploadDocument(documentData)

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockDocument)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/alpaca-documents/upload'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(documentData),
          credentials: 'include'
        })
      )
    })

    it('should handle upload errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Upload failed' })
      } as Response)

      const documentData: DocumentUpload = {
        document_type: 'identity_verification',
        content: 'base64content',
        mime_type: 'application/pdf'
      }

      const result = await uploadDocument(documentData)

      expect(result.success).toBe(false)
      expect(result.error).toBe('Upload failed')
    })

    it('should validate input data', async () => {
      const invalidData = {
        document_type: 'invalid_type',
        content: 'base64content',
        mime_type: 'application/pdf'
      } as any

      const result = await uploadDocument(invalidData)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Validation error')
    })
  })

  describe('listDocuments', () => {
    it('should list documents successfully', async () => {
      const mockDocuments: Document[] = [
        {
          id: 'doc-1',
          document_type: 'identity_verification',
          created_at: '2025-01-08T00:00:00Z'
        },
        {
          id: 'doc-2',
          document_type: 'address_verification',
          created_at: '2025-01-08T00:00:00Z'
        }
      ]

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocuments
      } as Response)

      const result = await listDocuments()

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockDocuments)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/alpaca-documents'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      )
    })

    it('should handle list errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Failed to list' })
      } as Response)

      const result = await listDocuments()

      expect(result.success).toBe(false)
      expect(result.error).toBe('Failed to list')
    })
  })

  describe('getDocumentDownloadUrl', () => {
    it('should get download URL successfully', async () => {
      const mockResponse = {
        download_url: 'https://example.com/download/doc-123'
      }

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      } as Response)

      const result = await getDocumentDownloadUrl('doc-123')

      expect(result.success).toBe(true)
      expect(result.data).toBe(mockResponse.download_url)
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/functions/v1/alpaca-documents/doc-123'),
        expect.objectContaining({
          method: 'GET',
          credentials: 'include'
        })
      )
    })

    it('should handle missing document ID', async () => {
      const result = await getDocumentDownloadUrl('')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Document ID is required')
      expect(fetch).not.toHaveBeenCalled()
    })

    it('should handle download URL errors', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Document not found' })
      } as Response)

      const result = await getDocumentDownloadUrl('doc-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Document not found')
    })
  })

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const file = new File(['content'], 'test.pdf', {
        type: 'application/pdf'
      })

      const mockDocument: Document = {
        id: 'doc-123',
        document_type: 'identity_verification',
        created_at: '2025-01-08T00:00:00Z'
      }

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        onerror: null as any,
        result: 'data:application/pdf;base64,Y29udGVudA=='
      }

      vi.spyOn(global, 'FileReader').mockImplementation(() => mockFileReader as any)

      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDocument
      } as Response)

      const promise = uploadFile(file, 'identity_verification')

      // Trigger FileReader onload
      mockFileReader.onload()

      const result = await promise

      expect(result.success).toBe(true)
      expect(result.data).toEqual(mockDocument)
    })

    it('should validate file before upload', async () => {
      const largeFile = new File(['x'.repeat(MAX_FILE_SIZE + 1)], 'large.pdf', {
        type: 'application/pdf'
      })

      const result = await uploadFile(largeFile, 'identity_verification')

      expect(result.success).toBe(false)
      expect(result.error).toContain('exceeds maximum limit')
      expect(fetch).not.toHaveBeenCalled()
    })
  })
})
