// Cloudflare Pages Function: POST /api/videos/[id]/view
// Increments views counter directly in Cloudflare D1

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

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id);

  try {
    const updateStmt = context.env.DB.prepare(`
      UPDATE videos SET views = views + 1 WHERE id = ?
    `).bind(id);
    await updateStmt.run();

    const fetchStmt = context.env.DB.prepare(`
      SELECT views FROM videos WHERE id = ?
    `).bind(id);
    const updated = await fetchStmt.first<{ views: number }>();

    return new Response(
      JSON.stringify({ success: true, views: updated?.views || 0 }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const id = Number(context.params.id);
  try {
    const stmt = context.env.DB.prepare('SELECT views FROM videos WHERE id = ?').bind(id);
    const video = await stmt.first<{ views: number }>();
    return new Response(
      JSON.stringify({ success: true, views: video?.views || 0 }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};
