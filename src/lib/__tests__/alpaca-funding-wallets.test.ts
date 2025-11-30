import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createFundingWallet,
  getFundingWallet,
  listFundingWallets,
  getPaymentInstructions,
  createWithdrawal,
  createRecipientBank,
  listRecipientBanks,
  deleteRecipientBank,
  CreateFundingWalletSchema,
  CreateRecipientBankSchema,
  CreateWithdrawalSchema
} from '../alpaca-funding-wallets'

// Mock trading-config
vi.mock('../trading-config', () => ({
  getAlpacaConfig: vi.fn(() => ({
    brokerApiKey: 'test-broker-key',
    brokerApiSecret: 'test-broker-secret',
    dataApiKey: 'test-data-key',
    dataApiSecret: 'test-data-secret',
    brokerBaseUrl: 'https://broker-api.sandbox.alpaca.markets',
    dataBaseUrl: 'https://data.sandbox.alpaca.markets'
  }))
}))

// Mock fetch globally
global.fetch = vi.fn()

describe('Alpaca Funding Wallets API', () => {
  const mockAccountId = 'test-account-123'
  const mockWalletId = 'wallet-456'
  const mockBankId = 'bank-789'
  const mockAuthToken = 'test-token'

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createFundingWallet', () => {
    it('should create a new funding wallet', async () => {
      const mockWallet = {
        id: mockWalletId,
        account_id: mockAccountId,
        currency: 'EUR',
        balance: '0.00',
        available_balance: '0.00',
        pending_balance: '0.00',
        status: 'active',
        created_at: '2025-01-09T12:00:00Z',
        updated_at: '2025-01-09T12:00:00Z'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWallet
      })

      const result = await createFundingWallet(
        mockAccountId,
        { currency: 'EUR', nickname: 'European Trading' },
        'paper'
      )

      expect(result).toEqual(mockWallet)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/v1/accounts/${mockAccountId}/funding_wallets`),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ currency: 'EUR', nickname: 'European Trading' })
        })
      )
    })

    it('should validate currency code format', () => {
      expect(() => {
        CreateFundingWalletSchema.parse({ currency: 'US' }) // Too short
      }).toThrow()

      expect(() => {
        CreateFundingWalletSchema.parse({ currency: 'USDD' }) // Too long
      }).toThrow()

      expect(() => {
        CreateFundingWalletSchema.parse({ currency: 'USD' }) // Valid
      }).not.toThrow()
    })
  })

  describe('getFundingWallet', () => {
    it('should retrieve wallet details', async () => {
      const mockWallet = {
        id: mockWalletId,
        account_id: mockAccountId,
        currency: 'EUR',
        balance: '5000.00',
        available_balance: '4500.00',
        pending_balance: '500.00',
        status: 'active',
        created_at: '2025-01-09T12:00:00Z',
        updated_at: '2025-01-09T12:00:00Z'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWallet
      })

      const result = await getFundingWallet(mockAccountId, mockWalletId, 'paper')

      expect(result).toEqual(mockWallet)
      expect(result.balance).toBe('5000.00')
    })
  })

  describe('listFundingWallets', () => {
    it('should list all wallets', async () => {
      const mockWallets = [
        {
          id: 'wallet-1',
          account_id: mockAccountId,
          currency: 'USD',
          balance: '10000.00',
          available_balance: '10000.00',
          pending_balance: '0.00',
          status: 'active',
          created_at: '2025-01-09T12:00:00Z',
          updated_at: '2025-01-09T12:00:00Z'
        },
        {
          id: 'wallet-2',
          account_id: mockAccountId,
          currency: 'EUR',
          balance: '5000.00',
          available_balance: '5000.00',
          pending_balance: '0.00',
          status: 'active',
          created_at: '2025-01-09T12:00:00Z',
          updated_at: '2025-01-09T12:00:00Z'
        }
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWallets
      })

      const result = await listFundingWallets(mockAccountId, undefined, 'paper')

      expect(result).toHaveLength(2)
      expect(result[0].currency).toBe('USD')
      expect(result[1].currency).toBe('EUR')
    })

    it('should filter wallets by currency', async () => {
      const mockWallets = [
        {
          id: 'wallet-2',
          account_id: mockAccountId,
          currency: 'EUR',
          balance: '5000.00',
          available_balance: '5000.00',
          pending_balance: '0.00',
          status: 'active',
          created_at: '2025-01-09T12:00:00Z',
          updated_at: '2025-01-09T12:00:00Z'
        }
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWallets
      })

      const result = await listFundingWallets(
        mockAccountId,
        { currency: 'EUR' },
        'paper'
      )

      expect(result).toHaveLength(1)
      expect(result[0].currency).toBe('EUR')
    })
  })

  describe('getPaymentInstructions', () => {
    it('should retrieve payment instructions', async () => {
      const mockInstructions = {
        wallet_id: mockWalletId,
        currency: 'EUR',
        priority: {
          type: 'priority' as const,
          bank_name: 'Deutsche Bank',
          swift_code: 'DEUTDEFF',
          iban: 'DE89370400440532013000',
          reference: 'REF-123456',
          additional_instructions: 'Include reference in transfer'
        },
        regular: {
          type: 'regular' as const,
          bank_name: 'Deutsche Bank',
          swift_code: 'DEUTDEFF',
          iban: 'DE89370400440532013000',
          reference: 'REF-123456'
        }
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockInstructions
      })

      const result = await getPaymentInstructions(mockAccountId, mockWalletId, 'paper')

      expect(result.wallet_id).toBe(mockWalletId)
      expect(result.priority.swift_code).toBe('DEUTDEFF')
      expect(result.priority.reference).toBe('REF-123456')
    })
  })

  describe('createWithdrawal', () => {
    it('should create a withdrawal', async () => {
      const mockWithdrawal = {
        id: 'withdrawal-123',
        wallet_id: mockWalletId,
        recipient_bank_id: mockBankId,
        amount: '1000.00',
        currency: 'EUR',
        fee: '25.00',
        status: 'pending' as const,
        created_at: '2025-01-09T12:00:00Z'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWithdrawal
      })

      const result = await createWithdrawal(
        mockAccountId,
        mockWalletId,
        {
          recipient_bank_id: mockBankId,
          amount: '1000.00',
          note: 'Test withdrawal'
        },
        'paper'
      )

      expect(result.amount).toBe('1000.00')
      expect(result.status).toBe('pending')
      expect(result.fee).toBe('25.00')
    })

    it('should create withdrawal with currency conversion', async () => {
      const mockWithdrawal = {
        id: 'withdrawal-123',
        wallet_id: mockWalletId,
        recipient_bank_id: mockBankId,
        amount: '1000.00',
        currency: 'EUR',
        converted_amount: '1100.00',
        converted_currency: 'USD',
        exchange_rate: '1.10',
        fee: '30.00',
        status: 'pending' as const,
        created_at: '2025-01-09T12:00:00Z'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockWithdrawal
      })

      const result = await createWithdrawal(
        mockAccountId,
        mockWalletId,
        {
          recipient_bank_id: mockBankId,
          amount: '1000.00',
          currency: 'USD'
        },
        'paper'
      )

      expect(result.converted_amount).toBe('1100.00')
      expect(result.converted_currency).toBe('USD')
      expect(result.exchange_rate).toBe('1.10')
    })

    it('should validate withdrawal request', () => {
      expect(() => {
        CreateWithdrawalSchema.parse({
          recipient_bank_id: mockBankId,
          amount: '1000.00'
        })
      }).not.toThrow()

      expect(() => {
        CreateWithdrawalSchema.parse({
          amount: '1000.00' // Missing recipient_bank_id
        })
      }).toThrow()
    })
  })

  describe('createRecipientBank', () => {
    it('should create a US recipient bank', async () => {
      const mockBank = {
        id: mockBankId,
        wallet_id: mockWalletId,
        bank_name: 'Chase Bank',
        account_holder_name: 'John Doe',
        account_number: '****7890',
        routing_number: '021000021',
        country: 'US',
        currency: 'USD',
        status: 'pending' as const,
        created_at: '2025-01-09T12:00:00Z',
        updated_at: '2025-01-09T12:00:00Z'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBank
      })

      const result = await createRecipientBank(
        mockAccountId,
        mockWalletId,
        {
          bank_name: 'Chase Bank',
          account_holder_name: 'John Doe',
          account_number: '1234567890',
          routing_number: '021000021',
          country: 'US',
          currency: 'USD'
        },
        'paper'
      )

      expect(result.bank_name).toBe('Chase Bank')
      expect(result.country).toBe('US')
      expect(result.status).toBe('pending')
    })

    it('should create a European recipient bank with SWIFT and IBAN', async () => {
      const mockBank = {
        id: mockBankId,
        wallet_id: mockWalletId,
        bank_name: 'Deutsche Bank',
        bank_address: 'Frankfurt, Germany',
        account_holder_name: 'John Doe',
        swift_code: 'DEUTDEFF',
        iban: 'DE89370400440532013000',
        country: 'DE',
        currency: 'EUR',
        status: 'pending' as const,
        created_at: '2025-01-09T12:00:00Z',
        updated_at: '2025-01-09T12:00:00Z'
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBank
      })

      const result = await createRecipientBank(
        mockAccountId,
        mockWalletId,
        {
          bank_name: 'Deutsche Bank',
          bank_address: 'Frankfurt, Germany',
          account_holder_name: 'John Doe',
          swift_code: 'DEUTDEFF',
          iban: 'DE89370400440532013000',
          country: 'DE',
          currency: 'EUR'
        },
        'paper'
      )

      expect(result.swift_code).toBe('DEUTDEFF')
      expect(result.iban).toBe('DE89370400440532013000')
      expect(result.country).toBe('DE')
    })

    it('should validate recipient bank data', () => {
      // Valid US bank
      expect(() => {
        CreateRecipientBankSchema.parse({
          bank_name: 'Chase',
          account_holder_name: 'John Doe',
          account_number: '1234567890',
          routing_number: '021000021',
          country: 'US',
          currency: 'USD'
        })
      }).not.toThrow()

      // Valid European bank
      expect(() => {
        CreateRecipientBankSchema.parse({
          bank_name: 'Deutsche Bank',
          account_holder_name: 'John Doe',
          swift_code: 'DEUTDEFF',
          iban: 'DE89370400440532013000',
          country: 'DE',
          currency: 'EUR'
        })
      }).not.toThrow()

      // Invalid country code
      expect(() => {
        CreateRecipientBankSchema.parse({
          bank_name: 'Bank',
          account_holder_name: 'John Doe',
          country: 'USA', // Should be 2 characters
          currency: 'USD'
        })
      }).toThrow()
    })
  })

  describe('listRecipientBanks', () => {
    it('should list all recipient banks', async () => {
      const mockBanks = [
        {
          id: 'bank-1',
          wallet_id: mockWalletId,
          bank_name: 'Chase Bank',
          account_holder_name: 'John Doe',
          country: 'US',
          currency: 'USD',
          status: 'approved' as const,
          created_at: '2025-01-09T12:00:00Z',
          updated_at: '2025-01-09T12:00:00Z'
        },
        {
          id: 'bank-2',
          wallet_id: mockWalletId,
          bank_name: 'Deutsche Bank',
          account_holder_name: 'John Doe',
          country: 'DE',
          currency: 'EUR',
          status: 'pending' as const,
          created_at: '2025-01-09T12:00:00Z',
          updated_at: '2025-01-09T12:00:00Z'
        }
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks
      })

      const result = await listRecipientBanks(mockAccountId, mockWalletId, undefined, 'paper')

      expect(result).toHaveLength(2)
      expect(result[0].status).toBe('approved')
      expect(result[1].status).toBe('pending')
    })

    it('should filter banks by status', async () => {
      const mockBanks = [
        {
          id: 'bank-1',
          wallet_id: mockWalletId,
          bank_name: 'Chase Bank',
          account_holder_name: 'John Doe',
          country: 'US',
          currency: 'USD',
          status: 'approved' as const,
          created_at: '2025-01-09T12:00:00Z',
          updated_at: '2025-01-09T12:00:00Z'
        }
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBanks
      })

      const result = await listRecipientBanks(
        mockAccountId,
        mockWalletId,
        { status: 'approved' },
        'paper'
      )

      expect(result).toHaveLength(1)
      expect(result[0].status).toBe('approved')
    })
  })

  describe('deleteRecipientBank', () => {
    it('should delete a recipient bank', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })

      await expect(
        deleteRecipientBank(mockAccountId, mockWalletId, mockBankId, 'paper')
      ).resolves.not.toThrow()

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining(`/v1/accounts/${mockAccountId}/funding_wallets/${mockWalletId}/recipient-banks/${mockBankId}`),
        expect.objectContaining({
          method: 'DELETE'
        })
      )
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        text: async () => JSON.stringify({ error: 'Insufficient funds' })
      })

      await expect(
        createWithdrawal(mockAccountId, mockWalletId, {
          recipient_bank_id: mockBankId,
          amount: '10000.00'
        }, 'paper')
      ).rejects.toThrow('Insufficient funds')
    })

    it('should handle network errors', async () => {
      ;(global.fetch as any).mockRejectedValueOnce(new Error('Network error'))

      await expect(
        getFundingWallet(mockAccountId, mockWalletId, 'paper')
      ).rejects.toThrow('Network error')
    })
  })
})
