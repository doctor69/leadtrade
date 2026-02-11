import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { FileText, Download, Loader2, AlertCircle, Calendar, Filter } from 'lucide-react';
import { edgeFunctionClient } from '@/lib/edgeFunctionClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface Document {
  id: string;
  name: string;
  type: string;
  date: string;
  created_at: string;
}

interface DocumentsPanelProps {
  accountId: string; // Still needed for the component key/identification
}

export default function DocumentsPanel({ accountId }: DocumentsPanelProps) {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filteredDocuments, setFilteredDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadDocuments();
  }, []); // Remove accountId dependency since function gets it from auth

  useEffect(() => {
    // Filter documents when filter changes
    if (filterType === 'all') {
      setFilteredDocuments(documents);
    } else {
      setFilteredDocuments(documents.filter(doc => doc.type === filterType));
    }
  }, [filterType, documents]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await edgeFunctionClient.get('alpaca-documents');

      if (response.success && response.data) {
        setDocuments(response.data);
      } else {
        throw new Error(response.error?.message || 'Failed to load documents');
      }
    } catch (err) {
      console.error('Error loading documents:', err);
      setError(err instanceof Error ? err.message : 'Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const downloadDocument = async (documentId: string) => {
    try {
      setDownloadingId(documentId);

      const response = await edgeFunctionClient.get(`alpaca-documents/${documentId}`);

      if (response.success && response.data) {
        const downloadUrl = response.data.download_url || response.data;

        if (typeof downloadUrl === 'string' && downloadUrl.startsWith('http')) {
          window.open(downloadUrl, '_blank');
        } else {
          throw new Error('Invalid download URL received from server');
        }
      } else {
        throw new Error(response.error?.message || 'Failed to download document');
      }
    } catch (err) {
      console.error('Error downloading document:', err);
      alert(err instanceof Error ? err.message : 'Failed to download document');
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const getDocumentTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      'account_statement': 'Account Statement',
      'trade_confirmation': 'Trade Confirmation',
      'tax_document': 'Tax Document',
      'w8ben': 'W-8BEN Form',
      'w9': 'W-9 Form',
    };
    return typeMap[type] || type;
  };

  // Get unique document types from the documents
  const documentTypes = Array.from(new Set(documents.map(doc => doc.type)));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Documents & Statements
            </CardTitle>
            <CardDescription>
              View and download your account statements, trade confirmations, and tax documents
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Documents</SelectItem>
                {documentTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {getDocumentTypeLabel(type)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={loadDocuments}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground">Loading documents...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-4">
              <AlertCircle className="h-8 w-8 mx-auto text-red-500" />
              <div>
                <p className="text-sm font-medium">Failed to load documents</p>
                <p className="text-xs text-muted-foreground mt-1">{error}</p>
              </div>
              <Button variant="outline" size="sm" onClick={loadDocuments}>
                Try Again
              </Button>
            </div>
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-2">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="text-sm font-medium">
                {filterType === 'all' ? 'No documents available' : 'No documents found for this type'}
              </p>
              <p className="text-xs text-muted-foreground">
                {filterType === 'all' 
                  ? 'Documents will appear here once they are generated'
                  : 'Try selecting a different document type'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDocuments.map((doc) => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{doc.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {getDocumentTypeLabel(doc.type)}
                      </span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(doc.date || doc.created_at)}
                      </span>
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadDocument(doc.id)}
                  disabled={downloadingId === doc.id}
                >
                  {downloadingId === doc.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            <strong>Note:</strong> Under FINRA and SEC rules, Alpaca is required to provide customer statements and trade confirmations.
            Monthly statements are typically available within 10 business days after month-end. Trade confirmations are generated for each trade execution.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
