// @@ .. @@
//  import type { APIRoute } from 'astro';
// +
// +// This API route is disabled for static builds
// +// Authentication is handled client-side via Supabase
// +export const prerender = false;
 
//  export const POST: APIRoute = async ({ request, cookies }) => {
// +  // For static deployment, redirect to client-side auth
// +  return new Response(JSON.stringify({ 
// +    error: 'Server-side auth not available in static deployment',
// +    redirect: '/signin'
// +  }), {
// +    status: 501,
// +    headers: { 'Content-Type': 'application/json' }
// +  });
// +};