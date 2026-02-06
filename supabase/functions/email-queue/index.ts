/**
 * Centralized Email Queue Edge Function
 * Handles rate limiting across all email sends app-wide
 * Supports Resend templates
 * 
 * Rate Limits:
 * - Resend: 2 requests/second
 * - Brevo: 1000 requests/second (no queue needed)
 * 
 * This function processes emails from a queue table and respects rate limits
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import { corsHeaders } from '../_shared/cors.ts'
import { sendEmail } from '../_shared/email-helper.ts'

interface QueuedEmail {
  id: string
  category: 'auth' | 'trading' | 'support' | 'marketing'
  to: string | string[]
  subject?: string
  html?: string
  text?: string
  template_id?: string
  template_data?: any
  status: 'pending' | 'processing' | 'sent' | 'failed'
  attempts: number
  max_attempts: number
  error?: string
  created_at: string
  scheduled_for?: string
}

const RESEND_RATE_LIMIT = 2 // requests per second
const RESEND_DELAY = 600 // ms between requests (slightly more than 500ms for safety)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // First, let's see what's in the queue
    const { data: allEmails, error: allError } = await supabase
      .from('email_queue')
      .select('id, status, category, scheduled_for, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    console.log('📊 Email queue status (last 20):')
    if (allEmails) {
      console.log(JSON.stringify(allEmails, null, 2))
    }

    // Get pending emails from queue (only trading emails need rate limiting)
    const { data: pendingEmails, error: fetchError } = await supabase
      .from('email_queue')
      .select('*')
      .in('status', ['pending', 'failed']) // Process both pending and failed emails
      .eq('category', 'trading') // Only queue trading emails (Resend)
      .lte('scheduled_for', new Date().toISOString())
      .lt('attempts', 500) // Only process if attempts < max_attempts
      .order('created_at', { ascending: true })
      .limit(10) // Process 10 at a time

    console.log('🔍 Query for pending/failed emails:', {
      status: ['pending', 'failed'],
      category: 'trading',
      scheduled_for_lte: new Date().toISOString(),
      attempts_lt: 500,
      found: pendingEmails?.length || 0
    })

    if (fetchError) {
      console.error('Error fetching emails:', fetchError)
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to fetch emails' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!pendingEmails || pendingEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, message: 'No emails to process' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processed = 0
    let failed = 0

    for (const email of pendingEmails) {
      // Mark as processing
      await supabase
        .from('email_queue')
        .update({ status: 'processing' })
        .eq('id', email.id)

      // Parse JSON fields from database
      const parsedTo = typeof email.to === 'string' && email.to.startsWith('[') 
        ? JSON.parse(email.to) 
        : email.to;
      
      const parsedTemplateData = email.template_data && typeof email.template_data === 'string'
        ? JSON.parse(email.template_data)
        : email.template_data;

      // Send email
      const result = await sendEmail({
        category: email.category,
        to: parsedTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
        templateId: email.template_id,
        templateData: parsedTemplateData,
      })

      if (result.success) {
        // Mark as sent
        await supabase
          .from('email_queue')
          .update({
            status: 'sent',
            error: null,
          })
          .eq('id', email.id)
        
        processed++
      } else {
        // Increment attempts and mark as failed or pending for retry
        const newAttempts = email.attempts + 1
        const newStatus = newAttempts >= email.max_attempts ? 'failed' : 'pending'
        
        await supabase
          .from('email_queue')
          .update({
            status: newStatus,
            attempts: newAttempts,
            error: result.error,
            scheduled_for: new Date(Date.now() + 60000).toISOString(), // Retry in 1 minute
          })
          .eq('id', email.id)
        
        failed++
      }

      // Rate limiting: wait between emails
      if (email.category === 'trading') {
        await new Promise(resolve => setTimeout(resolve, RESEND_DELAY))
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        failed,
        total: pendingEmails.length,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Email queue error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
