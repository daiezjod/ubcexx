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
  const url = new URL(context.request.url);
  const lookup = url.searchParams.get('lookup');
  const categoryId = url.searchParams.get('category_id');
  const featured = url.searchParams.get('featured');
  const search = url.searchParams.get('search');
  const limit = parseInt(url.searchParams.get('limit') || '24', 10);
  const offset = parseInt(url.searchParams.get('offset') || '0', 10);

  try {
    if (lookup && lookup.trim() !== '') {
      let cleanLookup = lookup.trim();
      try {
        cleanLookup = decodeURIComponent(cleanLookup).trim();
      } catch {
      }
      const numericLookupId = /^\d+$/.test(cleanLookup) ? Number(cleanLookup) : -1;

      const lookupStmt = context.env.DB.prepare(`
        SELECT 
          v.id, v.title, v.slug, v.description, v.video_url, v.backup_video_url, v.thumbnail_url,
          v.duration, v.views, v.likes, v.category_id, v.tags, v.is_featured,
          v.status, v.created_at,
          c.name as category_name, c.slug as category_slug
        FROM videos v
        LEFT JOIN categories c ON (
          CAST(v.category_id AS TEXT) = CAST(c.id AS TEXT)
          OR LOWER(TRIM(CAST(v.category_id AS TEXT))) = LOWER(TRIM(c.slug))
          OR LOWER(TRIM(CAST(v.category_id AS TEXT))) = LOWER(TRIM(c.name))
        )
        WHERE v.id = ? OR LOWER(TRIM(v.slug)) = LOWER(TRIM(?))
        ORDER BY v.id DESC
        LIMIT 1
      `).bind(numericLookupId, cleanLookup);

      const matchedVideo = await lookupStmt.first();
      if (!matchedVideo) {
        return new Response(
          JSON.stringify({ success: false, error: 'Video not found', videos: [] }),
          {
            status: 404,
            headers: {
              ...corsHeaders,
              'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
          }
        );
      }

      const relatedStmt = context.env.DB.prepare(`
        SELECT id, title, slug, thumbnail_url, duration, views, category_id, tags, created_at
        FROM videos
        WHERE category_id = ? AND id != ?
        ORDER BY views DESC
        LIMIT 8
      `).bind((matchedVideo as any).category_id, (matchedVideo as any).id);
      const { results: related } = await relatedStmt.all();

      return new Response(
        JSON.stringify({
          success: true,
          video: matchedVideo,
          videos: [matchedVideo],
          relatedVideos: related || [],
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        }
      );
    }

    let sql = `
      SELECT
        v.*,
        c.name as category_name,
        c.slug as category_slug
      FROM videos v
      LEFT JOIN categories c ON (
        c.id = v.category_id
        OR CAST(v.category_id AS TEXT) = CAST(c.id AS TEXT)
        OR LOWER(TRIM(CAST(v.category_id AS TEXT))) = LOWER(TRIM(c.slug))
        OR LOWER(TRIM(CAST(v.category_id AS TEXT))) = LOWER(TRIM(c.name))
      )
      WHERE v.status = 'published'
    `;
    const params: any[] = [];

    if (categoryId && parseInt(categoryId, 10) > 0) {
      const targetCatId = parseInt(categoryId, 10);
      sql += ` AND (
        v.category_id = ?
        OR CAST(v.category_id AS TEXT) = CAST(? AS TEXT)
        OR EXISTS (
          SELECT 1 FROM categories cat_filter
          WHERE (cat_filter.id = ? OR CAST(cat_filter.id AS TEXT) = CAST(? AS TEXT))
            AND (
              CAST(v.category_id AS TEXT) = CAST(cat_filter.id AS TEXT)
              OR (cat_filter.slug IS NOT NULL AND TRIM(cat_filter.slug) != '' AND LOWER(TRIM(CAST(v.category_id AS TEXT))) = LOWER(TRIM(cat_filter.slug)))
              OR (cat_filter.name IS NOT NULL AND TRIM(cat_filter.name) != '' AND LOWER(TRIM(CAST(v.category_id AS TEXT))) = LOWER(TRIM(cat_filter.name)))
              OR (cat_filter.name IS NOT NULL AND TRIM(cat_filter.name) != '' AND (
                LOWER(COALESCE(v.title, '')) LIKE '%' || LOWER(TRIM(cat_filter.name)) || '%'
                OR LOWER(COALESCE(v.tags, '')) LIKE '%' || LOWER(TRIM(cat_filter.name)) || '%'
              ))
              OR (cat_filter.slug IS NOT NULL AND TRIM(cat_filter.slug) != '' AND (
                LOWER(COALESCE(v.title, '')) LIKE '%' || LOWER(TRIM(cat_filter.slug)) || '%'
                OR LOWER(COALESCE(v.tags, '')) LIKE '%' || LOWER(TRIM(cat_filter.slug)) || '%'
              ))
            )
        )
      )`;
      params.push(targetCatId, targetCatId, targetCatId, targetCatId);
    }

    if (featured === '1' || featured === 'true') {
      sql += ' AND v.is_featured = 1';
    }

    if (search) {
      sql += ' AND (v.title LIKE ? OR v.description LIKE ? OR v.tags LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    sql += ' ORDER BY v.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const stmt = context.env.DB.prepare(sql).bind(...params);
    const { results } = await stmt.all();

    return new Response(
      JSON.stringify({
        success: true,
        videos: results || [],
        meta: {
          total: results?.length || 0,
          source: 'Cloudflare D1 (env.DB)',
        },
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=0, s-maxage=5, must-revalidate',
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
    const {
      title,
      slug,
      description,
      video_url,
      backup_video_url,
      thumbnail_url,
      duration,
      category_id,
      tags,
      is_featured,
      status,
    } = body;

    if (!title || !video_url || !thumbnail_url) {
      return new Response(
        JSON.stringify({ success: false, error: 'Title, Primary Video URL, and Thumbnail URL required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const baseSlug =
      (slug || title)
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'stream';

    const existingSlug = await context.env.DB.prepare(
      'SELECT id FROM videos WHERE LOWER(TRIM(slug)) = LOWER(TRIM(?)) LIMIT 1'
    )
      .bind(baseSlug)
      .first();

    const uniqueSuffix = `${Date.now().toString(36).slice(-4)}${Math.random().toString(36).slice(2, 5)}`;
    const cleanSlug = existingSlug ? `${baseSlug}-${uniqueSuffix}` : baseSlug;

    let parsedDuration = 0;
    if (typeof duration === 'number') {
      parsedDuration = Math.max(0, Math.floor(duration));
    } else if (typeof duration === 'string') {
      const trimmed = duration.trim();
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':').map((p) => parseInt(p.trim(), 10) || 0);
        if (parts.length === 2) parsedDuration = parts[0] * 60 + parts[1];
        else if (parts.length === 3) parsedDuration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else {
        parsedDuration = parseInt(trimmed, 10) || 0;
      }
    }

    const stmt = context.env.DB.prepare(`
      INSERT INTO videos 
      (title, slug, description, video_url, backup_video_url, thumbnail_url, duration, category_id, tags, is_featured, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title,
      cleanSlug,
      description || '',
      video_url,
      backup_video_url ? String(backup_video_url).trim() : '',
      thumbnail_url,
      parsedDuration,
      Number(category_id) || 1,
      tags || '',
      is_featured ? 1 : 0,
      status || 'published'
    );

    const result = await stmt.run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Video successfully inserted into Cloudflare D1',
        id: result.meta?.last_row_id,
        slug: cleanSlug,
      }),
      { status: 201, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to insert video' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    const {
      id,
      title,
      duration,
      category_id,
      video_url,
      backup_video_url,
      thumbnail_url,
    } = body;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Video ID required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    let parsedDuration = 0;
    if (typeof duration === 'number') {
      parsedDuration = Math.max(0, Math.floor(duration));
    } else if (typeof duration === 'string') {
      const trimmed = duration.trim();
      if (trimmed.includes(':')) {
        const parts = trimmed.split(':').map((p) => parseInt(p.trim(), 10) || 0);
        if (parts.length === 2) parsedDuration = parts[0] * 60 + parts[1];
        else if (parts.length === 3) parsedDuration = parts[0] * 3600 + parts[1] * 60 + parts[2];
      } else {
        parsedDuration = parseInt(trimmed, 10) || 0;
      }
    }

    const stmt = context.env.DB.prepare(`
      UPDATE videos 
      SET title = ?, duration = ?, category_id = ?, video_url = ?, backup_video_url = ?, thumbnail_url = ? 
      WHERE id = ?
    `).bind(
      String(title || '').trim(),
      parsedDuration,
      Number(category_id) || 1,
      String(video_url || '').trim(),
      backup_video_url ? String(backup_video_url).trim() : '',
      String(thumbnail_url || '').trim(),
      Number(id)
    );

    await stmt.run();

    return new Response(
      JSON.stringify({ success: true, message: 'Video updated successfully' }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to update video' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    const url = new URL(context.request.url);
    const body: any = await context.request.json().catch(() => ({}));
    const id = url.searchParams.get('id') || body.id;

    if (!id) {
      return new Response(JSON.stringify({ success: false, error: 'Video ID required' }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    await context.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(Number(id)).run();

    return new Response(JSON.stringify({ success: true, message: 'Video deleted successfully' }), {
      headers: corsHeaders,
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: corsHeaders,
    });
  }
};
