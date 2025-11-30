import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  corsHeaders
} from '../_shared/index.ts'

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return handleCors(req)
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )
    const url = new URL(req.url)
    const action = url.pathname.split('/').pop()

    if (req.method === 'POST' && action === 'signin') {
      const { email, password, returnUrl } = await req.json()

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        return createErrorResponse(`Authentication failed: ${error.message}`, 401)
      }

      if (!data.session) {
        return createErrorResponse('No session created', 401)
      }

      return createSuccessResponse({
        success: true,
        session: data.session,
        returnUrl: returnUrl || '/dashboard'
      })
    }

    if (req.method === 'POST' && action === 'signout') {
      const authHeader = req.headers.get('Authorization')
      if (!authHeader) {
        return createErrorResponse('No authorization header', 401)
      }

      const supabaseWithAuth = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: { headers: { Authorization: authHeader } }
        }
      )

      const { error } = await supabaseWithAuth.auth.signOut()

      if (error) {
        return createErrorResponse(error.message, 400)
      }

      return createSuccessResponse({ success: true })
    }

    return createErrorResponse('Method not allowed', 405)

  } catch (error) {
    console.error('Auth function error:', error)
    return createErrorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
})