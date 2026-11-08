import { checkFloodProtection } from './_rateLimit.ts';

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

async function ensureReportsTable(db: D1Database) {
  try {
    await db.exec(`
      CREATE TABLE IF NOT EXISTS reports (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        video_id INTEGER NOT NULL,
        video_title TEXT NOT NULL,
        reason TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  } catch {
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    await ensureReportsTable(context.env.DB);

    const { results } = await context.env.DB.prepare(`
      SELECT 
        r.id, r.video_id, r.video_title, r.reason, r.created_at,
        v.thumbnail_url, v.video_url, v.backup_video_url, v.status as video_status
      FROM reports r
      LEFT JOIN videos v ON r.video_id = v.id
      ORDER BY r.created_at DESC
    `).all();

    return new Response(
      JSON.stringify({
        success: true,
        reports: results || [],
        count: results?.length || 0,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to fetch reports' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { isLimited, retryAfter } = checkFloodProtection(context.request);
  if (isLimited) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Too Many Requests',
      }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          'Retry-After': String(retryAfter),
        },
      }
    );
  }

  try {
    await ensureReportsTable(context.env.DB);

    const body = (await context.request.json()) as {
      video_id: number | string;
      video_title?: string;
      reason?: string;
    };

    if (!body || !body.video_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Video ID is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const videoId = Number(body.video_id);
    const videoTitle = body.video_title ? String(body.video_title).trim() : `Video #${videoId}`;
    const reason = body.reason ? String(body.reason).trim() : 'Stream Broken / Not Playing';

    const stmt = context.env.DB.prepare(`
      INSERT INTO reports (video_id, video_title, reason, created_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `).bind(videoId, videoTitle, reason);

    const info = await stmt.run();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Report submitted to admin',
        id: info.meta.last_row_id,
      }),
      { status: 201, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to submit report' }),
      { status: 500, headers: corsHeaders }
    );
  }
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  try {
    await ensureReportsTable(context.env.DB);

    const url = new URL(context.request.url);
    let body: any = {};
    try {
      body = await context.request.json();
    } catch {
      body = {};
    }

    const action = url.searchParams.get('action') || body.action || '';
    const reportId = url.searchParams.get('id') || body.id;
    const videoId = url.searchParams.get('video_id') || body.video_id;

    if (action === 'purge' || (body.purge === true || url.searchParams.get('purge') === 'true')) {
      const targetVideoId = Number(videoId || body.video_id);
      if (!targetVideoId) {
        return new Response(
          JSON.stringify({ success: false, error: 'Target Video ID required for purge action' }),
          { status: 400, headers: corsHeaders }
        );
      }

      await context.env.DB.batch([
        context.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(targetVideoId),
        context.env.DB.prepare('DELETE FROM reports WHERE video_id = ?').bind(targetVideoId),
      ]);

      return new Response(
        JSON.stringify({
          success: true,
          action: 'purge',
          purged_video_id: targetVideoId,
          message: `Video #${targetVideoId} permanently purged from D1 and reports cleared`,
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    if (reportId) {
      await context.env.DB.prepare('DELETE FROM reports WHERE id = ?').bind(Number(reportId)).run();
      return new Response(
        JSON.stringify({
          success: true,
          action: 'dismiss',
          dismissed_report_id: Number(reportId),
          message: 'Report dismissed',
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Report ID or action=purge required' }),
      { status: 400, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Failed to process report action' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
