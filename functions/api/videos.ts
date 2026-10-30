// Cloudflare Pages Function: GET /api/videos
// Uses Cloudflare D1 Database binding via context.env.DB

interface Env {
  DB: D1Database;
}

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
        v.id, v.title, v.slug, v.description, v.video_url, v.thumbnail_url,
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

    return new Response(JSON.stringify({ success: true, videos: results }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=10, s-maxage=30',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
