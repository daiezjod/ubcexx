// Cloudflare Pages Function: /api/videos
// GET (list public/filtered videos) & POST (insert new video into D1)

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
  const url = new URL(context.request.url);
  const categoryId = url.searchParams.get('category_id');
  const featured = url.searchParams.get('featured');
  const search = url.searchParams.get('search');
  const limit = parseInt(url.searchParams.get('limit') || '24', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  try {
    let sql = `
      SELECT 
        v.id, v.title, v.slug, v.description, v.video_url, v.backup_video_url, v.thumbnail_url,
        v.duration, v.views, v.likes, v.category_id, v.tags, v.is_featured,
        v.status, v.created_at,
        c.name as category_name, c.slug as category_slug
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      WHERE v.status = 'published'
    `;
    const params: any[] = [];

    if (categoryId && parseInt(categoryId, 10) > 0) {
      sql += ' AND v.category_id = ?';
      params.push(parseInt(categoryId, 10));
    }

    if (featured === '1' || featured === 'true') {
      sql += ' AND v.is_featured = 1';
    }

    if (search) {
      sql += ' AND (v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = context.env.DB.prepare(sql).bind(...params);
    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({
        success: true,
        videos: results || [],
        meta: {
          total: results?.length || 0,
          source: 'Cloudflare D1 (env.DB)',
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=10, s-maxage=30',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
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
      Number(duration) || 0,
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
