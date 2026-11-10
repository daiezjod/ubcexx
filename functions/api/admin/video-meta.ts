interface Env {
  DB: D1Database;
}

const corsHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

function parseIsoDuration(iso: string): number {
  if (!iso) return 0;
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return 0;
  const hours = parseInt(match[1] || '0', 10);
  const minutes = parseInt(match[2] || '0', 10);
  const seconds = parseInt(match[3] || '0', 10);
  return hours * 3600 + minutes * 60 + seconds;
}

function formatSecondsToTime(seconds: number): string {
  if (!seconds || seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function decodeHtmlEntities(str: string): string {
  return str
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .trim();
}

function extractMetaTag(html: string, property: string): string {
  const match =
    html.match(new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i')) ||
    html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${property}["']`, 'i'));
  return match && match[1] ? decodeHtmlEntities(match[1]) : '';
}

function extractFromHtml(html: string): { duration_seconds: number; title: string; thumbnail_url: string } {
  let duration_seconds = 0;

  const isoMatch =
    html.match(/(?:itemprop="duration"|content="PT)[^"]*content="(PT[^"]+)"/i) ||
    html.match(/"duration"\s*:\s*"(PT[^"]+)"/i) ||
    html.match(/content="(PT[0-9HMS]+)"/i);

  if (isoMatch && isoMatch[1]) {
    duration_seconds = parseIsoDuration(isoMatch[1]);
  }

  if (!duration_seconds) {
    const ogDuration = extractMetaTag(html, 'og:video:duration');
    if (ogDuration) {
      const parsed = parseInt(ogDuration, 10);
      if (!isNaN(parsed) && parsed > 0) {
        duration_seconds = parsed;
      }
    }
  }

  if (!duration_seconds) {
    const jsonMatch = html.match(/"duration"\s*:\s*(\d+)/i) || html.match(/"totalDuration"\s*:\s*(\d+)/i);
    if (jsonMatch && jsonMatch[1]) {
      let val = parseInt(jsonMatch[1], 10);
      if (val > 100000) {
        val = Math.round(val / 1000);
      }
      if (val > 0) {
        duration_seconds = val;
      }
    }
  }

  let title = extractMetaTag(html, 'og:title') || extractMetaTag(html, 'twitter:title');
  if (!title) {
    const titleTagMatch = html.match(/<title>([^<]+)<\/title>/i);
    if (titleTagMatch && titleTagMatch[1]) {
      title = decodeHtmlEntities(titleTagMatch[1]);
    }
  }

  if (title) {
    title = title
      .replace(/\s*[-—|•]\s*OK\.RU.*$/i, '')
      .replace(/\s*[-—|•]\s*Одноклассники.*$/i, '')
      .trim();
  }

  let thumbnail_url = extractMetaTag(html, 'og:image') || extractMetaTag(html, 'twitter:image');
  if (!thumbnail_url) {
    const thumbMatch = html.match(/"thumbnailUrl"\s*:\s*"([^"]+)"/i) || html.match(/"poster"\s*:\s*"([^"]+)"/i);
    if (thumbMatch && thumbMatch[1]) {
      thumbnail_url = decodeHtmlEntities(thumbMatch[1]);
    }
  }

  return { duration_seconds, title, thumbnail_url };
}

async function handleExtract(context: EventContext<Env, any, any>): Promise<Response> {
  try {
    let videoUrl = '';
    if (context.request.method === 'POST') {
      const body = await context.request.json().catch(() => ({}));
      videoUrl = String(body.url || '').trim();
    } else {
      const parsedUrl = new URL(context.request.url);
      videoUrl = String(parsedUrl.searchParams.get('url') || '').trim();
    }

    if (!videoUrl) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video URL required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const okMatch = videoUrl.match(/(?:video|videoembed|live)\/(\d+)/i) || videoUrl.match(/\/(\d{6,})/);
    const videoId = okMatch ? okMatch[1] : null;

    const urlsToFetch: string[] = [];
    if (videoId) {
      urlsToFetch.push(`https://ok.ru/video/${videoId}`);
      urlsToFetch.push(`https://ok.ru/videoembed/${videoId}`);
    } else {
      urlsToFetch.push(videoUrl);
    }

    const fetchHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9',
    };

    let result = { duration_seconds: 0, title: '', thumbnail_url: '' };

    for (const target of urlsToFetch) {
      try {
        const resp = await fetch(target, {
          headers: fetchHeaders,
          signal: AbortSignal.timeout(6000),
        });

        if (resp.ok) {
          const html = await resp.text();
          const extracted = extractFromHtml(html);
          if (extracted.duration_seconds > 0 || extracted.title || extracted.thumbnail_url) {
            result = {
              duration_seconds: extracted.duration_seconds || result.duration_seconds,
              title: extracted.title || result.title,
              thumbnail_url: extracted.thumbnail_url || result.thumbnail_url,
            };
            if (result.duration_seconds > 0) {
              break;
            }
          }
        }
      } catch {
      }
    }

    const duration = formatSecondsToTime(result.duration_seconds);

    return new Response(
      JSON.stringify({
        success: true,
        duration,
        duration_seconds: result.duration_seconds,
        title: result.title,
        thumbnail_url: result.thumbnail_url,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Metadata extraction failed' }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handleExtract(context);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return handleExtract(context);
};
