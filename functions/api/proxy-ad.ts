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

    if (!targetUrl && context.request.method === 'POST') {
      try {
        const body: any = await context.request.json();
        targetUrl = body.url || '';
      } catch {
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

    const reqRange = context.request.headers.get('range');
    if (reqRange) {
      upstreamHeaders['Range'] = reqRange;
    }

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

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      responseHeaders.set('Content-Range', contentRange);
    }
    const acceptRanges = upstreamRes.headers.get('accept-ranges');
    if (acceptRanges) {
      responseHeaders.set('Accept-Ranges', acceptRanges);
    }
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      responseHeaders.set('Content-Length', contentLength);
    }
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');

    if (
      contentType.includes('javascript') ||
      contentType.includes('text') ||
      contentType.includes('xml') ||
      contentType.includes('json')
    ) {
      let bodyText = await upstreamRes.text();
      const currentOrigin = reqUrl.origin;

      const partnerDomain = atob('YmlvbWFub3Mub3Jn');
      const partnerRegex = new RegExp(`(https?:)?\\/\\/([a-z0-9-]+\\.)?${partnerDomain.replace('.', '\\.')}`, 'gi');
      bodyText = bodyText.replace(partnerRegex, (match) => {
        const fullUrl = match.startsWith('http') ? match : `https:${match}`;
        return `${currentOrigin}/api/proxy-ad?url=${encodeURIComponent(fullUrl)}`;
      });

      return new Response(bodyText, {
        status: upstreamRes.status,
        headers: responseHeaders,
      });
    }

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
