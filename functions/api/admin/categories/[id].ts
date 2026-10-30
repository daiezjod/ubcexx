// Cloudflare Pages Function: /api/admin/categories/[id]
// DELETE, GET, POST, OPTIONS - Category manipulation by ID in Cloudflare D1

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

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization') || '';
    if (!authHeader.includes('Bearer')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: UBCEXX Admin token required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const id = Number(context.params.id);
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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = Number(context.params.id);
    const stmt = context.env.DB.prepare('SELECT * FROM categories WHERE id = ?').bind(id);
    const category = await stmt.first();

    if (!category) {
      return new Response(
        JSON.stringify({ success: false, error: 'Category not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, category }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return onRequestDelete(context);
};
