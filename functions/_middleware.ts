import { applyGeoDecoyHeaders, getRandomPhantomGeo } from './api/_geoDecoy.ts';

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

export const onRequest: PagesFunction<any> = async (context) => {
  if (context.request.method === 'OPTIONS') {
    const optHeaders = new Headers(corsHeaders);
    applyGeoDecoyHeaders(optHeaders);
    return new Response(null, {
      status: 204,
      headers: optHeaders,
    });
  }

  const url = new URL(context.request.url);

  if (url.pathname === '/api/admin/probe' || url.pathname === '/api/admin/trace') {
    const probeHeaders = new Headers({
      'Content-Type': 'application/json',
      ...corsHeaders,
    });
    const phantom = applyGeoDecoyHeaders(probeHeaders);
    return new Response(
      JSON.stringify({
        shield: 'UBCEXX Multi-Country Phantom Geo-Decoy Active',
        status: 'anonymized',
        node: probeHeaders.get('X-Edge-Routing-Node'),
        geo: {
          country: phantom.name,
          iso: phantom.code,
          city: phantom.city,
          edge_pop: phantom.pop,
          asn: phantom.asn,
        },
        decoy_route: probeHeaders.get('X-Decoy-Route'),
        trace: 'obfuscated-multi-hop-edge',
        timestamp: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: probeHeaders,
      }
    );
  }

  try {
    const response = await context.next();

    if (url.pathname.startsWith('/api/')) {
      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('application/json') && (response.status === 404 || contentType.includes('text/html'))) {
        const notFoundHeaders = new Headers({
          'Content-Type': 'application/json',
          ...corsHeaders,
        });
        applyGeoDecoyHeaders(notFoundHeaders);
        return new Response(
          JSON.stringify({
            success: false,
            error: `API route not found: ${context.request.method} ${url.pathname}`,
          }),
          {
            status: 404,
            headers: notFoundHeaders,
          }
        );
      }

      const newHeaders = new Headers(response.headers);
      Object.entries(corsHeaders).forEach(([k, v]) => {
        newHeaders.set(k, v);
      });
      applyGeoDecoyHeaders(newHeaders);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    }

    return response;
  } catch (err: any) {
    if (url.pathname.startsWith('/api/')) {
      const errHeaders = new Headers({
        'Content-Type': 'application/json',
        ...corsHeaders,
      });
      applyGeoDecoyHeaders(errHeaders);
      return new Response(
        JSON.stringify({
          success: false,
          error: err.message || 'Internal API error',
        }),
        {
          status: 500,
          headers: errHeaders,
        }
      );
    }
    throw err;
  }
};
