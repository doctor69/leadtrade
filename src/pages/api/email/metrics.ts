/**
 * Email Metrics API Endpoint
 * GET /api/email/metrics
 */

import type { APIRoute } from 'astro';
import { emailMonitor } from '../../../lib/email/monitoring';

export const GET: APIRoute = async () => {
  try {
    const metrics = emailMonitor.getMetrics();
    const report = emailMonitor.generateReport();

    return new Response(
      JSON.stringify({
        success: true,
        metrics,
        report,
        healthy: emailMonitor.isHealthy(),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Metrics error:', error);

    return new Response(
      JSON.stringify({
        success: false,
        error: 'Failed to retrieve metrics',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
