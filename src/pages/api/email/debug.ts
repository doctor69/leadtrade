/**
 * Debug Email Configuration
 * GET /api/email/debug
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
        source: typeof process !== 'undefined' && process.env.BREVO_API_KEY ? 'process.env' : 'import.meta.env',
        prefix: brevoKey ? brevoKey.substring(0, 10) + '...' : 'NOT SET',
      },
      resend: {
        configured: !!resendKey,
        source: typeof process !== 'undefined' && process.env.RESEND_API_KEY ? 'process.env' : 'import.meta.env',
        prefix: resendKey ? resendKey.substring(0, 5) + '...' : 'NOT SET',
      },
      env: {
        NODE_ENV: process.env.NODE_ENV || import.meta.env.NODE_ENV,
        hasProcess: typeof process !== 'undefined',
      }
    }, null, 2),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
};
