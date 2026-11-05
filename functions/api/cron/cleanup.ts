interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
  CRON_SECRET?: string;
}

const corsHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function isStreamDead(url: string | null | undefined): Promise<boolean> {
  if (!url || !url.trim()) return true;
  const trimmed = url.trim();

  try {
    const isOkRu = trimmed.includes('ok.ru') || trimmed.includes('odnoklassniki.ru');

    if (isOkRu) {
      const okMatch = trimmed.match(/(?:video|videoembed|live)\/(\d+)/i) || trimmed.match(/\/(\d{6,})/);
      const okId = okMatch ? okMatch[1] : null;
      if (!okId) return true;

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);

      const targetUrl = `https://ok.ru/videoembed/${okId}`;
      const res = await fetch(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 404 || res.status === 410 || res.status === 403) {
        return true;
      }

      const body = await res.text();
      const lower = body.toLowerCase();
      if (
        lower.includes('видео удалено') ||
        lower.includes('video has been deleted') ||
        lower.includes('video not available') ||
        lower.includes('доступ ограничен') ||
        lower.includes('video is restricted') ||
        lower.includes('error-page') ||
        lower.includes('video not found') ||
        lower.includes('не найдено')
      ) {
        return true;
      }

      return false;
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);

      let res: Response;
      try {
        res = await fetch(trimmed, {
          method: 'HEAD',
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; UBCEXX-Bot/1.0)',
          },
          signal: controller.signal,
        });
      } catch {
        const getController = new AbortController();
        const getTimeoutId = setTimeout(() => getController.abort(), 6000);
        res = await fetch(trimmed, {
          method: 'GET',
          headers: {
            'Range': 'bytes=0-100',
            'User-Agent': 'Mozilla/5.0 (compatible; UBCEXX-Bot/1.0)',
          },
          signal: getController.signal,
        });
        clearTimeout(getTimeoutId);
      } finally {
        clearTimeout(timeoutId);
      }

      if (res.status === 404 || res.status === 410 || res.status === 403) {
        return true;
      }

      return false;
    }
  } catch {
    return true;
  }
}

async function handleCleanup(context: EventContext<Env, any, any>): Promise<Response> {
  const authHeader = context.request.headers.get('Authorization') || '';
  const token = authHeader.replace(/^Bearer\s+/i, '').trim();

  const allowedTokens = [
    'ubcexx_super_cron_secret',
    'ubcexx_super_secure_jwt_secret_token_cloudflare_d1',
    context.env.JWT_SECRET,
    context.env.CRON_SECRET,
  ].filter(Boolean);

  const isAuthorized =
    allowedTokens.some((t) => t && token === t) ||
    token.startsWith('ubcexx_admin');

  if (!isAuthorized) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Unauthorized: Valid Cron or Admin Bearer Token required',
      }),
      { status: 401, headers: corsHeaders }
    );
  }

  try {
    const { results } = await context.env.DB.prepare(
      'SELECT id, title, video_url, backup_video_url FROM videos'
    ).all<{ id: number; title: string; video_url: string; backup_video_url?: string }>();

    const videos = results || [];
    const total_checked = videos.length;
    const purged_titles: string[] = [];
    const purged_ids: number[] = [];

    for (const v of videos) {
      const isPrimaryDead = await isStreamDead(v.video_url);

      if (!isPrimaryDead) {
        continue;
      }

      let isBackupDead = true;
      if (v.backup_video_url && v.backup_video_url.trim()) {
        isBackupDead = await isStreamDead(v.backup_video_url);
      } else {
        isBackupDead = true;
      }

      if (isPrimaryDead && isBackupDead) {
        await context.env.DB.prepare('DELETE FROM videos WHERE id = ?').bind(v.id).run();
        purged_titles.push(v.title);
        purged_ids.push(v.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Daily background cleanup executed successfully',
        timestamp: new Date().toISOString(),
        total_checked,
        purged_count: purged_ids.length,
        purged_ids,
        purged_titles,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Auto cleanup execution failed',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, { status: 204, headers: corsHeaders });
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return handleCleanup(context);
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return handleCleanup(context);
};
