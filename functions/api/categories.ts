interface Env {
  DB: D1Database;
}

const corsHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
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
    const stmt = context.env.DB.prepare(`
      SELECT c.*, COUNT(v.id) as video_count
      FROM categories c
      LEFT JOIN videos v ON v.category_id = c.id
      GROUP BY c.id
      ORDER BY c.id ASC
    `);
    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ success: true, categories: results || [] }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, s-maxage=60, max-age=60, stale-while-revalidate=300',
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
    const { name, slug } = body;

    if (!name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Category name required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const stmt = context.env.DB.prepare(`
      INSERT INTO categories (name, slug) VALUES (?, ?)
    `).bind(name, cleanSlug);

    const result = await stmt.run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Category created in Cloudflare D1',
        id: result.meta?.last_row_id,
        slug: cleanSlug,
      }),
      { status: 201, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to create category' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    let body: any = {};
    try {
      body = await context.request.json();
    } catch {
      body = {};
    }

    const rawId = url.searchParams.get('id') || body.id || (context.params ? (context.params as any).id : null);
    if (!rawId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Category ID required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const id = Number(rawId);
    const stmt = context.env.DB.prepare('DELETE FROM categories WHERE id = ?').bind(id);
    const result = await stmt.run();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Category #${id} removed from Cloudflare D1`,
        deletedCount: result.meta?.changes ?? 1,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to delete category' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

