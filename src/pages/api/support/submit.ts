/**
 * Support Inquiry Submission API
 * POST /api/support/submit
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { sendSupportEmail, getSupportInquiryTemplate } from '../../../lib/email';

const inquirySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  subject: z.string().min(1, 'Subject is required'),
  message: z.string().min(10, 'Message must be at least 10 characters'),
  userId: z.string().optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const inquiry = inquirySchema.parse(body);

    // Generate confirmation email for user
    const { html, text } = getSupportInquiryTemplate(inquiry);

    // Send confirmation to user
    const userResult = await sendSupportEmail({
      to: inquiry.email,
      subject: `Support Inquiry Received - ${inquiry.subject}`,
      html,
      text,
    });

    // Notify support team (will be forwarded to Gmail via Cloudflare)
    const supportResult = await sendSupportEmail({
      to: 'support@leadtrade.app',
      subject: `New Support Inquiry: ${inquiry.subject}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #667eea;">New Support Inquiry</h2>
          <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p><strong>From:</strong> ${inquiry.name} (${inquiry.email})</p>
            ${inquiry.userId ? `<p><strong>User ID:</strong> ${inquiry.userId}</p>` : ''}
            <p><strong>Subject:</strong> ${inquiry.subject}</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 15px 0;">
            <p><strong>Message:</strong></p>
            <p style="white-space: pre-wrap;">${inquiry.message}</p>
          </div>
          <p style="font-size: 14px; color: #666;">Reply to this email to respond directly to the user.</p>
        </div>
      `,
      text: `
New Support Inquiry

From: ${inquiry.name} (${inquiry.email})
${inquiry.userId ? `User ID: ${inquiry.userId}` : ''}
Subject: ${inquiry.subject}

Message:
${inquiry.message}

---
Reply to this email to respond directly to the user.
      `.trim(),
      replyTo: inquiry.email,
    });

    return new Response(
      JSON.stringify({
        success: true,
        userEmailSent: userResult.success,
        supportNotified: supportResult.success,
        message: 'Support inquiry submitted successfully',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Support inquiry error:', error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid input',
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
        error: 'Failed to submit support inquiry',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
