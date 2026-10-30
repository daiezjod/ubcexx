// Cloudflare Pages Function: /api/admin/categories

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
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json();
    const { name, slug } = body;

    if (!name) {
      return new Response(JSON.stringify({ success: false, error: 'Category name required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const stmt = context.env.DB.prepare(`
      INSERT INTO categories (name, slug) VALUES (?, ?)
    `).bind(name, cleanSlug);

    const result = await stmt.run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Category created in Cloudflare D1',
      id: result.meta?.last_row_id,
      slug: cleanSlug,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
