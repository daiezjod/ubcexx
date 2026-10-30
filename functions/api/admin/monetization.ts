// Cloudflare Pages Function: /api/admin/monetization
// GET & POST - UBCEXX Monetization settings (Pre-Roll & Native Banners)

interface Env {
  DB: D1Database;
}

const corsHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
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
    const stmt = context.env.DB.prepare('SELECT * FROM monetization WHERE id = 1');
    const monetization = await stmt.first();

    return new Response(
      JSON.stringify({ success: true, monetization: monetization || null }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to fetch monetization settings' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const authHeader = context.request.headers.get('Authorization') || '';
    if (!authHeader.includes('Bearer')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized: UBCEXX Admin token required' }),
        { status: 401, headers: corsHeaders }
      );
    }

    const body: any = await context.request.json().catch(() => ({}));
    const {
      preroll_enabled,
      preroll_video_url,
      preroll_click_url,
      preroll_skip_offset,
      native_enabled,
      native_code,
      native_placements,
    } = body;

    const stmt = context.env.DB.prepare(`
      INSERT INTO monetization (id, preroll_enabled, preroll_video_url, preroll_click_url, preroll_skip_offset, native_enabled, native_code, native_placements, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (id) DO UPDATE SET
        preroll_enabled = excluded.preroll_enabled,
        preroll_video_url = excluded.preroll_video_url,
        preroll_click_url = excluded.preroll_click_url,
        preroll_skip_offset = excluded.preroll_skip_offset,
        native_enabled = excluded.native_enabled,
        native_code = excluded.native_code,
        native_placements = excluded.native_placements,
        updated_at = datetime('now')
    `).bind(
      preroll_enabled ? 1 : 0,
      preroll_video_url || '',
      preroll_click_url || '',
      Number(preroll_skip_offset) || 5,
      native_enabled ? 1 : 0,
      native_code || '',
      native_placements || 'under_player,in_feed'
    );

    await stmt.run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monetization settings updated in Cloudflare D1',
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to update monetization settings' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
