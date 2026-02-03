/**
 * Email Send API Endpoint
 * POST /api/email/send
 */

import type { APIRoute } from 'astro';
import { z } from 'zod';
import { sendEmail } from '../../../lib/email';
import type { EmailCategory } from '../../../lib/email/types';

const sendEmailSchema = z.object({
  category: z.enum(['auth', 'trading', 'support', 'marketing']),
  to: z.union([z.string().email(), z.array(z.string().email())]),
  subject: z.string().min(1),
  html: z.string().min(1),
  text: z.string().optional(),
  replyTo: z.string().email().optional(),
  cc: z.array(z.string().email()).optional(),
  bcc: z.array(z.string().email()).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const validated = sendEmailSchema.parse(body);

    const result = await sendEmail(validated.category as EmailCategory, {
      to: validated.to,
      subject: validated.subject,
      html: validated.html,
      text: validated.text,
      replyTo: validated.replyTo,
      cc: validated.cc,
      bcc: validated.bcc,
    });

    if (!result.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: result.error,
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        messageId: result.messageId,
        provider: result.provider,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email send error:', error);

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
        error: 'Failed to send email',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
