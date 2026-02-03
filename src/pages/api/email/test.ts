/**
 * Email Test API Endpoint
 * POST /api/email/test
 * Tests email delivery for all categories
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  sendAuthEmail,
  sendTradingEmail,
  sendSupportEmail,
  getWelcomeEmailTemplate,
  getTradeConfirmationTemplate,
  getSupportInquiryTemplate,
} from '../../../lib/email';

const testEmailSchema = z.object({
  category: z.enum(['auth', 'trading', 'support', 'all']),
  to: z.string().email(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    console.log('📧 Email test endpoint called');
    
    const body = await request.json();
    console.log('Request body:', body);
    
    const { category, to } = testEmailSchema.parse(body);
    console.log(`Testing ${category} email to ${to}`);

    const results: Record<string, any> = {};

    // Test Auth Email
    if (category === 'auth' || category === 'all') {
      console.log('Testing auth email...');
      const { html, text } = getWelcomeEmailTemplate('Test User', 'https://leadtrade.app/verify');
      const result = await sendAuthEmail({
        to,
        subject: 'Test: Welcome to LeadTrade',
        html,
        text,
      });
      console.log('Auth email result:', result);
      results.auth = result;
    }

    // Test Trading Email
    if (category === 'trading' || category === 'all') {
      const { html, text } = getTradeConfirmationTemplate('Test User', {
        symbol: 'AAPL',
        side: 'buy',
        quantity: 10,
        price: 150.25,
        total: 1502.50,
        timestamp: new Date().toISOString(),
        orderId: 'TEST-ORDER-123',
      });
      const result = await sendTradingEmail({
        to,
        subject: 'Test: Trade Confirmation',
        html,
        text,
      });
      results.trading = result;
    }

    // Test Support Email
    if (category === 'support' || category === 'all') {
      const { html, text } = getSupportInquiryTemplate({
        name: 'Test User',
        email: to,
        subject: 'Test Support Inquiry',
        message: 'This is a test support message.',
      });
      const result = await sendSupportEmail({
        to,
        subject: 'Test: Support Inquiry Received',
        html,
        text,
      });
      results.support = result;
    }

    const allSuccessful = Object.values(results).every((r: any) => r.success);

    return new Response(
      JSON.stringify({
        success: allSuccessful,
        results,
      }),
      {
        status: allSuccessful ? 200 : 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email test error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid request data',
          details: error.errors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to test email',
        details: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
