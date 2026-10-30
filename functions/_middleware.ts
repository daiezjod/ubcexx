// Global Middleware for Cloudflare Pages Functions
// Provides universal CORS support and guarantees JSON error responses for /api/* routes

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export const onRequest: PagesFunction<any> = async (context) => {
  // Preflight CORS request
  if (context.request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const url = new URL(context.request.url);

  try {
    const response = await context.next();

    // If an /api/ request resulted in an HTML fallback (SPA routing) or 404, prevent HTML from being sent
    if (url.pathname.startsWith('/api/')) {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json') && (response.status === 404 || contentType.includes('text/html'))) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `API route not found: ${context.request.method} ${url.pathname}`,
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      // Add CORS headers to the response
      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        newHeaders.set(k, v);
      });

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  } catch (err: any) {
    if (url.pathname.startsWith('/api/')) {
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message || 'Internal API error',
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );
    }
    throw err;
  }
};
