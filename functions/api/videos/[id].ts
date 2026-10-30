// Cloudflare Pages Function: /api/videos/[id]
// GET, PATCH, DELETE, OPTIONS - Fetch single video, toggle featured, or delete video

interface Env {
  DB: D1Database;
}

const corsHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

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
      return new Response(
        JSON.stringify({ success: false, error: 'Video not found' }),
        { status: 404, headers: corsHeaders }
      );
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

    return new Response(
      JSON.stringify({ success: true, video, relatedVideos: related || [] }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const id = Number(context.params.id);
    const body: any = await context.request.json().catch(() => ({}));
    const { is_featured, status } = body;

    if (is_featured !== undefined) {
      const stmt = context.env.DB.prepare('UPDATE videos SET is_featured = ? WHERE id = ?')
        .bind(is_featured ? 1 : 0, id);
      await stmt.run();
    }

    if (status !== undefined) {
      const stmt = context.env.DB.prepare('UPDATE videos SET status = ? WHERE id = ?')
        .bind(status, id);
      await stmt.run();
    }

    return new Response(
      JSON.stringify({ success: true, message: `Video #${id} updated successfully` }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to update video' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const id = Number(context.params.id);
    const stmt = context.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(id);
    const result = await stmt.run();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Video #${id} deleted from Cloudflare D1 database`,
        deletedCount: result.meta?.changes ?? 1,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to delete video' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return onRequestPatch(context);
};
