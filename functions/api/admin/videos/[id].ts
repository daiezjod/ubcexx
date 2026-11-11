interface Env {
  DB: D1Database;
}

const corsHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization') || '';
    if (!authHeader.includes('Bearer')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: UBCEXX Admin token required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const id = Number(context.params.id);
    const body: any = await context.request.json().catch(() => ({}));
    const {
      title,
      duration,
      category_id,
      video_url,
      backup_video_url,
      thumbnail_url,
      description,
      tags,
      is_featured,
      status,
    } = body;

    let parsedDuration: number | undefined = undefined;
    if (duration !== undefined) {
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
    }

    const updates: string[] = [];
    const values: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(String(title).trim());
      const cleanSlug = String(title).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      updates.push('slug = ?');
      values.push(cleanSlug);
    }
    if (parsedDuration !== undefined) {
      updates.push('duration = ?');
      values.push(parsedDuration);
    }
    if (category_id !== undefined) {
      updates.push('category_id = ?');
      values.push(Number(category_id) || 1);
    }
    if (video_url !== undefined) {
      updates.push('video_url = ?');
      values.push(String(video_url).trim());
    }
    if (backup_video_url !== undefined) {
      updates.push('backup_video_url = ?');
      values.push(String(backup_video_url).trim());
    }
    if (thumbnail_url !== undefined) {
      updates.push('thumbnail_url = ?');
      values.push(String(thumbnail_url).trim());
    }
    if (description !== undefined) {
      updates.push('description = ?');
      values.push(String(description).trim());
    }
    if (tags !== undefined) {
      updates.push('tags = ?');
      values.push(String(tags).trim());
    }
    if (is_featured !== undefined) {
      updates.push('is_featured = ?');
      values.push(is_featured ? 1 : 0);
    }
    if (status !== undefined) {
      updates.push('status = ?');
      values.push(String(status).trim());
    }

    if (updates.length > 0) {
      values.push(id);
      const sql = `UPDATE videos SET ${updates.join(', ')} WHERE id = ?`;
      const stmt = context.env.DB.prepare(sql).bind(...values);
      await stmt.run();
    }

    return new Response(
      JSON.stringify({ success: true, message: `Video #${id} updated successfully` }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to update video' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPut: PagesFunction<Env> = async (context) => {
  return onRequestPatch(context);
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
    const stmt = context.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(id);
    const result = await stmt.run();

    return new Response(
      JSON.stringify({
        success: true,
        message: `Video #${id} deleted from Cloudflare D1 database`,
        deletedCount: result.meta?.changes ?? 1,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to delete video' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const id = Number(context.params.id);
    const stmt = context.env.DB.prepare('SELECT * FROM videos WHERE id = ?').bind(id);
    const video = await stmt.first();

    if (!video) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: true, video }),
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
  return onRequestPatch(context);
};
