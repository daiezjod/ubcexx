// Cloudflare Pages Function: POST /api/videos/[id]/view
// Increments views counter directly in Cloudflare D1

interface Env {
  DB: D1Database;
}

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

    return new Response(JSON.stringify({ success: true, views: updated?.views || 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
