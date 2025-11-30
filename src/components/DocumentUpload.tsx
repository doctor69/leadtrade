import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Upload, X, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import type {
  DocumentUpload,
  DocumentType,
  DocumentSubType,
  DocumentRequirements
} from '@/types/documents';
import {
  DEFAULT_DOCUMENT_REQUIREMENTS,
  SUPPORTED_FILE_TYPES,
  MAX_FILE_SIZE
} from '@/types/documents';

interface DocumentUploadProps {
  documents: DocumentUpload[];
  onDocumentsChange: (documents: DocumentUpload[]) => void;
  requirements?: DocumentRequirements;
  allowSkip?: boolean;
  onSkip?: () => void;
}

export default function DocumentUpload({
  documents,
  onDocumentsChange,
  requirements = DEFAULT_DOCUMENT_REQUIREMENTS,
  allowSkip = true,
  onSkip
}: DocumentUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (files: FileList | null, documentType?: DocumentType) => {
    if (!files || files.length === 0) return;

    const file = files[0];

    // Validate file type
    if (!SUPPORTED_FILE_TYPES.includes(file.type)) {
      alert('Unsupported file type. Please upload JPEG, PNG, GIF, or PDF files.');
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      alert('File too large. Please upload files smaller than 10MB.');
      return;
    }

    // Convert to base64
    const base64Content = await fileToBase64(file);

    // Create document upload object
    const newDocument: DocumentUpload = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
      type: documentType || 'identity_verification',
      subType: getDefaultSubType(documentType || 'identity_verification'),
      file,
      base64Content,
      mimeType: file.type,
      fileName: file.name,
      required: documentType === 'identity_verification',
      uploaded: true,
      error: undefined
    };

    // Add to documents list
    const updatedDocuments = [...documents, newDocument];
    onDocumentsChange(updatedDocuments);
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data:image/jpeg;base64, prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const getDefaultSubType = (type: DocumentType): DocumentSubType => {
    switch (type) {
      case 'identity_verification':
        return 'drivers_license';
      case 'address_verification':
        return 'utility_bill';
      default:
        return 'other';
    }
  };

  const removeDocument = (documentId: string) => {
    const updatedDocuments = documents.filter(doc => doc.id !== documentId);
    onDocumentsChange(updatedDocuments);
  };

  const updateDocumentType = (documentId: string, type: DocumentType, subType: DocumentSubType) => {
    const updatedDocuments = documents.map(doc =>
      doc.id === documentId
        ? { ...doc, type, subType }
        : doc
    );
    onDocumentsChange(updatedDocuments);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  };

  const hasRequiredDocuments = () => {
    return documents.some(doc => doc.type === 'identity_verification' && doc.uploaded);
  };

  const getDocumentTypeOptions = (): { value: DocumentType; label: string }[] => [
    { value: 'identity_verification', label: 'Identity Verification' },
    { value: 'address_verification', label: 'Address Verification' },
    { value: 'account_approval_letter', label: 'Account Approval Letter' },
    { value: 'w9', label: 'W-9 Tax Form' },
    { value: 'w8_ben', label: 'W-8BEN Tax Form' },
    { value: 'other', label: 'Other Document' }
  ];

  const getSubTypeOptions = (type: DocumentType): { value: DocumentSubType; label: string }[] => {
    switch (type) {
      case 'identity_verification':
        return [
          { value: 'drivers_license', label: 'Driver\'s License' },
          { value: 'passport', label: 'Passport' },
          { value: 'state_id', label: 'State ID' },
          { value: 'military_id', label: 'Military ID' }
        ];
      case 'address_verification':
        return [
          { value: 'utility_bill', label: 'Utility Bill' },
          { value: 'bank_statement', label: 'Bank Statement' },
          { value: 'lease_agreement', label: 'Lease Agreement' }
        ];
      default:
        return [{ value: 'other', label: 'Other' }];
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Document Upload
        </CardTitle>
        <CardDescription>
          Upload required documents for account verification. You can skip this step and upload documents later.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Document Requirements */}
        <div className="space-y-4">
          <h3 className="font-medium">Document Requirements</h3>

          {Object.entries(requirements).map(([key, req]) => (
            <div key={key} className="flex items-start gap-3 p-3 border rounded-lg">
              <div className="flex-shrink-0 mt-1">
                {req.required ? (
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium capitalize">{key.replace('_', ' ')}</span>
                  <Badge variant={req.required ? "destructive" : "secondary"}>
                    {req.required ? 'Required' : 'Optional'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{req.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Accepted: {req.options.join(', ')}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* File Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragOver
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-medium mb-2">Upload Documents</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Drag and drop files here, or click to select files
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept={SUPPORTED_FILE_TYPES.join(',')}
            onChange={(e) => handleFileSelect(e.target.files)}
          />
          <p className="text-xs text-muted-foreground mt-2">
            Supported: JPEG, PNG, GIF, PDF (max 10MB)
          </p>
        </div>

        {/* Uploaded Documents */}
        {documents.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-medium">Uploaded Documents</h3>
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-4 p-4 border rounded-lg">
                <FileText className="h-8 w-8 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{doc.fileName}</p>
                  <div className="flex items-center gap-4 mt-2">
                    <Select
                      value={doc.type}
                      onValueChange={(type: DocumentType) =>
                        updateDocumentType(doc.id, type, getDefaultSubType(type))
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getDocumentTypeOptions().map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select
                      value={doc.subType}
                      onValueChange={(subType: DocumentSubType) =>
                        updateDocumentType(doc.id, doc.type, subType)
                      }
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {getSubTypeOptions(doc.type).map(option => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeDocument(doc.id)}
                  className="flex-shrink-0"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {hasRequiredDocuments() ? (
              <span className="text-green-600">✓ Required documents uploaded</span>
            ) : (
              <span className="text-orange-600">⚠ Identity verification document required</span>
            )}
          </div>

          <div className="flex gap-2">
            {allowSkip && (
              <Button variant="outline" onClick={onSkip}>
                Skip for Now
              </Button>
            )}
            <Button
              disabled={!hasRequiredDocuments()}
              onClick={() => {
                // Continue with account creation
                console.log('Documents ready:', documents);
              }}
            >
              Continue
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}