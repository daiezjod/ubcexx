// Cloudflare Pages Function: GET /api/categories

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const stmt = context.env.DB.prepare(`
      SELECT c.*, COUNT(v.id) as video_count
      FROM categories c
      LEFT JOIN videos v ON v.category_id = c.id
      GROUP BY c.id
      ORDER BY c.id ASC
    `);
    const { results } = await stmt.all();

    return new Response(JSON.stringify({ success: true, categories: results }), {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=60',
      },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
