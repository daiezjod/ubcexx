import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { d1DB } from './src/db/d1Engine.ts';
import { getRandomPhantomGeo, generatePhantomRay } from './functions/api/_geoDecoy.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }

  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
}

function getHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return '0.0.0.0';
}

const app = express();
const PORT = getPort();
const HOST = getHost();

app.disable('x-powered-by');
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const phantom = getRandomPhantomGeo();
  const phantomRay = generatePhantomRay(phantom.pop);
  const nodeId = `phantom-relay-${phantom.code}-${Math.floor(Math.random() * 900000 + 100000).toString(16)}`;

  res.setHeader('Server', 'Cloudflare-Phantom-Edge/2.4');
  res.setHeader('CF-IPCountry', phantom.code);
  res.setHeader('CF-Ray', phantomRay);
  res.setHeader('X-Phantom-Geo-Country', phantom.name);
  res.setHeader('X-Phantom-Geo-ISO', phantom.code);
  res.setHeader('X-Phantom-Geo-City', phantom.city);
  res.setHeader('X-Phantom-Edge-POP', phantom.pop);
  res.setHeader('X-Phantom-ASN', phantom.asn);
  res.setHeader('X-Edge-Routing-Node', nodeId);
  res.setHeader('X-Decoy-Route', `relay://edge.${phantom.code.toLowerCase()}.ubcexx-cdn.net:443`);
  res.setHeader('X-Anti-Trace-Shield', 'active-anonymized-v4');

  res.removeHeader('X-Powered-By');
  res.removeHeader('x-powered-by');
  next();
});

app.get(['/api/admin/probe', '/api/admin/trace'], (req: Request, res: Response) => {
  const phantom = getRandomPhantomGeo();
  const phantomRay = generatePhantomRay(phantom.pop);
  const nodeId = `phantom-relay-${phantom.code}-${Math.floor(Math.random() * 900000 + 100000).toString(16)}`;

  res.setHeader('CF-IPCountry', phantom.code);
  res.setHeader('CF-Ray', phantomRay);
  res.setHeader('X-Edge-Routing-Node', nodeId);

  res.json({
    shield: 'UBCEXX Multi-Country Phantom Geo-Decoy Active',
    status: 'anonymized',
    node: nodeId,
    geo: {
      country: phantom.name,
      iso: phantom.code,
      city: phantom.city,
      edge_pop: phantom.pop,
      asn: phantom.asn,
    },
    decoy_route: `relay://edge.${phantom.code.toLowerCase()}.ubcexx-cdn.net:443`,
    trace: 'obfuscated-multi-hop-edge',
    timestamp: new Date().toISOString(),
  });
});

const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: UBCEXX Admin token required' });
  }
  const token = authHeader.split(' ')[1];

  if (!token || !token.includes('ubcexx_admin')) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
  next();
};

const ipRateMap = new Map<string, number[]>();
const FLOOD_WINDOW_MS = 5000;
const FLOOD_MAX_REQUESTS = 30;

function silentFloodProtection(req: Request, res: Response, next: NextFunction) {
  const ip =
    (req.headers['cf-connecting-ip'] as string) ||
    (req.headers['x-real-ip'] as string) ||
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    '127.0.0.1';

  const now = Date.now();
  let timestamps = ipRateMap.get(ip);
  if (!timestamps) {
    timestamps = [];
    ipRateMap.set(ip, timestamps);
  }

  const validFrom = now - FLOOD_WINDOW_MS;
  const recent = timestamps.filter((t) => t > validFrom);

  if (recent.length >= FLOOD_MAX_REQUESTS) {
    res.setHeader('Retry-After', '5');
    return res.status(429).json({
      success: false,
      error: 'Too Many Requests',
    });
  }

  recent.push(now);
  ipRateMap.set(ip, recent);
  next();
}

app.get('/api/videos', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=60, max-age=60, stale-while-revalidate=300');
    const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined;
    const featured = req.query.featured === '1' || req.query.featured === 'true';
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 24;

    let sql = `SELECT * FROM videos WHERE status = 'published'`;
    const params: any[] = [];

    if (categoryId && categoryId > 0) {
      sql += ` AND category_id = ?`;
      params.push(categoryId);
    }

    if (featured) {
      sql += ` AND is_featured = 1`;
    }

    if (search) {
      sql += ` AND title LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = d1DB.prepare(sql).bind(...params);
    const result = await stmt.all();

    res.json({
      success: true,
      videos: result.results,
      meta: {
        total: result.results.length,
        source: 'Cloudflare D1 (env.DB)'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/search/suggest', silentFloodProtection, async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=60, max-age=60, stale-while-revalidate=300');
    const q = String(req.query.q || '').trim();
    if (!q) {
      return res.json({ success: true, suggestions: [] });
    }

    const pattern = `%${q}%`;
    const stmt = d1DB.prepare('SELECT title, tags FROM videos WHERE title LIKE ? LIMIT 6').bind(pattern);
    const result = await stmt.all();
    const rows = (result.results || []) as Array<{ title?: string; tags?: string }>;

    const rawSuggestions: string[] = [];

    for (const row of rows) {
      if (row.title) {
        rawSuggestions.push(row.title);
      }
      if (row.tags) {
        const tagList = row.tags.split(',').map((t) => t.trim()).filter(Boolean);
        for (const tag of tagList) {
          if (tag.toLowerCase().includes(q.toLowerCase())) {
            rawSuggestions.push(tag);
          }
        }
      }
    }

    try {
      const catStmt = d1DB.prepare('SELECT name FROM categories');
      const catResult = await catStmt.all();
      const catRows = (catResult.results || []) as Array<{ name?: string }>;
      for (const cat of catRows) {
        if (cat.name && cat.name.toLowerCase().includes(q.toLowerCase())) {
          rawSuggestions.push(cat.name);
        }
      }
    } catch {
    }

    const seen = new Set<string>();
    const suggestions: string[] = [];

    for (const item of rawSuggestions) {
      const clean = item.trim();
      const lower = clean.toLowerCase();
      if (clean && !seen.has(lower)) {
        seen.add(lower);
        suggestions.push(clean);
        if (suggestions.length >= 6) {
          break;
        }
      }
    }

    res.json({
      success: true,
      suggestions,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message, suggestions: [] });
  }
});

app.get('/api/videos/:id', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=60, max-age=60, stale-while-revalidate=300');
    const idOrSlug = req.params.id;
    const isNum = !isNaN(Number(idOrSlug));

    let video;
    if (isNum) {
      const stmt = d1DB.prepare('SELECT * FROM videos WHERE id = ?').bind(Number(idOrSlug));
      video = await stmt.first();
    } else {
      const stmt = d1DB.prepare('SELECT * FROM videos WHERE slug = ?').bind(idOrSlug);
      video = await stmt.first();
    }

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    const relatedStmt = d1DB.prepare('SELECT * FROM videos WHERE category_id = ? LIMIT 8').bind(video.category_id);
    const relatedResult = await relatedStmt.all();
    const related = (relatedResult.results as any[]).filter(v => v.id !== video.id);

    res.json({
      success: true,
      video,
      relatedVideos: related,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/videos/:id/view', async (req: Request, res: Response) => {
  try {
    const videoId = Number(req.params.id);
    const stmt = d1DB.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').bind(videoId);
    await stmt.run();

    const videoStmt = d1DB.prepare('SELECT views FROM videos WHERE id = ?').bind(videoId);
    const updated = await videoStmt.first();

    res.json({
      success: true,
      views: updated ? updated.views : 0,
      message: 'View count recorded in Cloudflare D1',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/videos/:id/like', silentFloodProtection, async (req: Request, res: Response) => {
  try {
    const videoId = Number(req.params.id);
    const stmt = d1DB.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').bind(videoId);
    await stmt.run();

    const videoStmt = d1DB.prepare('SELECT likes FROM videos WHERE id = ?').bind(videoId);
    const updated = await videoStmt.first();

    res.json({
      success: true,
      likes: updated ? updated.likes : 0,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=60, max-age=60, stale-while-revalidate=300');
    const stmt = d1DB.prepare('SELECT * FROM categories');
    const result = await stmt.all();
    res.json({ success: true, categories: result.results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get(['/api/monetization', '/api/admin/monetization'], async (req: Request, res: Response) => {
  try {
    res.setHeader('Cache-Control', 'public, s-maxage=60, max-age=60, stale-while-revalidate=300');
    const rawMonetization: any = d1DB.getState().monetization || {};
    const monetization = { ...rawMonetization };

    if (typeof monetization.top_rail_cards === 'string') {
      try {
        monetization.top_rail_cards = JSON.parse(monetization.top_rail_cards);
      } catch {
        monetization.top_rail_cards = [];
      }
    } else if (!monetization.top_rail_cards) {
      monetization.top_rail_cards = [];
    }

    if (typeof monetization.placement_zones === 'string') {
      try {
        monetization.placement_zones = JSON.parse(monetization.placement_zones);
      } catch {
        monetization.placement_zones = {};
      }
    } else if (!monetization.placement_zones) {
      monetization.placement_zones = {};
    }

    res.json({ success: true, monetization });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.all('/api/proxy-ad', async (req: Request, res: Response) => {
  try {
    const targetUrl = (req.query.url as string) || (req.body && req.body.url);
    if (!targetUrl || (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://'))) {
      return res.status(400).json({ error: 'Valid target HTTP/HTTPS URL parameter required' });
    }

    const clientIp =
      (req.headers['cf-connecting-ip'] as string) ||
      (req.headers['x-real-ip'] as string) ||
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.ip ||
      '';

    const userAgent = (req.headers['user-agent'] as string) || 'Mozilla/5.0';
    const referer = (req.headers['referer'] as string) || 'https://ubcexx-50v.pages.dev/';
    const accept = (req.headers['accept'] as string) || '*/*';
    const acceptLanguage = (req.headers['accept-language'] as string) || 'en-US,en;q=0.9';

    const upstreamHeaders: Record<string, string> = {
      'User-Agent': userAgent,
      'Referer': referer,
      'Accept': accept,
      'Accept-Language': acceptLanguage,
    };

    if (req.headers.range) {
      upstreamHeaders['Range'] = req.headers.range as string;
    }

    if (clientIp) {
      upstreamHeaders['X-Forwarded-For'] = clientIp;
      upstreamHeaders['X-Real-IP'] = clientIp;
      upstreamHeaders['CF-Connecting-IP'] = clientIp;
    }

    const upstreamRes = await fetch(targetUrl, {
      method: req.method === 'POST' ? 'POST' : 'GET',
      headers: upstreamHeaders,
    });

    const contentType =
      upstreamRes.headers.get('content-type') ||
      (targetUrl.endsWith('.js')
        ? 'application/javascript; charset=utf-8'
        : targetUrl.endsWith('.xml')
        ? 'application/xml; charset=utf-8'
        : 'text/plain; charset=utf-8');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) {
      res.setHeader('Content-Range', contentRange);
    }
    const acceptRanges = upstreamRes.headers.get('accept-ranges');
    if (acceptRanges) {
      res.setHeader('Accept-Ranges', acceptRanges);
    }
    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) {
      res.setHeader('Content-Length', contentLength);
    }

    if (
      contentType.includes('javascript') ||
      contentType.includes('text') ||
      contentType.includes('xml') ||
      contentType.includes('json')
    ) {
      let bodyText = await upstreamRes.text();
      const currentOrigin = `${req.protocol}://${req.get('host')}`;
      const partnerDomain = Buffer.from('YmlvbWFub3Mub3Jn', 'base64').toString('ascii');
      const partnerRegex = new RegExp(`(https?:)?\\/\\/([a-z0-9-]+\\.)?${partnerDomain.replace('.', '\\.')}`, 'gi');
      bodyText = bodyText.replace(partnerRegex, (match) => {
        const fullUrl = match.startsWith('http') ? match : `https:${match}`;
        return `${currentOrigin}/api/proxy-ad?url=${encodeURIComponent(fullUrl)}`;
      });
      return res.status(upstreamRes.status).send(bodyText);
    }

    const arrayBuffer = await upstreamRes.arrayBuffer();
    return res.status(upstreamRes.status).send(Buffer.from(arrayBuffer));
  } catch (err: any) {
    return res.status(502).json({ error: 'Proxy request failed', details: err?.message || String(err) });
  }
});

let adminFailedAttempts = 0;
let adminLockoutUntil = 0;

app.get('/api/admin/login', (req: Request, res: Response) => {
  const now = Date.now();
  const isLocked = now < adminLockoutUntil;
  if (!isLocked && adminLockoutUntil > 0) {
    adminFailedAttempts = 0;
    adminLockoutUntil = 0;
  }
  res.json({
    success: true,
    locked: isLocked,
    lockoutUntil: isLocked ? adminLockoutUntil : 0,
    remainingSeconds: isLocked ? Math.ceil((adminLockoutUntil - now) / 1000) : 0,
    failedAttempts: isLocked ? 2 : adminFailedAttempts,
  });
});

app.post('/api/admin/login', async (req: Request, res: Response) => {
  try {
    const now = Date.now();
    if (now < adminLockoutUntil) {
      const remainingSeconds = Math.ceil((adminLockoutUntil - now) / 1000);
      return res.status(429).json({
        success: false,
        locked: true,
        lockoutUntil: adminLockoutUntil,
        remainingSeconds,
        error: 'Security Lockout: 2 failed attempts exceeded. Admin access locked for 2 hours.',
      });
    }

    const { email, username, password } = req.body || {};
    const identifier = String(email || username || '').trim();
    if (!identifier || !password) {
      return res.status(400).json({ success: false, error: 'Email and password required' });
    }

    const stmt = d1DB.prepare('SELECT * FROM admins WHERE username = ?').bind(identifier);
    const admin = await stmt.first();

    const isMatch = Boolean(
      admin && admin.password_hash === password
    );

    if (!admin || !isMatch) {
      adminFailedAttempts += 1;
      if (adminFailedAttempts >= 2) {
        adminLockoutUntil = now + (2 * 60 * 60 * 1000);
        return res.status(429).json({
          success: false,
          locked: true,
          lockoutUntil: adminLockoutUntil,
          remainingSeconds: 7200,
          error: 'Security Lockout: 2 failed attempts exceeded. Admin access locked for 2 hours.',
        });
      }
      return res.status(401).json({
        success: false,
        remainingAttempts: 1,
        error: 'Invalid admin credentials. 1 attempt remaining before 2-hour lockout.',
      });
    }

    adminFailedAttempts = 0;
    adminLockoutUntil = 0;

    const token = `ubcexx_admin_${Buffer.from(`${admin.id}:${admin.username}:${Date.now()}`).toString('base64')}`;

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: 'Administrator',
      },
      message: 'Authentication successful. Welcome to UBCEXX Admin Panel.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

const getStatsHandler = async (req: Request, res: Response) => {
  try {
    const state = d1DB.getState();
    const totalVideos = state.videos.length;
    const totalViews = state.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = state.videos.reduce((sum, v) => sum + (v.likes || 0), 0);
    const totalCategories = state.categories.length;
    const featuredVideos = state.videos.filter(v => v.is_featured === 1).length;

    res.json({
      success: true,
      stats: {
        total_videos: totalVideos,
        total_views: totalViews,
        total_categories: totalCategories,
        total_likes: totalLikes,
        totalVideos,
        totalViews,
        totalLikes,
        totalCategories,
        featuredVideos,
        database: 'Cloudflare D1 (env.DB)',
        status: 'Operational',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/stats', getStatsHandler);
app.post('/api/stats', getStatsHandler);
app.get('/api/admin/stats', getStatsHandler);
app.post('/api/admin/stats', getStatsHandler);

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

const handleVideoMeta = async (req: Request, res: Response) => {
  try {
    const videoUrl = String(req.query.url || req.body?.url || '').trim();
    if (!videoUrl) {
      return res.status(400).json({ success: false, error: 'Video URL required' });
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

    res.json({
      success: true,
      duration,
      duration_seconds: result.duration_seconds,
      title: result.title,
      thumbnail_url: result.thumbnail_url,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message || 'Metadata extraction failed' });
  }
};

app.get('/api/admin/video-meta', handleVideoMeta);
app.post('/api/admin/video-meta', handleVideoMeta);

app.get('/api/admin/videos', async (req: Request, res: Response) => {
  try {
    const stmt = d1DB.prepare('SELECT * FROM videos');
    const result = await stmt.all();
    res.json({ success: true, videos: result.results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/videos', '/api/admin/videos'], async (req: Request, res: Response) => {
  try {
    const {
      title,
      slug,
      description,
      video_url,
      backup_video_url,
      thumbnail_url,
      duration,
      category_id,
      tags,
      is_featured,
      status,
    } = req.body;

    if (!title || !video_url || !thumbnail_url) {
      return res.status(400).json({ success: false, error: 'Title, Primary Video URL, and Thumbnail URL are required' });
    }

    const cleanSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const insertSql = `
      INSERT INTO videos 
      (title, slug, description, video_url, backup_video_url, thumbnail_url, duration, category_id, tags, is_featured, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    let parsedDuration = 0;
    if (typeof duration === 'number') {
      parsedDuration = Math.max(0, Math.floor(duration));
    } else if (typeof duration === 'string') {
      const trimmed = duration.trim();
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':').map((p) => parseInt(p.trim(), 10) || 0);
        if (parts.length === 2) parsedDuration = parts[0] * 60 + parts[1];
        else if (parts.length === 3) parsedDuration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else {
        parsedDuration = parseInt(trimmed, 10) || 0;
      }
    }

    const stmt = d1DB.prepare(insertSql).bind(
      title,
      cleanSlug,
      description || '',
      video_url,
      backup_video_url ? String(backup_video_url).trim() : '',
      thumbnail_url,
      parsedDuration,
      Number(category_id) || 1,
      tags || '',
      is_featured ? 1 : 0,
      status || 'published'
    );

    const result = await stmt.run();

    res.status(201).json({
      success: true,
      message: 'Video successfully inserted into Cloudflare D1',
      id: result.meta.last_row_id,
      slug: cleanSlug,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.patch(['/api/videos/:id', '/api/admin/videos/:id'], async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { is_featured } = req.body;

    if (is_featured !== undefined) {
      const stmt = d1DB.prepare('UPDATE videos SET is_featured = ? WHERE id = ?').bind(is_featured ? 1 : 0, id);
      await stmt.run();
    }

    res.json({ success: true, message: 'Video updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete(['/api/videos', '/api/videos/:id', '/api/admin/videos', '/api/admin/videos/:id'], async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id || req.query.id || req.body?.id;
    if (!rawId) {
      return res.status(400).json({ success: false, error: 'Video ID required' });
    }
    const id = Number(rawId);
    const stmt = d1DB.prepare('DELETE FROM videos WHERE id = ?').bind(id);
    const result = await stmt.run();

    if (result.meta.changes === 0) {
      return res.status(404).json({ success: false, error: 'Video not found or already deleted' });
    }

    res.json({
      success: true,
      message: 'Video deleted successfully',
      id,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.get('/api/reports', async (req: Request, res: Response) => {
  try {
    const stmt = d1DB.prepare('SELECT * FROM reports');
    const result = await stmt.all();
    res.json({
      success: true,
      reports: result.results || [],
      count: result.results?.length || 0,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/reports', silentFloodProtection, async (req: Request, res: Response) => {
  try {
    const { video_id, video_title, reason } = req.body;
    if (!video_id) {
      return res.status(400).json({ success: false, error: 'Video ID is required' });
    }

    const stmt = d1DB
      .prepare('INSERT INTO reports (video_id, video_title, reason) VALUES (?, ?, ?)')
      .bind(Number(video_id), video_title || `Video #${video_id}`, reason || 'Stream Broken / Not Playing');
    const result = await stmt.run();

    res.status(201).json({
      success: true,
      message: 'Report submitted to admin',
      id: result.meta.last_row_id,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/reports', async (req: Request, res: Response) => {
  try {
    const action = req.query.action || req.body?.action || '';
    const reportId = req.query.id || req.body?.id;
    const videoId = req.query.video_id || req.body?.video_id;

    if (action === 'purge' || req.query.purge === 'true' || req.body?.purge === true) {
      const targetVideoId = Number(videoId);
      if (!targetVideoId) {
        return res.status(400).json({ success: false, error: 'Video ID is required for purge' });
      }

      const deleteVideoStmt = d1DB.prepare('DELETE FROM videos WHERE id = ?').bind(targetVideoId);
      await deleteVideoStmt.run();

      const clearReportsStmt = d1DB.prepare('DELETE FROM reports WHERE video_id = ?').bind(targetVideoId);
      await clearReportsStmt.run();

      return res.json({
        success: true,
        action: 'purge',
        purged_video_id: targetVideoId,
        message: `Video #${targetVideoId} permanently purged from D1 and reports cleared`,
      });
    }

    if (reportId) {
      const stmt = d1DB.prepare('DELETE FROM reports WHERE id = ?').bind(Number(reportId));
      await stmt.run();
      return res.json({
        success: true,
        action: 'dismiss',
        dismissed_report_id: Number(reportId),
        message: 'Report dismissed',
      });
    }

    return res.status(400).json({ success: false, error: 'Report ID or action=purge required' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/categories', '/api/admin/categories'], async (req: Request, res: Response) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const stmt = d1DB.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').bind(name, cleanSlug);
    const result = await stmt.run();

    res.status(201).json({
      success: true,
      message: 'Category created in Cloudflare D1',
      id: result.meta.last_row_id,
      slug: cleanSlug,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete(['/api/categories/:id', '/api/admin/categories/:id'], async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const stmt = d1DB.prepare('DELETE FROM categories WHERE id = ?').bind(id);
    const result = await stmt.run();

    res.json({
      success: true,
      message: `Category #${id} removed from Cloudflare D1`,
      deletedCount: result.meta.changes,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/sql', '/api/admin/sql'], async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ success: false, error: 'SQL query required' });
    }

    const stmt = d1DB.prepare(sql);
    const result = await stmt.all();

    res.json({
      success: true,
      results: result.results,
      meta: result.meta,
      executedQuery: sql,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post(['/api/monetization', '/api/admin/monetization'], async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const preroll_enabled = body.preroll_enabled !== undefined ? (body.preroll_enabled ? 1 : 0) : 1;
    const preroll_video_url = body.preroll_video_url || '';
    const preroll_click_url = body.preroll_click_url || '';
    const preroll_skip_seconds = Number(body.preroll_skip_seconds ?? body.preroll_skip_offset ?? 5) || 5;
    const native_ads_enabled = (body.native_ads_enabled !== undefined ? body.native_ads_enabled : body.native_enabled) ? 1 : 0;
    const native_ads_code = body.native_ads_code ?? body.native_code ?? '';
    const native_placements = body.native_placements || 'top_rail,under_player,in_feed';
    const top_rail_enabled = body.top_rail_enabled !== undefined ? (body.top_rail_enabled ? 1 : 0) : 1;
    const top_rail_cards = typeof body.top_rail_cards === 'string'
      ? body.top_rail_cards
      : JSON.stringify(body.top_rail_cards || []);
    const placement_zones = typeof body.placement_zones === 'string'
      ? body.placement_zones
      : JSON.stringify(body.placement_zones || {});

    const banner_top_code = body.banner_top_code !== undefined ? body.banner_top_code : (body.bannerTopCode || '');
    const banner_infeed_code = body.banner_infeed_code !== undefined ? body.banner_infeed_code : (body.bannerInfeedCode || body.native_ads_code || body.native_code || '');

    const state = d1DB.getState();
    state.monetization = {
      id: 1,
      preroll_enabled,
      preroll_video_url,
      preroll_click_url,
      preroll_skip_seconds,
      preroll_skip_offset: preroll_skip_seconds,
      native_ads_enabled,
      native_enabled: native_ads_enabled,
      native_ads_code,
      native_code: native_ads_code,
      banner_top_code,
      banner_infeed_code,
      native_placements,
      placement_zones,
      top_rail_enabled,
      top_rail_cards,
      updated_at: new Date().toISOString(),
    };
    d1DB.commit();

    res.json({
      success: true,
      message: 'Monetization settings successfully updated in Cloudflare D1',
    });
  } catch (err: any) {
    
    res.status(500).json({ success: false, error: err.message || 'Failed to update monetization settings' });
  }
});

async function isStreamUrlDead(url: string | null | undefined): Promise<boolean> {
  if (!url || !url.trim()) return true;
  const trimmed = url.trim();

  try {
    const isOkRu = trimmed.includes('ok.ru') || trimmed.includes('odnoklassniki.ru');

    if (isOkRu) {
      const okMatch = trimmed.match(/(?:video|videoembed|live)\/(\d+)/i) || trimmed.match(/\/(\d{6,})/);
      const okId = okMatch ? okMatch[1] : null;
      if (!okId) return true;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const res = await fetch(`https://ok.ru/videoembed/${okId}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 404 || res.status === 410 || res.status === 403) {
        return true;
      }

      const body = await res.text();
      const lower = body.toLowerCase();
      if (
        lower.includes('видео удалено') ||
        lower.includes('video has been deleted') ||
        lower.includes('video not available') ||
        lower.includes('доступ ограничен') ||
        lower.includes('video is restricted') ||
        lower.includes('error-page') ||
        lower.includes('video not found') ||
        lower.includes('не найдено')
      ) {
        return true;
      }

      return false;
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      let res: globalThis.Response;
      try {
        res = await fetch(trimmed, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UBCEXX-Bot/1.0)' },
          signal: controller.signal,
        });
      } catch {
        const getController = new AbortController();
        const getTimeoutId = setTimeout(() => getController.abort(), 6000);
        res = await fetch(trimmed, {
          method: 'GET',
          headers: {
            'Range': 'bytes=0-100',
            'User-Agent': 'Mozilla/5.0 (compatible; UBCEXX-Bot/1.0)',
          },
          signal: getController.signal,
        });
        clearTimeout(getTimeoutId);
      } finally {
        clearTimeout(timeoutId);
      }

      if (res.status === 404 || res.status === 410 || res.status === 403) {
        return true;
      }

      return false;
    }
  } catch {
    return true;
  }
}

const handleCronCleanup = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const allowedTokens = [
      'ubcexx_super_cron_secret',
      'ubcexx_super_secure_jwt_secret_token_cloudflare_d1',
      process.env.JWT_SECRET,
      process.env.CRON_SECRET,
    ].filter(Boolean);

    const isAuthorized =
      allowedTokens.some((t) => t && token === t) ||
      token.startsWith('ubcexx_admin');

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid Cron or Admin Bearer Token required',
      });
    }

    const { results } = await d1DB.prepare(
      'SELECT id, title, video_url, backup_video_url FROM videos'
    ).all<{ id: number; title: string; video_url: string; backup_video_url?: string }>();

    const videos = results || [];
    const total_checked = videos.length;
    const purged_titles: string[] = [];
    const purged_ids: number[] = [];

    for (const v of videos) {
      const isPrimaryDead = await isStreamUrlDead(v.video_url);

      if (!isPrimaryDead) {
        continue;
      }

      let isBackupDead = true;
      if (v.backup_video_url && v.backup_video_url.trim()) {
        isBackupDead = await isStreamUrlDead(v.backup_video_url);
      } else {
        isBackupDead = true;
      }

      if (isPrimaryDead && isBackupDead) {
        await d1DB.prepare('DELETE FROM videos WHERE id = ?').bind(v.id).run();
        purged_titles.push(v.title);
        purged_ids.push(v.id);
        
      }
    }

    return res.json({
      success: true,
      message: 'Daily auto cleanup completed successfully',
      timestamp: new Date().toISOString(),
      total_checked,
      purged_count: purged_ids.length,
      purged_ids,
      purged_titles,
    });
  } catch (err: any) {
    
    return res.status(500).json({
      success: false,
      error: err.message || 'Auto cleanup execution failed',
    });
  }
};

app.post('/api/cron/cleanup', handleCronCleanup);
app.get('/api/cron/cleanup', handleCronCleanup);

app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.path}`,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {});

  server.on('error', (err: any) => {
    
    process.exit(1);
  });
}

startServer().catch((err) => {
  
  process.exit(1);
});
