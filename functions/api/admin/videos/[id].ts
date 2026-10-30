// Cloudflare Pages Function: /api/admin/videos/[id]
// PATCH, DELETE, GET, POST, OPTIONS - Video manipulation by ID in Cloudflare D1

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
    const { is_featured, status } = body;

    if (is_featured !== undefined) {
      const stmt = context.env.DB.prepare('UPDATE videos SET is_featured = ? WHERE id = ?')
        .bind(is_featured ? 1 : 0, id);
      await stmt.run();
    }

    if (status !== undefined) {
      const stmt = context.env.DB.prepare('UPDATE videos SET status = ? WHERE id = ?')
        .bind(status, id);
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
  // Support POST as alternate to PATCH/DELETE
  return onRequestPatch(context);
};
