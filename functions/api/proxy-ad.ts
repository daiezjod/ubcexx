// Cloudflare Pages Edge Function: /api/proxy-ad
// Server-Side Anti-Adblock Reverse Proxy for Native Ad Networks and VAST Stream Monetization

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, User-Agent, Referer, Accept, X-Requested-With',
      'Access-Control-Max-Age': '86400',
    },
  });
};

export const onRequest: PagesFunction = async (context) => {
  try {
    const reqUrl = new URL(context.request.url);
    let targetUrl = reqUrl.searchParams.get('url') || '';

    // Support JSON body for POST requests if url not in query param
    if (!targetUrl && context.request.method === 'POST') {
      try {
        const body: any = await context.request.json();
        targetUrl = body.url || '';
      } catch {
        // ignore
      }
    }

    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return new Response(JSON.stringify({ error: 'Valid target HTTP/HTTPS URL parameter required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Forward real client headers so the ad network accurately tracks the visitor's country, IP, and device
    const clientIp =
      context.request.headers.get('cf-connecting-ip') ||
      context.request.headers.get('x-real-ip') ||
      context.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      '';

    const userAgent = context.request.headers.get('user-agent') || 'Mozilla/5.0';
    const referer = context.request.headers.get('referer') || 'https://ubcexx-50v.pages.dev/';
    const accept = context.request.headers.get('accept') || '*/*';
    const acceptLanguage = context.request.headers.get('accept-language') || 'en-US,en;q=0.9';

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': userAgent,
      'Referer': referer,
      'Accept': accept,
      'Accept-Language': acceptLanguage,
    };

    if (clientIp) {
      upstreamHeaders['X-Forwarded-For'] = clientIp;
      upstreamHeaders['X-Real-IP'] = clientIp;
      upstreamHeaders['CF-Connecting-IP'] = clientIp;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    const contentType =
      upstreamRes.headers.get('content-type') ||
      (targetUrl.endsWith('.js')
        ? 'application/javascript; charset=utf-8'
        : targetUrl.endsWith('.xml')
        ? 'application/xml; charset=utf-8'
        : 'text/plain; charset=utf-8');

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', contentType);
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    // For script, XML, or HTML text payloads, rewrite nested ad network calls back to proxy
    if (
      contentType.includes('javascript') ||
      contentType.includes('text') ||
      contentType.includes('xml') ||
      contentType.includes('json')
    ) {
      let bodyText = await upstreamRes.text();
      const currentOrigin = reqUrl.origin;

      // Automatically proxy secondary biomanos.org or known ad CDN links
      bodyText = bodyText.replace(/(https?:)?\/\/([a-z0-9-]+\.)?biomanos\.org/gi, (match) => {
        const fullUrl = match.startsWith('http') ? match : `https:${match}`;
        return `${currentOrigin}/api/proxy-ad?url=${encodeURIComponent(fullUrl)}`;
      });

      return new Response(bodyText, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

    // For binary streams (e.g. video files, images, audio)
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: 'Edge ad proxy request failed', details: err?.message || String(err) }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    );
  }
};
