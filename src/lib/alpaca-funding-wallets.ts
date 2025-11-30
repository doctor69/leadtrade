import { z } from 'zod'

// Zod Schemas for validation
export const FundingWalletSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  currency: z.string(),
  balance: z.string(),
  available_balance: z.string(),
  pending_balance: z.string(),
  status: z.enum(['active', 'inactive', 'pending']),
  created_at: z.string(),
  updated_at: z.string()
})

export const CreateFundingWalletSchema = z.object({
  currency: z.string().min(3).max(3), // ISO 4217 currency code
  nickname: z.string().optional()
})

export const PaymentInstructionSchema = z.object({
  type: z.enum(['priority', 'regular']),
  bank_name: z.string(),
  bank_address: z.string().optional(),
  account_number: z.string().optional(),
  routing_number: z.string().optional(),
  swift_code: z.string().optional(),
  iban: z.string().optional(),
  reference: z.string(),
  additional_instructions: z.string().optional()
})

export const PaymentInstructionsSchema = z.object({
  wallet_id: z.string(),
  currency: z.string(),
  priority: PaymentInstructionSchema,
  regular: PaymentInstructionSchema
})

export const RecipientBankSchema = z.object({
  id: z.string(),
  wallet_id: z.string(),
  bank_name: z.string(),
  bank_address: z.string().optional(),
  account_holder_name: z.string(),
  account_number: z.string().optional(),
  routing_number: z.string().optional(),
  swift_code: z.string().optional(),
  iban: z.string().optional(),
  country: z.string(),
  currency: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  created_at: z.string(),
  updated_at: z.string()
})

export const CreateRecipientBankSchema = z.object({
  bank_name: z.string(),
  bank_address: z.string().optional(),
  account_holder_name: z.string(),
  account_number: z.string().optional(),
  routing_number: z.string().optional(),
  swift_code: z.string().optional(),
  iban: z.string().optional(),
  country: z.string().min(2).max(2), // ISO 3166-1 alpha-2
  currency: z.string().min(3).max(3) // ISO 4217
})

export const WithdrawalSchema = z.object({
  id: z.string(),
  wallet_id: z.string(),
  recipient_bank_id: z.string(),
  amount: z.string(),
  currency: z.string(),
  converted_amount: z.string().optional(),
  converted_currency: z.string().optional(),
  exchange_rate: z.string().optional(),
  fee: z.string(),
  status: z.enum(['pending', 'processing', 'completed', 'failed', 'canceled']),
  created_at: z.string(),
  completed_at: z.string().optional()
})

export const CreateWithdrawalSchema = z.object({
  recipient_bank_id: z.string(),
  amount: z.string(),
  currency: z.string().optional(), // Target currency for conversion
  note: z.string().optional()
})

// TypeScript Types
export type FundingWallet = z.infer<typeof FundingWalletSchema>
export type CreateFundingWallet = z.infer<typeof CreateFundingWalletSchema>
export type PaymentInstruction = z.infer<typeof PaymentInstructionSchema>
export type PaymentInstructions = z.infer<typeof PaymentInstructionsSchema>
export type RecipientBank = z.infer<typeof RecipientBankSchema>
export type CreateRecipientBank = z.infer<typeof CreateRecipientBankSchema>
export type Withdrawal = z.infer<typeof WithdrawalSchema>
export type CreateWithdrawal = z.infer<typeof CreateWithdrawalSchema>

// API Client Functions
import { getAlpacaConfig } from './trading-config'

async function makeAlpacaRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<T> {
  const config = getAlpacaConfig(tradingMode)

  const headers = {
    'Content-Type': 'application/json',
    'APCA-API-KEY-ID': config.brokerApiKey,
    'APCA-API-SECRET-KEY': config.brokerApiSecret,
    ...options.headers
  }

  const response = await fetch(`${config.brokerBaseUrl}${endpoint}`, {
    ...options,
    headers
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = 'Request failed'
    try {
      const errorData = JSON.parse(errorText)
      errorMessage = errorData.message || errorData.error || errorMessage
    } catch {
      errorMessage = `HTTP ${response.status}: ${response.statusText}`
    }
    throw new Error(errorMessage)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T
  }

  return response.json()
}

/**
 * Create a new funding wallet for multi-currency support
 */
export async function createFundingWallet(
  accountId: string,
  data: CreateFundingWallet,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<FundingWallet> {
  const validated = CreateFundingWalletSchema.parse(data)

  const result = await makeAlpacaRequest<FundingWallet>(
    `/v1/accounts/${accountId}/funding_wallets`,
    {
      method: 'POST',
      body: JSON.stringify(validated)
    },
    tradingMode
  )

  return FundingWalletSchema.parse(result)
}

/**
 * Get details of a specific funding wallet
 */
export async function getFundingWallet(
  accountId: string,
  walletId: string,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<FundingWallet> {
  const result = await makeAlpacaRequest<FundingWallet>(
    `/v1/accounts/${accountId}/funding_wallets/${walletId}`,
    {
      method: 'GET'
    },
    tradingMode
  )

  return FundingWalletSchema.parse(result)
}

/**
 * List all funding wallets for an account
 */
export async function listFundingWallets(
  accountId: string,
  options?: {
    currency?: string
  },
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<FundingWallet[]> {
  const params = new URLSearchParams()
  if (options?.currency) params.append('currency', options.currency)

  const queryString = params.toString()
  const endpoint = `/v1/accounts/${accountId}/funding_wallets${queryString ? `?${queryString}` : ''}`

  const result = await makeAlpacaRequest<FundingWallet[]>(
    endpoint,
    {
      method: 'GET'
    },
    tradingMode
  )

  return z.array(FundingWalletSchema).parse(result)
}

/**
 * Get payment instructions for depositing funds into a wallet
 */
export async function getPaymentInstructions(
  accountId: string,
  walletId: string,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<PaymentInstructions> {
  const result = await makeAlpacaRequest<PaymentInstructions>(
    `/v1/accounts/${accountId}/funding_wallets/${walletId}/payment-instructions`,
    {
      method: 'GET'
    },
    tradingMode
  )

  return PaymentInstructionsSchema.parse(result)
}

/**
 * Create a withdrawal from a funding wallet
 */
export async function createWithdrawal(
  accountId: string,
  walletId: string,
  data: CreateWithdrawal,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<Withdrawal> {
  const validated = CreateWithdrawalSchema.parse(data)

  const result = await makeAlpacaRequest<Withdrawal>(
    `/v1/accounts/${accountId}/funding_wallets/${walletId}/withdrawals`,
    {
      method: 'POST',
      body: JSON.stringify(validated)
    },
    tradingMode
  )

  return WithdrawalSchema.parse(result)
}

/**
 * Add a recipient bank for withdrawals
 */
export async function createRecipientBank(
  accountId: string,
  walletId: string,
  data: CreateRecipientBank,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<RecipientBank> {
  const validated = CreateRecipientBankSchema.parse(data)

  const result = await makeAlpacaRequest<RecipientBank>(
    `/v1/accounts/${accountId}/funding_wallets/${walletId}/recipient-banks`,
    {
      method: 'POST',
      body: JSON.stringify(validated)
    },
    tradingMode
  )

  return RecipientBankSchema.parse(result)
}

/**
 * List recipient banks for a funding wallet
 */
export async function listRecipientBanks(
  accountId: string,
  walletId: string,
  options?: {
    status?: 'pending' | 'approved' | 'rejected'
  },
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<RecipientBank[]> {
  const params = new URLSearchParams()
  if (options?.status) params.append('status', options.status)

  const queryString = params.toString()
  const endpoint = `/v1/accounts/${accountId}/funding_wallets/${walletId}/recipient-banks${queryString ? `?${queryString}` : ''}`

  const result = await makeAlpacaRequest<RecipientBank[]>(
    endpoint,
    {
      method: 'GET'
    },
    tradingMode
  )

  return z.array(RecipientBankSchema).parse(result)
}

/**
 * Delete a recipient bank
 */
export async function deleteRecipientBank(
  accountId: string,
  walletId: string,
  bankId: string,
  tradingMode: 'paper' | 'live' = 'paper'
): Promise<void> {
  await makeAlpacaRequest<void>(
    `/v1/accounts/${accountId}/funding_wallets/${walletId}/recipient-banks/${bankId}`,
    {
      method: 'DELETE'
    },
    tradingMode
  )
}
