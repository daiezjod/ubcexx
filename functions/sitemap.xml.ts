interface Env {
  DB: D1Database;
}

function escapeXml(unsafe: string): string {
  return String(unsafe || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDate(value?: string | null): string {
  if (!value) return new Date().toISOString();
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) return new Date().toISOString();
  return parsed.toISOString();
}

function resolveAbsoluteUrl(origin: string, urlPath?: string | null): string {
  if (!urlPath) return '';
  const trimmed = String(urlPath).trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  return `${origin}${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const origin = new URL(context.request.url).origin;

  let videos: Array<{
    id: number;
    slug?: string;
    title?: string;
    description?: string;
    thumbnail_url?: string;
    duration?: number;
    created_at?: string;
  }> = [];

  let categories: Array<{
    id: number;
    slug?: string;
    name?: string;
    created_at?: string;
  }> = [];

  try {
    const videosResult = await context.env.DB.prepare(
      "SELECT id, slug, title, description, thumbnail_url, duration, created_at FROM videos WHERE status = 'published' ORDER BY created_at DESC LIMIT 5000"
    ).all();
    videos = videosResult.results || [];
  } catch {
    videos = [];
  }

  try {
    const categoriesResult = await context.env.DB.prepare(
      'SELECT id, slug, name, created_at FROM categories ORDER BY id ASC'
    ).all();
    categories = categoriesResult.results || [];
  } catch {
    categories = [];
  }

  const nowIso = new Date().toISOString();
  const urlEntries: string[] = [];

  urlEntries.push(`  <url>
    <loc>${escapeXml(`${origin}/`)}</loc>
    <lastmod>${nowIso}</lastmod>
    <changefreq>hourly</changefreq>
    <priority>1.0</priority>
  </url>`);

  for (const cat of categories) {
    const catSlug = cat.slug ? encodeURIComponent(cat.slug) : String(cat.id);
    const catUrl = `${origin}/?category=${catSlug}`;
    const lastmod = toIsoDate(cat.created_at);
    urlEntries.push(`  <url>
    <loc>${escapeXml(catUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.8</priority>
  </url>`);
  }

  for (const video of videos) {
    const slugOrId = video.slug ? encodeURIComponent(video.slug) : String(video.id);
    const watchUrl = `${origin}/watch/${slugOrId}`;
    const lastmod = toIsoDate(video.created_at);
    const thumbUrl = resolveAbsoluteUrl(origin, video.thumbnail_url);
    const title = video.title || `Video ${video.id}`;
    const description = video.description || `Watch ${title} free HD porn video on UBCEXX.`;
    const durationSec = typeof video.duration === 'number' && video.duration > 0 ? Math.floor(video.duration) : 0;

    let videoMetaBlock = '';
    if (thumbUrl) {
      videoMetaBlock = `
    <video:video>
      <video:thumbnail_loc>${escapeXml(thumbUrl)}</video:thumbnail_loc>
      <video:title>${escapeXml(title)}</video:title>
      <video:description>${escapeXml(description.slice(0, 2000))}</video:description>
      <video:player_loc>${escapeXml(watchUrl)}</video:player_loc>${durationSec > 0 ? `\n      <video:duration>${durationSec}</video:duration>` : ''}
      <video:publication_date>${lastmod}</video:publication_date>
      <video:family_friendly>no</video:family_friendly>
    </video:video>`;
    }

    urlEntries.push(`  <url>
    <loc>${escapeXml(watchUrl)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>${videoMetaBlock}
  </url>`);
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">
${urlEntries.join('\n')}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
};
