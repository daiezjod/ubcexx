// Cloudflare Pages Function: /api/admin/videos (GET list all, POST insert into D1)

interface Env {
  DB: D1Database;
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const stmt = context.env.DB.prepare(`
      SELECT v.*, c.name as category_name
      FROM videos v
      LEFT JOIN categories c ON v.category_id = c.id
      ORDER BY v.created_at DESC
    `);
    const { results } = await stmt.all();

    return new Response(JSON.stringify({ success: true, videos: results }), {
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
      return new Response(JSON.stringify({ success: false, error: 'Title, Primary Video URL, and Thumbnail URL required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const cleanSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

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
      Number(duration) || 0,
      Number(category_id) || 1,
      tags || '',
      is_featured ? 1 : 0,
      status || 'published'
    );

    const result = await stmt.run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Video inserted into Cloudflare D1',
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
