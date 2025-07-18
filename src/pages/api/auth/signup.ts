// @@ .. @@
//  import type { APIRoute } from 'astro';
// +
// +// This API route is disabled for static builds
// +// Account creation is handled client-side via Supabase
// +export const prerender = false;
 
//  export const POST: APIRoute = async ({ request }) => {
// +  // For static deployment, redirect to client-side auth
// +  return new Response(JSON.stringify({ 
// +    error: 'Server-side signup not available in static deployment',
// +    redirect: '/signup'
// +  }), {
// +    status: 501,
// +    headers: { 'Content-Type': 'application/json' }
// +  });
// +};