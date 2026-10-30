// Cloudflare Pages Function: GET /api/videos/[id]
// Fetches video by ID or slug and queries related videos

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const idOrSlug = context.params.id as string;
  const isNum = !isNaN(Number(idOrSlug));

  try {
    let video;
    if (isNum) {
      const stmt = context.env.DB.prepare(`
        SELECT v.*, c.name as category_name, c.slug as category_slug
        FROM videos v
        LEFT JOIN categories c ON v.category_id = c.id
        WHERE v.id = ?
      `).bind(Number(idOrSlug));
      video = await stmt.first();
    } else {
      const stmt = context.env.DB.prepare(`
        SELECT v.*, c.name as category_name, c.slug as category_slug
        FROM videos v
        LEFT JOIN categories c ON v.category_id = c.id
        WHERE v.slug = ?
      `).bind(idOrSlug);
      video = await stmt.first();
    }

    if (!video) {
      return new Response(JSON.stringify({ success: false, error: 'Video not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Query related videos in same category
    const relatedStmt = context.env.DB.prepare(`
      SELECT id, title, slug, thumbnail_url, duration, views, created_at
      FROM videos
      WHERE category_id = ? AND id != ?
      ORDER BY views DESC
      LIMIT 8
    `).bind((video as any).category_id, (video as any).id);
    const { results: related } = await relatedStmt.all();

    return new Response(JSON.stringify({ success: true, video, relatedVideos: related }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
