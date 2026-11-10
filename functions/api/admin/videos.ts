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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization') || '';
    if (!authHeader.includes('Bearer')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: UBCEXX Admin token required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const stmt = context.env.DB.prepare(`
      SELECT 
        v.id, v.title, v.slug, v.description, v.video_url, v.backup_video_url,
        v.thumbnail_url, v.duration, v.views, v.likes, v.category_id,
        v.tags, v.is_featured, v.status, v.created_at,
        c.name as category_name, c.slug as category_slug
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      ORDER BY v.created_at DESC
    `);
    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ success: true, videos: results || [] }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to fetch videos from D1' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization') || '';
    if (!authHeader.includes('Bearer')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: UBCEXX Admin token required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body: any = await context.request.json().catch(() => ({}));
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
    } = body;

    if (!title || !video_url || !thumbnail_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title, Primary Video URL, and Thumbnail URL required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

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

    const stmt = context.env.DB.prepare(`
      INSERT INTO videos 
      (title, slug, description, video_url, backup_video_url, thumbnail_url, duration, category_id, tags, is_featured, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
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

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Video successfully inserted into Cloudflare D1',
        id: result.meta?.last_row_id,
        slug: cleanSlug,
      }),
      { status: 201, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to insert video' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
