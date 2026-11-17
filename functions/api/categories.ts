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

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    try {
      await context.env.DB.prepare(`
        UPDATE videos
        SET category_id = COALESCE(
          (
            SELECT id
            FROM categories
            WHERE id = 6 OR LOWER(TRIM(slug)) = 'japanese' OR LOWER(TRIM(name)) = 'japanese'
            ORDER BY CASE WHEN id = 6 THEN 0 ELSE 1 END
            LIMIT 1
          ),
          6
        )
        WHERE (
          category_id IS NULL
          OR category_id = 0
          OR category_id = ''
          OR LOWER(TRIM(CAST(category_id AS TEXT))) = 'japanese'
        )
        AND (
          LOWER(COALESCE(title, '')) LIKE '%japanese%'
          OR LOWER(COALESCE(tags, '')) LIKE '%japanese%'
          OR LOWER(TRIM(CAST(category_id AS TEXT))) = 'japanese'
        )
      `).run();
    } catch {
    }

    const stmt = context.env.DB.prepare(`
      SELECT
        c.*,
        (
          SELECT COUNT(*)
          FROM videos v
          WHERE v.category_id = c.id
            OR CAST(v.category_id AS TEXT) = CAST(c.id AS TEXT)
            OR (
              c.slug IS NOT NULL
              AND TRIM(c.slug) != ''
              AND (
                LOWER(TRIM(CAST(v.category_id AS TEXT))) = LOWER(TRIM(c.slug))
                OR LOWER(COALESCE(v.title, '')) LIKE '%' || LOWER(TRIM(c.slug)) || '%'
                OR LOWER(COALESCE(v.tags, '')) LIKE '%' || LOWER(TRIM(c.slug)) || '%'
              )
            )
            OR (
              c.name IS NOT NULL
              AND TRIM(c.name) != ''
              AND (
                LOWER(TRIM(CAST(v.category_id AS TEXT))) = LOWER(TRIM(c.name))
                OR LOWER(COALESCE(v.title, '')) LIKE '%' || LOWER(TRIM(c.name)) || '%'
                OR LOWER(COALESCE(v.tags, '')) LIKE '%' || LOWER(TRIM(c.name)) || '%'
              )
            )
        ) as video_count
      FROM categories c
      ORDER BY c.id ASC
    `);
    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({ success: true, categories: results || [] }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=0, s-maxage=1, must-revalidate',
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
      {
        status: 201,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to create category' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const body: any = await context.request.json().catch(() => ({}));
    const rawId = body.id || url.searchParams.get('id') || (context.params ? (context.params as any).id : null);
    const id = Number(rawId);
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

