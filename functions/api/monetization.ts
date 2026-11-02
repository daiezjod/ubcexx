// Cloudflare Pages Function: /api/monetization (GET & POST monetization settings)

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
    const row: any = await stmt.first();

    if (row) {
      // Safely parse top_rail_cards back to JSON array
      if (typeof row.top_rail_cards === 'string') {
        try {
          row.top_rail_cards = JSON.parse(row.top_rail_cards);
        } catch {
          row.top_rail_cards = [];
        }
      } else if (!row.top_rail_cards) {
        row.top_rail_cards = [];
      }

      // Safely parse placement_zones back to JSON object
      if (typeof row.placement_zones === 'string') {
        try {
          row.placement_zones = JSON.parse(row.placement_zones);
        } catch {
          row.placement_zones = {};
        }
      } else if (!row.placement_zones) {
        row.placement_zones = {};
      }

      // Populate aliases for backwards & forwards compatibility
      if (row.preroll_skip_seconds === undefined && row.preroll_skip_offset !== undefined) {
        row.preroll_skip_seconds = row.preroll_skip_offset;
      }
      if (row.preroll_skip_offset === undefined && row.preroll_skip_seconds !== undefined) {
        row.preroll_skip_offset = row.preroll_skip_seconds;
      }
      if (row.native_ads_enabled === undefined && row.native_enabled !== undefined) {
        row.native_ads_enabled = row.native_enabled;
      }
      if (row.native_enabled === undefined && row.native_ads_enabled !== undefined) {
        row.native_enabled = row.native_ads_enabled;
      }
      if (row.native_ads_code === undefined && row.native_code !== undefined) {
        row.native_ads_code = row.native_code;
      }
      if (row.native_code === undefined && row.native_ads_code !== undefined) {
        row.native_code = row.native_ads_code;
      }
    }

    return new Response(
      JSON.stringify({ success: true, monetization: row || null }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'public, max-age=10',
        },
      }
    );
  } catch (err: any) {
    console.error('Monetization get error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body: any = await context.request.json().catch(() => ({}));
    
    // Safely read incoming body fields
    const preroll_enabled = body.preroll_enabled !== undefined ? (body.preroll_enabled ? 1 : 0) : 1;
    const preroll_video_url = body.preroll_video_url || '';
    const preroll_skip_seconds = Number(body.preroll_skip_seconds ?? body.preroll_skip_offset ?? 5) || 5;
    const native_ads_enabled = (body.native_ads_enabled !== undefined ? body.native_ads_enabled : body.native_enabled) ? 1 : 0;
    const native_ads_code = body.native_ads_code ?? body.native_code ?? '';

    // Store top_rail_cards as JSON string
    const top_rail_cards = typeof body.top_rail_cards === 'string'
      ? body.top_rail_cards
      : JSON.stringify(body.top_rail_cards || []);

    // Store placement_zones as JSON string
    const placement_zones = typeof body.placement_zones === 'string'
      ? body.placement_zones
      : JSON.stringify(body.placement_zones || {});

    // Ensure monetization table exists
    await context.env.DB.prepare(`
      CREATE TABLE IF NOT EXISTS monetization (
        id INTEGER PRIMARY KEY DEFAULT 1,
        preroll_enabled INTEGER DEFAULT 1,
        preroll_video_url TEXT DEFAULT '',
        preroll_skip_seconds INTEGER DEFAULT 5,
        native_ads_enabled INTEGER DEFAULT 1,
        native_ads_code TEXT DEFAULT '',
        top_rail_cards TEXT DEFAULT '[]',
        placement_zones TEXT DEFAULT '{}'
      )
    `).run().catch(() => {});

    // Ensure all required columns exist in D1 (avoids "no such column" 500 errors if migrated earlier)
    const addCol = async (colDef: string) => {
      try {
        await context.env.DB.prepare(`ALTER TABLE monetization ADD COLUMN ${colDef}`).run();
      } catch (_) {
        // Safe to ignore if column already exists
      }
    };

    await addCol('preroll_skip_seconds INTEGER DEFAULT 5');
    await addCol('preroll_skip_offset INTEGER DEFAULT 5');
    await addCol('preroll_click_url TEXT DEFAULT ""');
    await addCol('native_ads_enabled INTEGER DEFAULT 1');
    await addCol('native_enabled INTEGER DEFAULT 1');
    await addCol('native_ads_code TEXT DEFAULT ""');
    await addCol('native_code TEXT DEFAULT ""');
    await addCol('native_placements TEXT DEFAULT "top_rail,under_player,in_feed"');
    await addCol('top_rail_enabled INTEGER DEFAULT 1');
    await addCol('top_rail_cards TEXT DEFAULT "[]"');
    await addCol('placement_zones TEXT DEFAULT "{}"');
    await addCol('updated_at TEXT DEFAULT ""');

    // Ensure row id = 1 exists
    const rowExists = await context.env.DB.prepare('SELECT id FROM monetization WHERE id = 1').first().catch(() => null);
    if (!rowExists) {
      await context.env.DB.prepare('INSERT OR IGNORE INTO monetization (id) VALUES (1)').run().catch(() => {});
    }

    // Execute safe UPDATE on row id = 1
    const stmt = context.env.DB.prepare(`
      UPDATE monetization 
      SET preroll_enabled = ?, 
          preroll_video_url = ?, 
          preroll_skip_seconds = ?, 
          native_ads_enabled = ?, 
          native_ads_code = ?, 
          top_rail_cards = ?, 
          placement_zones = ?
      WHERE id = 1
    `).bind(
      preroll_enabled,
      preroll_video_url,
      preroll_skip_seconds,
      native_ads_enabled,
      native_ads_code,
      top_rail_cards,
      placement_zones
    );

    await stmt.run();

    // Also update legacy columns if available for backwards compatibility
    try {
      await context.env.DB.prepare(`
        UPDATE monetization 
        SET preroll_click_url = ?,
            preroll_skip_offset = ?,
            native_enabled = ?,
            native_code = ?,
            native_placements = ?,
            top_rail_enabled = ?,
            updated_at = datetime('now')
        WHERE id = 1
      `).bind(
        body.preroll_click_url || '',
        preroll_skip_seconds,
        native_ads_enabled,
        native_ads_code,
        body.native_placements || 'top_rail,under_player,in_feed',
        body.top_rail_enabled !== undefined ? (body.top_rail_enabled ? 1 : 0) : 1
      ).run();
    } catch (_) {
      // Ignore if optional legacy columns fail
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Monetization updated successfully',
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    console.error('Monetization update error:', err);
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to update monetization settings' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
