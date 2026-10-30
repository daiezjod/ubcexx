// Cloudflare Pages Function: POST /api/videos/[id]/like
// Increments likes count directly in Cloudflare D1

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
      UPDATE videos SET likes = likes + 1 WHERE id = ?
    `).bind(id);
    await updateStmt.run();

    const fetchStmt = context.env.DB.prepare(`
      SELECT likes FROM videos WHERE id = ?
    `).bind(id);
    const updated = await fetchStmt.first<{ likes: number }>();

    return new Response(
      JSON.stringify({ success: true, likes: updated?.likes || 0 }),
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
    const stmt = context.env.DB.prepare('SELECT likes FROM videos WHERE id = ?').bind(id);
    const video = await stmt.first<{ likes: number }>();
    return new Response(
      JSON.stringify({ success: true, likes: video?.likes || 0 }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};
