// Alpaca Instant Funding (JIT) Service
import { z } from 'zod';

// Validation schemas
export const InstantFundingStatusSchema = z.enum(['pending', 'approved', 'rejected', 'settled']);
export const ReportTypeSchema = z.enum(['outstanding', 'settled', 'interest']);

export const InstantFundingSchema = z.object({
  id: z.string(),
  account_id: z.string(),
  amount: z.string(),
  status: InstantFundingStatusSchema,
  created_at: z.string(),
  updated_at: z.string(),
  settled_at: z.string().optional(),
  interest_amount: z.string().optional(),
  days_overdue: z.number().optional()
});

export const CreateInstantFundingSchema = z.object({
  account_id: z.string(),
  amount: z.string()
});

export const CreateSettlementSchema = z.object({
  funding_id: z.string(),
  amount: z.string()
});

// TypeScript types
export type InstantFundingStatus = z.infer<typeof InstantFundingStatusSchema>;
export type ReportType = z.infer<typeof ReportTypeSchema>;
export type InstantFunding = z.infer<typeof InstantFundingSchema>;
export type CreateInstantFundingRequest = z.infer<typeof CreateInstantFundingSchema>;
export type CreateSettlementRequest = z.infer<typeof CreateSettlementSchema>;

export const InstantFundingLimitsSchema = z.object({
  account_id: z.string(),
  max_amount: z.string(),
  available_amount: z.string(),
  outstanding_amount: z.string(),
  daily_limit: z.string(),
  daily_used: z.string()
});

export const InstantFundingReportRecordSchema = z.object({
  account_id: z.string(),
  account_number: z.string(),
  funding_id: z.string(),
  amount: z.string(),
  status: z.string(),
  created_at: z.string(),
  settled_at: z.string().optional(),
  interest_amount: z.string().optional(),
  days_overdue: z.number().optional()
});

export const InstantFundingReportSchema = z.object({
  report_type: ReportTypeSchema,
  system_date: z.string(),
  account_no: z.string().optional(),
  records: z.array(InstantFundingReportRecordSchema)
});

export type InstantFundingLimits = z.infer<typeof InstantFundingLimitsSchema>;
export type InstantFundingReport = z.infer<typeof InstantFundingReportSchema>;
export type InstantFundingReportRecord = z.infer<typeof InstantFundingReportRecordSchema>;

/**
 * Creates an instant funding request (JIT funding)
 * Provides immediate buying power before ACH transfer completes
 * 
 * Requirements: 12.1 - Instant funding request creation
 */
export async function createInstantFunding(
  fundingData: CreateInstantFundingRequest
): Promise<{ success: boolean; funding?: InstantFunding; error?: string }> {
  try {
    // Validate input
    const validation = CreateInstantFundingSchema.safeParse(fundingData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid funding data'
      };
    }

    const amount = parseFloat(fundingData.amount);
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        error: 'amount must be a positive number'
      };
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-instant-funding`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(fundingData),
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to create instant funding request'
      };
    }

    // Validate response
    const fundingValidation = InstantFundingSchema.safeParse(result);
    if (!fundingValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      funding: fundingValidation.data
    };
  } catch (error) {
    console.error('Error creating instant funding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Retrieves instant funding limits for an account
 * 
 * Requirements: 12.2 - Instant funding limits retrieval
 */
export async function getInstantFundingLimits(): Promise<{ 
  success: boolean; 
  limits?: InstantFundingLimits; 
  error?: string 
}> {
  try {
    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-instant-funding/limits`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to retrieve instant funding limits'
      };
    }

    // Validate response
    const limitsValidation = InstantFundingLimitsSchema.safeParse(result);
    if (!limitsValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      limits: limitsValidation.data
    };
  } catch (error) {
    console.error('Error retrieving instant funding limits:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Generates instant funding reports
 * 
 * Requirements: 12.3 - Instant funding report generation
 */
export async function generateInstantFundingReport(
  reportType: ReportType,
  systemDate: string,
  accountNo?: string
): Promise<{ success: boolean; report?: InstantFundingReport; error?: string }> {
  try {
    if (!reportType || !systemDate) {
      return {
        success: false,
        error: 'report_type and system_date are required'
      };
    }

    // Validate report type
    const reportTypeValidation = ReportTypeSchema.safeParse(reportType);
    if (!reportTypeValidation.success) {
      return {
        success: false,
        error: 'report_type must be one of: outstanding, settled, interest'
      };
    }

    const queryParams = new URLSearchParams({
      report_type: reportType,
      system_date: systemDate
    });

    if (accountNo) {
      queryParams.append('account_no', accountNo);
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-instant-funding/reports?${queryParams.toString()}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to generate instant funding report'
      };
    }

    // Validate response
    const reportValidation = InstantFundingReportSchema.safeParse(result);
    if (!reportValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      report: reportValidation.data
    };
  } catch (error) {
    console.error('Error generating instant funding report:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Creates a settlement for instant funding
 * Used for reconciliation when ACH transfer completes
 * 
 * Requirements: 12.4 - Instant funding settlement reconciliation
 */
export async function createInstantFundingSettlement(
  settlementData: CreateSettlementRequest
): Promise<{ success: boolean; settlement?: any; error?: string }> {
  try {
    // Validate input
    const validation = CreateSettlementSchema.safeParse(settlementData);
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.errors[0]?.message || 'Invalid settlement data'
      };
    }

    const amount = parseFloat(settlementData.amount);
    if (isNaN(amount) || amount <= 0) {
      return {
        success: false,
        error: 'amount must be a positive number'
      };
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-instant-funding/settlements`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settlementData),
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to create settlement'
      };
    }

    return {
      success: true,
      settlement: result
    };
  } catch (error) {
    console.error('Error creating settlement:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Calculates interest for overdue instant funding
 * 
 * Requirements: 12.5 - Interest calculation for overdue funding
 */
export function calculateInstantFundingInterest(
  principalAmount: number,
  daysOverdue: number,
  annualInterestRate: number = 0.08 // Default 8% APR
): number {
  if (daysOverdue <= 0) {
    return 0;
  }

  // Simple interest calculation: Principal × Rate × (Days / 365)
  const dailyRate = annualInterestRate / 365;
  const interest = principalAmount * dailyRate * daysOverdue;
  
  return Math.round(interest * 100) / 100; // Round to 2 decimal places
}

/**
 * Gets details of a specific instant funding request
 */
export async function getInstantFunding(
  fundingId: string
): Promise<{ success: boolean; funding?: InstantFunding; error?: string }> {
  try {
    if (!fundingId) {
      return {
        success: false,
        error: 'funding_id is required'
      };
    }

    const edgeFunctionUrl = `${import.meta.env.PUBLIC_SUPABASE_URL}/functions/v1/alpaca-instant-funding/${fundingId}`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include'
    });

    const result = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: result.error || 'Failed to retrieve instant funding'
      };
    }

    // Validate response
    const fundingValidation = InstantFundingSchema.safeParse(result);
    if (!fundingValidation.success) {
      return {
        success: false,
        error: 'Invalid response from server'
      };
    }

    return {
      success: true,
      funding: fundingValidation.data
    };
  } catch (error) {
    console.error('Error retrieving instant funding:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
