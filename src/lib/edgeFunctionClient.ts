// Edge Function API Client for Supabase Edge Functions
export interface EdgeFunctionResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp?: string;
}

export interface EdgeFunctionRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  body?: any;
  params?: Record<string, string>;
  retries?: number;
  timeout?: number;
  requireAuth?: boolean;
}

class EdgeFunctionClient {
  private baseUrl: string;
  private defaultTimeout: number = 10000; // 10 seconds
  private defaultRetries: number = 3;

  constructor() {
    // Get Supabase URL from environment
    this.baseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
    
    if (!this.baseUrl) {
      throw new Error('PUBLIC_SUPABASE_URL environment variable is required');
    }
    
    if (!import.meta.env.PUBLIC_SUPABASE_ANON_KEY) {
      throw new Error('PUBLIC_SUPABASE_ANON_KEY environment variable is required');
    }
  }

  /**
   * Get authentication headers for Edge Function requests
   */
  private async getAuthHeaders(requireAuth: boolean = true): Promise<Headers> {
    const headers = new Headers({
      'Content-Type': 'application/json',
    });

    // For functions that don't require user authentication (like signup), use anon key
    if (!requireAuth) {
      headers.set('Authorization', `Bearer ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY}`);
      return headers;
    }

    // Get access token from Supabase auth (only in browser environment)
    if (typeof window !== 'undefined') {
      try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(
          import.meta.env.PUBLIC_SUPABASE_URL!,
          import.meta.env.PUBLIC_SUPABASE_ANON_KEY!
        );

        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 EdgeFunction auth debug:', {
          hasSession: !!session,
          hasAccessToken: !!session?.access_token,
          tokenPreview: session?.access_token?.substring(0, 20) + '...',
          expiresAt: session?.expires_at
        });
        
        if (session?.access_token) {
          headers.set('Authorization', `Bearer ${session.access_token}`);
        } else {
          console.warn('⚠️ No session found, using anon key');
          // Fallback to anon key if no user session
          headers.set('Authorization', `Bearer ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY}`);
        }
      } catch (error) {
        console.warn('Failed to get auth session:', error);
        // Fallback to anon key
        headers.set('Authorization', `Bearer ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY}`);
      }
    } else {
      // Server-side: always use anon key
      headers.set('Authorization', `Bearer ${import.meta.env.PUBLIC_SUPABASE_ANON_KEY}`);
    }

    return headers;
  }

  /**
   * Make a request to a Supabase Edge Function
   */
  async request<T = any>(
    functionName: string,
    options: EdgeFunctionRequestOptions = {}
  ): Promise<EdgeFunctionResponse<T>> {
    const {
      method = 'GET',
      body,
      params,
      retries = this.defaultRetries,
      timeout = this.defaultTimeout,
      requireAuth = true
    } = options;

    const url = new URL(`${this.baseUrl}/functions/v1/${functionName}`);
    
    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const headers = await this.getAuthHeaders(requireAuth);
        
        // Debug logging for signup requests
        if (functionName === 'signup') {
          console.log('🔍 Signup request debug:', {
            functionName,
            requireAuth,
            hasAuthHeader: headers.has('Authorization'),
            authHeaderValue: headers.get('Authorization')?.substring(0, 20) + '...',
            url: url.toString()
          });
        }
        
        const requestOptions: RequestInit = {
          method,
          headers,
          signal: AbortSignal.timeout(timeout),
        };

        if (body && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
          requestOptions.body = JSON.stringify(body);
        }

        const response = await fetch(url.toString(), requestOptions);

        // Debug logging for signup responses
        if (functionName === 'signup') {
          console.log('🔍 Signup response debug:', {
            status: response.status,
            statusText: response.statusText,
            headers: Object.fromEntries(response.headers.entries())
          });
        }

        // Handle non-JSON responses
        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          const text = await response.text();
          console.error('Non-JSON response:', text);
          throw new Error(`Non-JSON response (${response.status}): ${text}`);
        }

        const result = await response.json();
        
        // Debug logging for signup results
        if (functionName === 'signup') {
          console.log('🔍 Signup result debug:', {
            success: result.success,
            error: result.error,
            hasData: !!result.data
          });
        }

        // Check if the response indicates success
        if (response.ok && result.success !== false) {
          return {
            success: true,
            data: result.data || result,
            timestamp: result.timestamp || new Date().toISOString()
          };
        } else {
          // Handle error response
          return {
            success: false,
            error: {
              code: result.error?.code || 'UNKNOWN_ERROR',
              message: result.error?.message || result.error || 'Unknown error occurred',
              details: result.error?.details
            },
            timestamp: result.timestamp || new Date().toISOString()
          };
        }
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError') {
            return {
              success: false,
              error: {
                code: 'TIMEOUT',
                message: 'Request timed out',
                details: { timeout }
              }
            };
          }
          
          if (error.message.includes('401') || error.message.includes('403')) {
            return {
              success: false,
              error: {
                code: 'AUTHENTICATION_FAILED',
                message: 'Authentication failed',
                details: { error: error.message }
              }
            };
          }
        }

        // If this is the last attempt, return the error
        if (attempt === retries) {
          return {
            success: false,
            error: {
              code: 'REQUEST_FAILED',
              message: lastError?.message || 'Request failed after retries',
              details: { 
                attempts: attempt + 1,
                originalError: lastError?.message 
              }
            }
          };
        }

        // Wait before retrying (exponential backoff)
        if (attempt < retries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 5000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // This should never be reached, but TypeScript requires it
    return {
      success: false,
      error: {
        code: 'UNKNOWN_ERROR',
        message: 'Unexpected error occurred'
      }
    };
  }

  /**
   * Convenience methods for common HTTP methods
   */
  async get<T = any>(functionName: string, params?: Record<string, string>, requireAuth: boolean = true): Promise<EdgeFunctionResponse<T>> {
    return this.request<T>(functionName, { method: 'GET', params, requireAuth });
  }

  async post<T = any>(functionName: string, body?: any, params?: Record<string, string>, requireAuth: boolean = true): Promise<EdgeFunctionResponse<T>> {
    return this.request<T>(functionName, { method: 'POST', body, params, requireAuth });
  }

  async put<T = any>(functionName: string, body?: any, params?: Record<string, string>, requireAuth: boolean = true): Promise<EdgeFunctionResponse<T>> {
    return this.request<T>(functionName, { method: 'PUT', body, params, requireAuth });
  }

  async delete<T = any>(functionName: string, params?: Record<string, string>, requireAuth: boolean = true): Promise<EdgeFunctionResponse<T>> {
    return this.request<T>(functionName, { method: 'DELETE', params, requireAuth });
  }

  async patch<T = any>(functionName: string, body?: any, params?: Record<string, string>, requireAuth: boolean = true): Promise<EdgeFunctionResponse<T>> {
    return this.request<T>(functionName, { method: 'PATCH', body, params, requireAuth });
  }
}

// Export singleton instance
export const edgeFunctionClient = new EdgeFunctionClient();
export default edgeFunctionClient; 