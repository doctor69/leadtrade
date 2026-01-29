/// <reference lib="deno.ns" />

import { serve } from 'https://deno.land/std@0.208.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'
import { 
  processRequest, 
  createSuccessResponse, 
  createErrorResponse,
  AlpacaClient,
  corsHeaders
} from '../_shared/index.ts'

/**
 * Syncs Alpaca account statuses from Alpaca API to local database
 * Should be run daily via cron job
 */
serve(async (req: Request) => {
  return processRequest(req, async () => {
    if (req.method === 'OPTIONS') {
      return new Response('ok', { headers: corsHeaders })
    }

    if (req.method !== 'POST') {
      return createErrorResponse({
        code: 'METHOD_NOT_ALLOWED',
        message: 'Only POST requests are allowed'
      }, 405)
    }

    try {
      console.log('Starting Alpaca account sync...')
      
      // Create Supabase client with service role
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )
      
      // Get all Alpaca accounts from database
      const { data: accounts, error: fetchError } = await supabase
        .from('alpaca_accounts')
        .select('id, user_id, alpaca_account_id, account_type, account_status')
      
      if (fetchError) {
        console.error('Error fetching accounts:', fetchError)
        return createErrorResponse({
          code: 'DB_ERROR',
          message: 'Failed to fetch accounts from database'
        }, 500)
      }
      
      if (!accounts || accounts.length === 0) {
        console.log('No accounts to sync')
        return createSuccessResponse({
          message: 'No accounts to sync',
          synced: 0
        })
      }
      
      console.log(`Found ${accounts.length} accounts to sync`)
      
      const results = []
      let successCount = 0
      let errorCount = 0
      
      // Sync each account
      for (const account of accounts) {
        try {
          console.log(`Syncing account ${account.alpaca_account_id} for user ${account.user_id}`)
          
          // Create Alpaca client with the account's trading mode
          const alpacaClient = new AlpacaClient({
            userId: account.user_id,
            alpacaAccountId: account.alpaca_account_id,
            tradingMode: account.account_type as 'paper' | 'live',
            sessionToken: '',
            isAuthenticated: true,
            alpacaAccessToken: ''
          })
          
          // Fetch account details from Alpaca
          const response = await alpacaClient.brokerRequest(
            `/v1/trading/accounts/${account.alpaca_account_id}/account`
          )
          
          if (!response.success || !response.data) {
            console.error(`Failed to fetch account ${account.alpaca_account_id}:`, response.error)
            errorCount++
            results.push({
              accountId: account.alpaca_account_id,
              success: false,
              error: response.error?.message || 'Failed to fetch from Alpaca'
            })
            continue
          }
          
          const alpacaAccountData = response.data
          const newStatus = alpacaAccountData.status || account.account_status
          
          // Update database if status changed
          if (newStatus !== account.account_status) {
            console.log(`Updating account ${account.alpaca_account_id} status: ${account.account_status} -> ${newStatus}`)
            
            const { error: updateError } = await supabase
              .from('alpaca_accounts')
              .update({ 
                account_status: newStatus,
                updated_at: new Date().toISOString()
              })
              .eq('id', account.id)
            
            if (updateError) {
              console.error(`Failed to update account ${account.alpaca_account_id}:`, updateError)
              errorCount++
              results.push({
                accountId: account.alpaca_account_id,
                success: false,
                error: 'Failed to update database'
              })
              continue
            }
            
            successCount++
            results.push({
              accountId: account.alpaca_account_id,
              success: true,
              oldStatus: account.account_status,
              newStatus: newStatus
            })
          } else {
            console.log(`Account ${account.alpaca_account_id} status unchanged: ${newStatus}`)
            successCount++
            results.push({
              accountId: account.alpaca_account_id,
              success: true,
              status: newStatus,
              changed: false
            })
          }
        } catch (error) {
          console.error(`Error syncing account ${account.alpaca_account_id}:`, error)
          errorCount++
          results.push({
            accountId: account.alpaca_account_id,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
      
      console.log(`Sync completed: ${successCount} successful, ${errorCount} errors`)
      
      return createSuccessResponse({
        message: 'Account sync completed',
        total: accounts.length,
        successful: successCount,
        errors: errorCount,
        results: results
      })
    } catch (error) {
      console.error('Sync error:', error)
      return createErrorResponse({
        code: 'SYNC_ERROR',
        message: error instanceof Error ? error.message : 'Unknown sync error'
      }, 500)
    }
  })
})
