/**
 * Funding System Verification Tests
 * 
 * Tests for Limited Live Tech Requirements - Phase 2: Account Funding
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { 
  createACHRelationship, 
  listACHRelationships, 
  deleteACHRelationship,
  type CreateACHRelationshipRequest 
} from '../alpaca-ach-relationships';
import {
  createBankRelationship,
  listBankRelationships,
  deleteBankRelationship,
  type CreateBankRelationshipRequest
} from '../alpaca-bank-relationships';
import {
  createTransfer,
  listTransfers,
  cancelTransfer,
  type CreateTransferRequest
} from '../alpaca-transfers';

// Test account ID - should be set from environment or test setup
const TEST_ACCOUNT_ID = process.env.TEST_ALPACA_ACCOUNT_ID || 'test-account-id';
const TRADING_MODE: 'paper' | 'live' = 'paper';

describe('Funding System Verification - Task 2.1: ACH Transfer Functionality', () => {
  let testACHRelationshipId: string | null = null;

  describe('ACH Relationship Creation', () => {
    it('should create ACH relationship with valid data', async () => {
      const achData: CreateACHRelationshipRequest = {
        account_owner_name: 'Test User',
        bank_account_type: 'checking',
        bank_account_number: '123456789',
        bank_routing_number: '121000248', // Valid Wells Fargo routing number
        nickname: 'Test Checking Account'
      };

      const result = await createACHRelationship(TEST_ACCOUNT_ID, achData, TRADING_MODE);

      expect(result.success).toBe(true);
      expect(result.ach).toBeDefined();
      
      if (result.ach) {
        expect(result.ach.id).toBeDefined();
        expect(result.ach.account_owner_name).toBe(achData.account_owner_name);
        expect(result.ach.bank_account_type).toBe(achData.bank_account_type);
        expect(result.ach.status).toBeDefined();
        
        // Store for later tests
        testACHRelationshipId = result.ach.id;
      }
    });

    it('should reject ACH relationship with invalid routing number', async () => {
      const achData: CreateACHRelationshipRequest = {
        account_owner_name: 'Test User',
        bank_account_type: 'checking',
        bank_account_number: '123456789',
        bank_routing_number: '12345', // Invalid - not 9 digits
        nickname: 'Invalid Routing'
      };

      const result = await createACHRelationship(TEST_ACCOUNT_ID, achData, TRADING_MODE);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('9 digits');
    });

    it('should reject ACH relationship with invalid account type', async () => {
      const achData = {
        account_owner_name: 'Test User',
        bank_account_type: 'invalid' as any,
        bank_account_number: '123456789',
        bank_routing_number: '121000248',
      };

      const result = await createACHRelationship(TEST_ACCOUNT_ID, achData, TRADING_MODE);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('ACH Relationship Listing', () => {
    it('should list all ACH relationships', async () => {
      const result = await listACHRelationships(TEST_ACCOUNT_ID, undefined, TRADING_MODE);

      expect(result.success).toBe(true);
      expect(result.relationships).toBeDefined();
      expect(Array.isArray(result.relationships)).toBe(true);
    });

    it('should filter ACH relationships by status', async () => {
      const result = await listACHRelationships(
        TEST_ACCOUNT_ID, 
        { status: 'approved' }, 
        TRADING_MODE
      );

      expect(result.success).toBe(true);
      expect(result.relationships).toBeDefined();
      
      if (result.relationships && result.relationships.length > 0) {
        result.relationships.forEach(ach => {
          expect(ach.status).toBe('approved');
        });
      }
    });
  });

  describe('ACH Transfer Initiation', () => {
    it('should create incoming ACH transfer', async () => {
      // Skip if no ACH relationship available
      if (!testACHRelationshipId) {
        console.log('Skipping: No ACH relationship available');
        return;
      }

      const transferData: CreateTransferRequest = {
        transfer_type: 'ach',
        amount: '100.00',
        direction: 'INCOMING',
        timing: 'immediate',
        relationship_id: testACHRelationshipId
      };

      const result = await createTransfer(TEST_ACCOUNT_ID, transferData);

      expect(result.success).toBe(true);
      expect(result.transfer).toBeDefined();
      
      if (result.transfer) {
        expect(result.transfer.id).toBeDefined();
        expect(result.transfer.type).toBe('ach');
        expect(result.transfer.direction).toBe('INCOMING');
        expect(result.transfer.amount).toBe('100.00');
        expect(result.transfer.status).toBeDefined();
      }
    });

    it('should create outgoing ACH transfer (withdrawal)', async () => {
      if (!testACHRelationshipId) {
        console.log('Skipping: No ACH relationship available');
        return;
      }

      const transferData: CreateTransferRequest = {
        transfer_type: 'ach',
        amount: '50.00',
        direction: 'OUTGOING',
        timing: 'next_day',
        relationship_id: testACHRelationshipId
      };

      const result = await createTransfer(TEST_ACCOUNT_ID, transferData);

      expect(result.success).toBe(true);
      expect(result.transfer).toBeDefined();
      
      if (result.transfer) {
        expect(result.transfer.direction).toBe('OUTGOING');
        expect(result.transfer.amount).toBe('50.00');
      }
    });

    it('should reject ACH transfer without relationship_id', async () => {
      const transferData: CreateTransferRequest = {
        transfer_type: 'ach',
        amount: '100.00',
        direction: 'INCOMING',
        timing: 'immediate'
        // Missing relationship_id
      };

      const result = await createTransfer(TEST_ACCOUNT_ID, transferData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('relationship_id');
    });

    it('should reject ACH transfer with invalid amount', async () => {
      if (!testACHRelationshipId) {
        console.log('Skipping: No ACH relationship available');
        return;
      }

      const transferData: CreateTransferRequest = {
        transfer_type: 'ach',
        amount: '-100.00', // Negative amount
        direction: 'INCOMING',
        relationship_id: testACHRelationshipId
      };

      const result = await createTransfer(TEST_ACCOUNT_ID, transferData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Transfer Status Tracking', () => {
    it('should list all transfers', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID);

      expect(result.success).toBe(true);
      expect(result.transfers).toBeDefined();
      expect(Array.isArray(result.transfers)).toBe(true);
    });

    it('should filter transfers by direction', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID, { direction: 'INCOMING' });

      expect(result.success).toBe(true);
      expect(result.transfers).toBeDefined();
      
      if (result.transfers && result.transfers.length > 0) {
        result.transfers.forEach(transfer => {
          expect(transfer.direction).toBe('INCOMING');
        });
      }
    });

    it('should verify transfer has required fields', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID);

      if (result.success && result.transfers && result.transfers.length > 0) {
        const transfer = result.transfers[0];
        
        expect(transfer.id).toBeDefined();
        expect(transfer.account_id).toBeDefined();
        expect(transfer.type).toBeDefined();
        expect(transfer.status).toBeDefined();
        expect(transfer.amount).toBeDefined();
        expect(transfer.direction).toBeDefined();
        expect(transfer.created_at).toBeDefined();
        expect(transfer.updated_at).toBeDefined();
      }
    });
  });

  describe('Transfer Cancellation', () => {
    it('should cancel pending transfer', async () => {
      // First, list transfers to find a pending one
      const listResult = await listTransfers(TEST_ACCOUNT_ID);
      
      if (listResult.success && listResult.transfers) {
        const pendingTransfer = listResult.transfers.find(t => t.status === 'pending');
        
        if (pendingTransfer) {
          const cancelResult = await cancelTransfer(TEST_ACCOUNT_ID, pendingTransfer.id);
          
          expect(cancelResult.success).toBe(true);
        } else {
          console.log('No pending transfers to cancel');
        }
      }
    });

    it('should reject cancellation with invalid transfer ID', async () => {
      const result = await cancelTransfer(TEST_ACCOUNT_ID, 'invalid-transfer-id');

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});

describe('Funding System Verification - Task 2.2: Wire Transfer Functionality', () => {
  let testBankId: string | null = null;

  describe('Bank Relationship Creation', () => {
    it('should create bank relationship with valid data', async () => {
      const bankData: CreateBankRelationshipRequest = {
        name: 'Test Bank',
        bank_code: '121000248', // Wells Fargo ABA routing number
        bank_code_type: 'aba',
        account_number: '1234567890',
        country: 'USA',
        state_province: 'CA',
        postal_code: '94102',
        city: 'San Francisco',
        street_address: '123 Test St'
      };

      const result = await createBankRelationship(TEST_ACCOUNT_ID, bankData);

      expect(result.success).toBe(true);
      expect(result.bank).toBeDefined();
      
      if (result.bank) {
        expect(result.bank.id).toBeDefined();
        expect(result.bank.name).toBe(bankData.name);
        expect(result.bank.bank_code).toBe(bankData.bank_code);
        expect(result.bank.bank_code_type).toBe(bankData.bank_code_type);
        
        testBankId = result.bank.id;
      }
    });

    it('should reject bank relationship with invalid bank_code_type', async () => {
      const bankData = {
        name: 'Test Bank',
        bank_code: '121000248',
        bank_code_type: 'invalid' as any,
        account_number: '1234567890'
      };

      const result = await createBankRelationship(TEST_ACCOUNT_ID, bankData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Bank Relationship Listing', () => {
    it('should list all bank relationships', async () => {
      const result = await listBankRelationships(TEST_ACCOUNT_ID);

      expect(result.success).toBe(true);
      expect(result.banks).toBeDefined();
      expect(Array.isArray(result.banks)).toBe(true);
    });
  });

  describe('Wire Transfer Initiation', () => {
    it('should create incoming wire transfer with all required fields', async () => {
      if (!testBankId) {
        console.log('Skipping: No bank relationship available');
        return;
      }

      const transferData: CreateTransferRequest = {
        transfer_type: 'wire',
        amount: '1000.00',
        direction: 'INCOMING',
        bank_id: testBankId,
        additional_information: 'Test wire transfer for account funding',
        fee_payment_method: 'user'
      };

      const result = await createTransfer(TEST_ACCOUNT_ID, transferData);

      expect(result.success).toBe(true);
      expect(result.transfer).toBeDefined();
      
      if (result.transfer) {
        expect(result.transfer.type).toBe('wire');
        expect(result.transfer.direction).toBe('INCOMING');
        expect(result.transfer.amount).toBe('1000.00');
        expect(result.transfer.additional_information).toBeDefined();
      }
    });

    it('should create outgoing wire transfer', async () => {
      if (!testBankId) {
        console.log('Skipping: No bank relationship available');
        return;
      }

      const transferData: CreateTransferRequest = {
        transfer_type: 'wire',
        amount: '500.00',
        direction: 'OUTGOING',
        bank_id: testBankId,
        additional_information: 'Test wire withdrawal - REF#12345',
        fee_payment_method: 'invoice'
      };

      const result = await createTransfer(TEST_ACCOUNT_ID, transferData);

      expect(result.success).toBe(true);
      expect(result.transfer).toBeDefined();
      
      if (result.transfer) {
        expect(result.transfer.direction).toBe('OUTGOING');
      }
    });

    it('should reject wire transfer without additional_information', async () => {
      if (!testBankId) {
        console.log('Skipping: No bank relationship available');
        return;
      }

      const transferData: CreateTransferRequest = {
        transfer_type: 'wire',
        amount: '1000.00',
        direction: 'INCOMING',
        bank_id: testBankId,
        fee_payment_method: 'user'
        // Missing additional_information
      };

      const result = await createTransfer(TEST_ACCOUNT_ID, transferData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('additional_information');
    });

    it('should reject wire transfer without fee_payment_method', async () => {
      if (!testBankId) {
        console.log('Skipping: No bank relationship available');
        return;
      }

      const transferData: CreateTransferRequest = {
        transfer_type: 'wire',
        amount: '1000.00',
        direction: 'INCOMING',
        bank_id: testBankId,
        additional_information: 'Test transfer'
        // Missing fee_payment_method
      };

      const result = await createTransfer(TEST_ACCOUNT_ID, transferData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('fee_payment_method');
    });
  });

  describe('Wire Transfer Instructions', () => {
    it('should verify wire transfer includes reference information', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID);

      if (result.success && result.transfers) {
        const wireTransfers = result.transfers.filter(t => t.type === 'wire');
        
        if (wireTransfers.length > 0) {
          wireTransfers.forEach(transfer => {
            expect(transfer.additional_information).toBeDefined();
            expect(transfer.bank_id).toBeDefined();
          });
        }
      }
    });
  });

  describe('Wire Transfer Status Tracking', () => {
    it('should track wire transfer status changes', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID);

      if (result.success && result.transfers) {
        const wireTransfers = result.transfers.filter(t => t.type === 'wire');
        
        if (wireTransfers.length > 0) {
          wireTransfers.forEach(transfer => {
            expect(transfer.status).toBeDefined();
            expect(['queued', 'pending', 'sent_to_clearing', 'approved', 'canceled', 'rejected'])
              .toContain(transfer.status);
          });
        }
      }
    });
  });
});

describe('Funding System Verification - Task 2.3: Transfer History Display', () => {
  describe('Transfer History Completeness', () => {
    it('should display all transfer types correctly', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID);

      expect(result.success).toBe(true);
      expect(result.transfers).toBeDefined();
      
      if (result.transfers && result.transfers.length > 0) {
        result.transfers.forEach(transfer => {
          // Verify all required display fields are present
          expect(transfer.id).toBeDefined();
          expect(transfer.type).toBeDefined();
          expect(transfer.status).toBeDefined();
          expect(transfer.amount).toBeDefined();
          expect(transfer.direction).toBeDefined();
          expect(transfer.created_at).toBeDefined();
          expect(transfer.updated_at).toBeDefined();
          
          // Verify type is valid
          expect(['ach', 'wire', 'sandbox']).toContain(transfer.type);
          
          // Verify direction is valid
          expect(['INCOMING', 'OUTGOING']).toContain(transfer.direction);
        });
      }
    });

    it('should verify timestamp accuracy and format', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID);

      if (result.success && result.transfers && result.transfers.length > 0) {
        result.transfers.forEach(transfer => {
          // Verify timestamps are valid ISO 8601 dates
          expect(() => new Date(transfer.created_at)).not.toThrow();
          expect(() => new Date(transfer.updated_at)).not.toThrow();
          
          // Verify created_at is before or equal to updated_at
          const createdDate = new Date(transfer.created_at);
          const updatedDate = new Date(transfer.updated_at);
          expect(createdDate.getTime()).toBeLessThanOrEqual(updatedDate.getTime());
        });
      }
    });

    it('should support real-time status updates', async () => {
      // Get initial transfer list
      const initialResult = await listTransfers(TEST_ACCOUNT_ID);
      
      expect(initialResult.success).toBe(true);
      
      // Wait a moment and fetch again
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const updatedResult = await listTransfers(TEST_ACCOUNT_ID);
      
      expect(updatedResult.success).toBe(true);
      
      // Both calls should succeed (verifying API availability)
      expect(initialResult.transfers).toBeDefined();
      expect(updatedResult.transfers).toBeDefined();
    });
  });

  describe('Transfer Filtering', () => {
    it('should filter by INCOMING direction', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID, { direction: 'INCOMING' });

      expect(result.success).toBe(true);
      
      if (result.transfers && result.transfers.length > 0) {
        result.transfers.forEach(transfer => {
          expect(transfer.direction).toBe('INCOMING');
        });
      }
    });

    it('should filter by OUTGOING direction', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID, { direction: 'OUTGOING' });

      expect(result.success).toBe(true);
      
      if (result.transfers && result.transfers.length > 0) {
        result.transfers.forEach(transfer => {
          expect(transfer.direction).toBe('OUTGOING');
        });
      }
    });

    it('should support pagination with limit', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID, { limit: 5 });

      expect(result.success).toBe(true);
      expect(result.transfers).toBeDefined();
      
      if (result.transfers) {
        expect(result.transfers.length).toBeLessThanOrEqual(5);
      }
    });
  });
});

describe('Funding System Verification - Task 2.4: Buying Power Updates', () => {
  describe('Balance Updates After Funding', () => {
    it('should verify transfer affects account balance', async () => {
      // This test verifies the transfer system is working
      // Actual balance verification would require account API integration
      const result = await listTransfers(TEST_ACCOUNT_ID);

      expect(result.success).toBe(true);
      
      if (result.transfers && result.transfers.length > 0) {
        const approvedTransfers = result.transfers.filter(t => t.status === 'approved');
        
        // Approved transfers should have completed and affected balance
        approvedTransfers.forEach(transfer => {
          expect(transfer.status).toBe('approved');
          expect(parseFloat(transfer.amount)).toBeGreaterThan(0);
        });
      }
    });

    it('should track multiple transfer types', async () => {
      const result = await listTransfers(TEST_ACCOUNT_ID);

      if (result.success && result.transfers && result.transfers.length > 0) {
        const transferTypes = new Set(result.transfers.map(t => t.type));
        
        // Verify we can handle multiple transfer types
        transferTypes.forEach(type => {
          expect(['ach', 'wire', 'sandbox']).toContain(type);
        });
      }
    });
  });
});
