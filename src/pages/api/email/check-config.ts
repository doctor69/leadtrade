/**
 * Check Email Configuration
 * GET /api/email/check-config
 */

import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  const brevoKey = typeof process !== 'undefined' 
    ? process.env.BREVO_API_KEY 
    : import.meta.env.BREVO_API_KEY;
    
  const resendKey = typeof process !== 'undefined' 
    ? process.env.RESEND_API_KEY 
    : import.meta.env.RESEND_API_KEY;

  return new Response(
    JSON.stringify({
      brevo: {
        configured: !!brevoKey,
        keyPrefix: brevoKey ? brevoKey.substring(0, 10) + '...' : 'NOT SET',
        source: typeof process !== 'undefined' && process.env.BREVO_API_KEY ? 'process.env' : 'import.meta.env',
      },
      resend: {
        configured: !!resendKey,
        keyPrefix: resendKey ? resendKey.substring(0, 10) + '...' : 'NOT SET',
        source: typeof process !== 'undefined' && process.env.RESEND_API_KEY ? 'process.env' : 'import.meta.env',
      },
      environment: {
        hasProcess: typeof process !== 'undefined',
        nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : 'N/A',
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
