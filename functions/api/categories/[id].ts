interface Env {
  DB: D1Database;
}

const corsHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
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

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const id = Number(context.params.id || body.id);
    const trimmedName = String(body.name || '').trim();

    if (!id || !trimmedName) {
      return new Response(
        JSON.stringify({ success: false, error: 'Category ID and name are required' }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    const rawSlug = String(body.slug || trimmedName);
    const cleanSlug =
      rawSlug
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || `category-${id}`;

    const stmt = context.env.DB.prepare('UPDATE categories SET name = ?, slug = ? WHERE id = ?').bind(
      trimmedName,
      cleanSlug,
      id
    );
    await stmt.run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Category updated successfully',
        category: {
          id,
          name: trimmedName,
          slug: cleanSlug,
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to update category' }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return onRequestDelete(context);
};
