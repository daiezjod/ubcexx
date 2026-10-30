// Cloudflare Pages Function: /api/monetization (GET monetization settings)

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const stmt = context.env.DB.prepare('SELECT * FROM monetization WHERE id = 1');
    const monetization = await stmt.first();

    return new Response(JSON.stringify({ success: true, monetization }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
