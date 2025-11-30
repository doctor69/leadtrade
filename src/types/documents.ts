// Document types and interfaces for Alpaca account creation

export interface AlpacaDocument {
  document_type: DocumentType;
  document_sub_type: DocumentSubType;
  content?: string; // Base64 encoded content
  content_data?: null;
  mime_type: string;
}

// Alpaca supported document types
export type DocumentType = 
  | 'identity_verification'
  | 'address_verification'
  | 'account_approval_letter'
  | 'w8_ben'
  | 'w9'
  | 'cip_result'
  | 'account_statement'
  | 'other';

// Document sub-types for identity verification
export type DocumentSubType = 
  | 'passport'
  | 'drivers_license'
  | 'state_id'
  | 'military_id'
  | 'utility_bill'
  | 'bank_statement'
  | 'lease_agreement'
  | 'w9'
  | 'w8_ben'
  | 'other';

// Document upload interface for frontend
export interface DocumentUpload {
  id: string;
  type: DocumentType;
  subType: DocumentSubType;
  file?: File;
  base64Content?: string;
  mimeType: string;
  fileName: string;
  required: boolean;
  uploaded: boolean;
  error?: string;
}

// Document requirements by account type
export interface DocumentRequirements {
  identity_verification: {
    required: boolean;
    options: DocumentSubType[];
    description: string;
  };
  address_verification: {
    required: boolean;
    options: DocumentSubType[];
    description: string;
  };
  tax_documents: {
    required: boolean;
    options: DocumentSubType[];
    description: string;
  };
}

// Default document requirements for US accounts
export const DEFAULT_DOCUMENT_REQUIREMENTS: DocumentRequirements = {
  identity_verification: {
    required: true,
    options: ['passport', 'drivers_license', 'state_id', 'military_id'],
    description: 'Government-issued photo ID to verify your identity'
  },
  address_verification: {
    required: false, // Can be skipped initially
    options: ['utility_bill', 'bank_statement', 'lease_agreement'],
    description: 'Document showing your current address (can be uploaded later)'
  },
  tax_documents: {
    required: false, // Can be uploaded later
    options: ['w9', 'w8_ben'],
    description: 'Tax forms (can be completed later if needed)'
  }
};

// Supported file types
export const SUPPORTED_FILE_TYPES = [
  'image/jpeg',
  'image/jpg', 
  'image/png',
  'image/gif',
  'application/pdf'
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB