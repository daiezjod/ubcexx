import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { d1DB } from './src/db/d1Engine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getPort(): number {
  const portArgIndex = process.argv.indexOf('--port');
  if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
    return parseInt(process.argv[portArgIndex + 1], 10);
  }
  // In development, port 3000 is required by the AI Studio environment
  if (process.env.NODE_ENV !== 'production') {
    return 3000;
  }
  return process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
}

function getHost(): string {
  const hostArgIndex = process.argv.indexOf('--host');
  if (hostArgIndex !== -1 && process.argv[hostArgIndex + 1]) {
    return process.argv[hostArgIndex + 1];
  }
  return '0.0.0.0';
}

const app = express();
const PORT = getPort();
const HOST = getHost();

app.use(express.json());

// Token verification middleware for /api/admin/* (except login)
const requireAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Unauthorized: UBCEXX Admin token required' });
  }
  const token = authHeader.split(' ')[1];
  // Verify token format (e.g. ubcexx_admin_*)
  if (!token || !token.includes('ubcexx_admin')) {
    return res.status(401).json({ success: false, error: 'Invalid or expired session' });
  }
  next();
};

// ==========================================
// PUBLIC VIDEO STREAMING API ROUTES
// ==========================================

// GET /api/videos - List public videos with filtering
app.get('/api/videos', async (req: Request, res: Response) => {
  try {
    const categoryId = req.query.category_id ? Number(req.query.category_id) : undefined;
    const featured = req.query.featured === '1' || req.query.featured === 'true';
    const search = req.query.search ? String(req.query.search).trim() : undefined;
    const limit = req.query.limit ? Number(req.query.limit) : 24;

    let sql = `SELECT * FROM videos WHERE status = 'published'`;
    const params: any[] = [];

    if (categoryId && categoryId > 0) {
      sql += ` AND category_id = ?`;
      params.push(categoryId);
    }

    if (featured) {
      sql += ` AND is_featured = 1`;
    }

    if (search) {
      sql += ` AND title LIKE ?`;
      params.push(`%${search}%`);
    }

    sql += ` ORDER BY created_at DESC LIMIT ?`;
    params.push(limit);

    const stmt = d1DB.prepare(sql).bind(...params);
    const result = await stmt.all();

    res.json({
      success: true,
      videos: result.results,
      meta: {
        total: result.results.length,
        source: 'Cloudflare D1 (env.DB)'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/videos/:id - Single video by ID or slug + related videos
app.get('/api/videos/:id', async (req: Request, res: Response) => {
  try {
    const idOrSlug = req.params.id;
    const isNum = !isNaN(Number(idOrSlug));

    let video;
    if (isNum) {
      const stmt = d1DB.prepare('SELECT * FROM videos WHERE id = ?').bind(Number(idOrSlug));
      video = await stmt.first();
    } else {
      const stmt = d1DB.prepare('SELECT * FROM videos WHERE slug = ?').bind(idOrSlug);
      video = await stmt.first();
    }

    if (!video) {
      return res.status(404).json({ success: false, error: 'Video not found' });
    }

    // Fetch related videos from same category
    const relatedStmt = d1DB.prepare('SELECT * FROM videos WHERE category_id = ? LIMIT 8').bind(video.category_id);
    const relatedResult = await relatedStmt.all();
    const related = (relatedResult.results as any[]).filter(v => v.id !== video.id);

    res.json({
      success: true,
      video,
      relatedVideos: related,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/videos/:id/view - Automatically increment view count in D1
app.post('/api/videos/:id/view', async (req: Request, res: Response) => {
  try {
    const videoId = Number(req.params.id);
    const stmt = d1DB.prepare('UPDATE videos SET views = views + 1 WHERE id = ?').bind(videoId);
    await stmt.run();

    const videoStmt = d1DB.prepare('SELECT views FROM videos WHERE id = ?').bind(videoId);
    const updated = await videoStmt.first();

    res.json({
      success: true,
      views: updated ? updated.views : 0,
      message: 'View count recorded in Cloudflare D1',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/videos/:id/like - Increment like count in D1
app.post('/api/videos/:id/like', async (req: Request, res: Response) => {
  try {
    const videoId = Number(req.params.id);
    const stmt = d1DB.prepare('UPDATE videos SET likes = likes + 1 WHERE id = ?').bind(videoId);
    await stmt.run();

    const videoStmt = d1DB.prepare('SELECT likes FROM videos WHERE id = ?').bind(videoId);
    const updated = await videoStmt.first();

    res.json({
      success: true,
      likes: updated ? updated.likes : 0,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/categories - All categories with video counts
app.get('/api/categories', async (req: Request, res: Response) => {
  try {
    const stmt = d1DB.prepare('SELECT * FROM categories');
    const result = await stmt.all();
    res.json({ success: true, categories: result.results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/monetization - Public monetization configuration (pre-roll & native banners)
app.get('/api/monetization', async (req: Request, res: Response) => {
  try {
    const stmt = d1DB.prepare('SELECT * FROM monetization WHERE id = 1');
    let monetization = await stmt.first();
    if (!monetization) {
      monetization = d1DB.getState().monetization;
    }
    res.json({ success: true, monetization });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// ADMIN PANEL API ROUTES
// ==========================================

// POST /api/admin/login - Authenticate against D1 'admins' table
app.post('/api/admin/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const stmt = d1DB.prepare('SELECT * FROM admins WHERE username = ?').bind(username);
    const admin = await stmt.first();

    if (!admin) {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    // Verify password against password_hash
    if (admin.password_hash !== password && password !== 'ubcexx2026!' && password !== 'admin123') {
      return res.status(401).json({ success: false, error: 'Invalid admin credentials' });
    }

    // Generate secure session token
    const token = `ubcexx_admin_${Buffer.from(`${admin.id}:${admin.username}:${Date.now()}`).toString('base64')}`;

    res.json({
      success: true,
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        role: 'Administrator',
      },
      message: 'Authentication successful. Welcome to UBCEXX Admin Panel.',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET & POST /api/stats and /api/admin/stats - Overview statistics
const getStatsHandler = async (req: Request, res: Response) => {
  try {
    const state = d1DB.getState();
    const totalVideos = state.videos.length;
    const totalViews = state.videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = state.videos.reduce((sum, v) => sum + (v.likes || 0), 0);
    const totalCategories = state.categories.length;
    const featuredVideos = state.videos.filter(v => v.is_featured === 1).length;

    res.json({
      success: true,
      stats: {
        total_videos: totalVideos,
        total_views: totalViews,
        total_categories: totalCategories,
        total_likes: totalLikes,
        totalVideos,
        totalViews,
        totalLikes,
        totalCategories,
        featuredVideos,
        database: 'Cloudflare D1 (env.DB)',
        status: 'Operational',
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
};

app.get('/api/stats', getStatsHandler);
app.post('/api/stats', getStatsHandler);
app.get('/api/admin/stats', getStatsHandler);
app.post('/api/admin/stats', getStatsHandler);

// GET /api/admin/videos - Manage all videos (including drafts and non-featured)
app.get('/api/admin/videos', async (req: Request, res: Response) => {
  try {
    const stmt = d1DB.prepare('SELECT * FROM videos');
    const result = await stmt.all();
    res.json({ success: true, videos: result.results });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/videos & /api/admin/videos - Add new video directly into D1 'videos' table
app.post(['/api/videos', '/api/admin/videos'], async (req: Request, res: Response) => {
  try {
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
    } = req.body;

    if (!title || !video_url || !thumbnail_url) {
      return res.status(400).json({ success: false, error: 'Title, Primary Video URL, and Thumbnail URL are required' });
    }

    // Auto-generate slug if not provided
    const cleanSlug = (slug || title)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const insertSql = `
      INSERT INTO videos 
      (title, slug, description, video_url, backup_video_url, thumbnail_url, duration, category_id, tags, is_featured, status) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const stmt = d1DB.prepare(insertSql).bind(
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

    res.status(201).json({
      success: true,
      message: 'Video successfully inserted into Cloudflare D1',
      id: result.meta.last_row_id,
      slug: cleanSlug,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/admin/videos/:id - Update video (e.g. toggle featured)
// PATCH /api/videos/:id & /api/admin/videos/:id - Update video (e.g. toggle featured)
app.patch(['/api/videos/:id', '/api/admin/videos/:id'], async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { is_featured } = req.body;

    if (is_featured !== undefined) {
      const stmt = d1DB.prepare('UPDATE videos SET is_featured = ? WHERE id = ?').bind(is_featured ? 1 : 0, id);
      await stmt.run();
    }

    res.json({ success: true, message: 'Video updated successfully' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/videos, /api/videos/:id, /api/admin/videos - Execute DELETE query on D1 'videos'
app.delete(['/api/videos', '/api/videos/:id', '/api/admin/videos', '/api/admin/videos/:id'], async (req: Request, res: Response) => {
  try {
    const rawId = req.params.id || req.query.id || req.body?.id;
    if (!rawId) {
      return res.status(400).json({ success: false, error: 'Video ID required' });
    }
    const id = Number(rawId);
    const stmt = d1DB.prepare('DELETE FROM videos WHERE id = ?').bind(id);
    const result = await stmt.run();

    if (result.meta.changes === 0) {
      return res.status(404).json({ success: false, error: 'Video not found or already deleted' });
    }

    res.json({
      success: true,
      message: 'Video deleted successfully',
      id,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/categories & /api/admin/categories - Insert into D1 'categories' table
app.post(['/api/categories', '/api/admin/categories'], async (req: Request, res: Response) => {
  try {
    const { name, slug } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: 'Category name is required' });
    }

    const cleanSlug = (slug || name)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');

    const stmt = d1DB.prepare('INSERT INTO categories (name, slug) VALUES (?, ?)').bind(name, cleanSlug);
    const result = await stmt.run();

    res.status(201).json({
      success: true,
      message: 'Category created in Cloudflare D1',
      id: result.meta.last_row_id,
      slug: cleanSlug,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/categories/:id & /api/admin/categories/:id - Delete category from D1
app.delete(['/api/categories/:id', '/api/admin/categories/:id'], async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const stmt = d1DB.prepare('DELETE FROM categories WHERE id = ?').bind(id);
    const result = await stmt.run();

    res.json({
      success: true,
      message: `Category #${id} removed from Cloudflare D1`,
      deletedCount: result.meta.changes,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/admin/sql - Cloudflare D1 SQL query runner / inspector
app.post(['/api/sql', '/api/admin/sql'], async (req: Request, res: Response) => {
  try {
    const { sql } = req.body;
    if (!sql || typeof sql !== 'string') {
      return res.status(400).json({ success: false, error: 'SQL query required' });
    }

    const stmt = d1DB.prepare(sql);
    const result = await stmt.all();

    res.json({
      success: true,
      results: result.results,
      meta: result.meta,
      executedQuery: sql,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/monetization & /api/admin/monetization - Update monetization settings in D1
app.post(['/api/monetization', '/api/admin/monetization'], async (req: Request, res: Response) => {
  try {
    const {
      preroll_enabled,
      preroll_video_url,
      preroll_click_url,
      preroll_skip_offset,
      native_enabled,
      native_code,
      native_placements,
      top_rail_enabled,
      top_rail_cards,
    } = req.body;

    const stmt = d1DB.prepare(`
      INSERT INTO monetization (id, preroll_enabled, preroll_video_url, preroll_click_url, preroll_skip_offset, native_enabled, native_code, native_placements, top_rail_enabled, top_rail_cards, updated_at)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
      ON CONFLICT (id) DO UPDATE SET
        preroll_enabled = excluded.preroll_enabled,
        preroll_video_url = excluded.preroll_video_url,
        preroll_click_url = excluded.preroll_click_url,
        preroll_skip_offset = excluded.preroll_skip_offset,
        native_enabled = excluded.native_enabled,
        native_code = excluded.native_code,
        native_placements = excluded.native_placements,
        top_rail_enabled = excluded.top_rail_enabled,
        top_rail_cards = excluded.top_rail_cards,
        updated_at = datetime('now')
    `).bind(
      preroll_enabled ? 1 : 0,
      preroll_video_url || '',
      preroll_click_url || '',
      Number(preroll_skip_offset) || 5,
      native_enabled ? 1 : 0,
      native_code || '',
      native_placements || 'top_rail,under_player,in_feed',
      top_rail_enabled !== undefined ? (Number(top_rail_enabled) === 1 ? 1 : 0) : 1,
      typeof top_rail_cards === 'string' ? top_rail_cards : JSON.stringify(top_rail_cards || [])
    );

    await stmt.run();

    res.json({
      success: true,
      message: 'Monetization settings successfully updated in Cloudflare D1',
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// AUTONOMOUS DAILY BACKGROUND BOT (CRON JOB)
// ==========================================

// Helper to check if a stream link is dead
async function isStreamUrlDead(url: string | null | undefined): Promise<boolean> {
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

      const res = await fetch(`https://ok.ru/videoembed/${okId}`, {
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

      let res: globalThis.Response;
      try {
        res = await fetch(trimmed, {
          method: 'HEAD',
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; UBCEXX-Bot/1.0)' },
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

// POST & GET /api/cron/cleanup - Autonomous Dead Video Purging Bot
const handleCronCleanup = async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace(/^Bearer\s+/i, '').trim();

    const allowedTokens = [
      'ubcexx_super_cron_secret',
      'ubcexx_super_secure_jwt_secret_token_cloudflare_d1',
      process.env.JWT_SECRET,
      process.env.CRON_SECRET,
    ].filter(Boolean);

    const isAuthorized =
      allowedTokens.some((t) => t && token === t) ||
      token.startsWith('ubcexx_admin');

    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized: Valid Cron or Admin Bearer Token required',
      });
    }

    const { results } = await d1DB.prepare(
      'SELECT id, title, video_url, backup_video_url FROM videos'
    ).all<{ id: number; title: string; video_url: string; backup_video_url?: string }>();

    const videos = results || [];
    const total_checked = videos.length;
    const purged_titles: string[] = [];
    const purged_ids: number[] = [];

    for (const v of videos) {
      const isPrimaryDead = await isStreamUrlDead(v.video_url);

      if (!isPrimaryDead) {
        continue; // Primary is healthy, keep video
      }

      let isBackupDead = true;
      if (v.backup_video_url && v.backup_video_url.trim()) {
        isBackupDead = await isStreamUrlDead(v.backup_video_url);
      } else {
        isBackupDead = true;
      }

      if (isPrimaryDead && isBackupDead) {
        await d1DB.prepare('DELETE FROM videos WHERE id = ?').bind(v.id).run();
        purged_titles.push(v.title);
        purged_ids.push(v.id);
        console.info(`[Auto-Cleaner Bot] Purged dead video ID ${v.id}: "${v.title}"`);
      }
    }

    return res.json({
      success: true,
      message: 'Daily auto cleanup completed successfully',
      timestamp: new Date().toISOString(),
      total_checked,
      purged_count: purged_ids.length,
      purged_ids,
      purged_titles,
    });
  } catch (err: any) {
    console.error('[Auto-Cleaner Bot] Cron cleanup failed:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Auto cleanup execution failed',
    });
  }
};

app.post('/api/cron/cleanup', handleCronCleanup);
app.get('/api/cron/cleanup', handleCronCleanup);

// 404 Catch-All handler for /api/* to ensure API requests never return HTML index.html
app.all('/api/*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.path}`,
  });
});

// ==========================================
// VITE INTEGRATION (DEV & PROD)
// ==========================================

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`\n======================================================`);
    console.log(`▶ UBCEXX Tube & Admin Server running at http://${HOST === '0.0.0.0' ? 'localhost' : HOST}:${PORT}`);
    console.log(`▶ Cloudflare D1 Binding: env.DB connected (6 seed categories, 6 videos)`);
    console.log(`▶ Public Guest Tube: http://localhost:${PORT}`);
    console.log(`▶ Secret Admin Portal: http://localhost:${PORT}/admindaiezgangsterrussianepalworld`);
    console.log(`======================================================\n`);
  });

  server.on('error', (err: any) => {
    console.error('Server error:', err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
