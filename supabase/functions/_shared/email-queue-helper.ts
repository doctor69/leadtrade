/**
 * Email Queue Helper
 * Adds emails to queue instead of sending immediately
 * Handles rate limiting across the entire application
 * Supports Resend templates
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'

interface QueueEmailPayload {
  category: 'auth' | 'trading' | 'support' | 'marketing'
  to: string | string[]
  subject?: string // Optional when using templates
  html?: string // Optional when using templates
  text?: string
  scheduledFor?: Date // Optional: schedule for future delivery
  // Resend template support
  templateId?: string
  templateData?: Record<string, any>
}

/**
 * Add email to queue for rate-limited delivery
 * Use this for trading emails (Resend) to avoid rate limits
 */
export async function queueEmail(payload: QueueEmailPayload): Promise<{ success: boolean; queueId?: string; error?: string }> {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    const { data, error } = await supabase
      .from('email_queue')
      .insert({
        category: payload.category,
        to: typeof payload.to === 'string' ? payload.to : JSON.stringify(payload.to),
        subject: payload.subject || null,
        html: payload.html || null,
        text: payload.text,
        template_id: payload.templateId || null,
        template_data: payload.templateData ? JSON.stringify(payload.templateData) : null,
        scheduled_for: payload.scheduledFor?.toISOString() || new Date().toISOString(),
        status: 'pending',
        attempts: 0,
        max_attempts: 3,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Error queueing email:', error)
      return { success: false, error: error.message }
    }

    return { success: true, queueId: data.id }
  } catch (error) {
    console.error('Error queueing email:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Send email immediately or queue based on category
 * - Trading emails: queued (Resend rate limit)
 * - Other emails: sent immediately (Brevo has high rate limit)
 */
export async function sendOrQueueEmail(
  payload: QueueEmailPayload,
  sendEmailFn: (payload: any) => Promise<{ success: boolean; messageId?: string; error?: string }>
): Promise<{ success: boolean; messageId?: string; queueId?: string; error?: string; queued: boolean }> {
  
  // Queue trading emails to handle Resend rate limits
  if (payload.category === 'trading') {
    const result = await queueEmail(payload)
    return {
      ...result,
      queued: true,
    }
  }

  // Send other emails immediately (Brevo has 1000 req/sec limit)
  const result = await sendEmailFn(payload)
  return {
    ...result,
    queued: false,
  }
}
