import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert } from '@/components/ui/alert'
import { 
  uploadFile, 
  listDocuments, 
  getDocumentDownloadUrl,
  type DocumentType,
  type Document,
  ALLOWED_DOCUMENT_TYPES,
  MAX_FILE_SIZE
} from '@/lib/alpaca-documents'
import { Upload, FileText, Download, Loader2 } from 'lucide-react'

export function DocumentUpload() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [documentType, setDocumentType] = useState<DocumentType>('identity_verification')
  const [documentSubType, setDocumentSubType] = useState('')
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [documents, setDocuments] = useState<Document[]>([])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Load documents on mount
  useState(() => {
    loadDocuments()
  })

  const loadDocuments = async () => {
    setLoading(true)
    setError(null)

    const result = await listDocuments()

    if (result.success && result.data) {
      setDocuments(result.data)
    } else {
      setError(result.error || 'Failed to load documents')
    }

    setLoading(false)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        setError(`File size exceeds maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`)
        setSelectedFile(null)
        return
      }

      setSelectedFile(file)
      setError(null)
      setSuccess(null)
    }
  }

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload')
      return
    }

    setUploading(true)
    setError(null)
    setSuccess(null)

    const result = await uploadFile(
      selectedFile,
      documentType,
      documentSubType || undefined
    )

    if (result.success) {
      setSuccess('Document uploaded successfully')
      setSelectedFile(null)
      setDocumentSubType('')
      // Reset file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement
      if (fileInput) fileInput.value = ''
      // Reload documents
      await loadDocuments()
    } else {
      setError(result.error || 'Failed to upload document')
    }

    setUploading(false)
  }

  const handleDownload = async (documentId: string) => {
    const result = await getDocumentDownloadUrl(documentId)

    if (result.success && result.data) {
      // Open download URL in new tab
      window.open(result.data, '_blank')
    } else {
      setError(result.error || 'Failed to get download URL')
    }
  }

  const getDocumentTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      identity_verification: 'Identity Verification',
      address_verification: 'Address Verification',
      w8ben: 'W-8BEN Form',
      other: 'Other'
    }
    return labels[type] || type
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Upload Document</h2>

        {error && (
          <Alert variant="destructive" className="mb-4">
            {error}
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 text-green-900 border-green-200">
            {success}
          </Alert>
        )}

        <div className="space-y-4">
          <div>
            <Label htmlFor="document-type">Document Type</Label>
            <Select
              value={documentType}
              onValueChange={(value) => setDocumentType(value as DocumentType)}
            >
              <SelectTrigger id="document-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ALLOWED_DOCUMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getDocumentTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="document-sub-type">Document Sub-Type (Optional)</Label>
            <input
              id="document-sub-type"
              type="text"
              value={documentSubType}
              onChange={(e) => setDocumentSubType(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              placeholder="e.g., passport, driver_license"
            />
          </div>

          <div>
            <Label htmlFor="file-input">Select File</Label>
            <div className="mt-2">
              <input
                id="file-input"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="w-full"
              />
              <p className="text-sm text-gray-500 mt-1">
                Accepted formats: PDF, JPEG, PNG (max {MAX_FILE_SIZE / 1024 / 1024}MB)
              </p>
            </div>
          </div>

          {selectedFile && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-md">
              <FileText className="w-5 h-5 text-gray-600" />
              <span className="text-sm">{selectedFile.name}</span>
              <span className="text-xs text-gray-500">
                ({(selectedFile.size / 1024).toFixed(2)} KB)
              </span>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={!selectedFile || uploading}
            className="w-full"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Your Documents</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={loadDocuments}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Refresh'
            )}
          </Button>
        </div>

        {loading && documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            Loading documents...
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No documents uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-md hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="font-medium">{getDocumentTypeLabel(doc.document_type)}</p>
                    {doc.document_sub_type && (
                      <p className="text-sm text-gray-500">{doc.document_sub_type}</p>
                    )}
                    <p className="text-xs text-gray-400">
                      Uploaded: {new Date(doc.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(doc.id)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
