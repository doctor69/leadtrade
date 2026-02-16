import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Upload, FileText, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { edgeFunctionClient } from '@/lib/edgeFunctionClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface KYCVerificationPanelProps {
  accountId?: string; // Optional - used for component key/identification, auth context used for API calls
}

export default function KYCVerificationPanel({ accountId: _accountId }: KYCVerificationPanelProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>('identity_verification');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB');
        return;
      }

      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPEG, PNG, and PDF files are allowed');
        return;
      }

      setSelectedFile(file);
      setError(null);
      setUploadSuccess(false);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setUploading(true);
      setError(null);

      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // Upload document
      const response = await edgeFunctionClient.post('alpaca-documents/upload', {
        document_type: documentType,
        content: base64,
        mime_type: selectedFile.type,
      });

      if (response.success) {
        setUploadSuccess(true);
        setSelectedFile(null);
        // Reset file input
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        throw new Error(response.error?.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(err instanceof Error ? err.message : 'Failed to upload document');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5" />
          KYC Verification & Document Upload
        </CardTitle>
        <CardDescription>
          Upload identity documents and additional verification materials
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload Success Message */}
        {uploadSuccess && (
          <div className="bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm">
                Document uploaded successfully! It will be reviewed within 1-3 business days.
              </span>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Document Type Selection */}
        <div className="space-y-2">
          <Label htmlFor="document-type">Document Type</Label>
          <Select value={documentType} onValueChange={setDocumentType}>
            <SelectTrigger id="document-type">
              <SelectValue placeholder="Select document type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="identity_verification">Identity Verification (Driver's License, Passport)</SelectItem>
              <SelectItem value="address_verification">Address Verification (Utility Bill, Bank Statement)</SelectItem>
              <SelectItem value="w8ben">W-8BEN Form (Non-US Residents)</SelectItem>
              <SelectItem value="other">Other Supporting Documents</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Select the type of document you're uploading
          </p>
        </div>

        {/* File Upload */}
        <div className="space-y-2">
          <Label htmlFor="file-upload">Upload Document</Label>
          <div className="flex items-center gap-2">
            <Input
              id="file-upload"
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              onChange={handleFileSelect}
              disabled={uploading}
              className="flex-1"
            />
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              className="min-w-[100px]"
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload
                </>
              )}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Accepted formats: JPEG, PNG, PDF (max 10MB)
          </p>
        </div>

        {/* Selected File Info */}
        {selectedFile && (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50">
            <FileText className="h-5 w-5 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-muted-foreground">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
          </div>
        )}

        {/* Information Box */}
        <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
            Required Documents for KYC Verification
          </h4>
          <ul className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
            <li>• Government-issued photo ID (Driver's License, Passport, or National ID)</li>
            <li>• Proof of address (Utility bill, bank statement, or lease agreement - dated within 3 months)</li>
            <li>• W-8BEN form (for non-US residents only)</li>
            <li>• Additional documents may be requested based on your profile</li>
          </ul>
        </div>

        {/* Privacy Notice */}
        <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded-lg">
          <strong>Privacy & Security:</strong> All documents are encrypted and stored securely. 
          Your information is used solely for identity verification and regulatory compliance purposes. 
          We comply with all applicable data protection regulations.
        </div>
      </CardContent>
    </Card>
  );
}
