// Cloudflare Pages Function: /api/stats
// GET & POST - UBCEXX Overview metrics from Cloudflare D1

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

async function getStats(context: EventContext<Env, any, any>): Promise<Response> {
  try {
    // 1. total_videos: SELECT COUNT(*) as count FROM videos
    const videosCountStmt = context.env.DB.prepare('SELECT COUNT(*) as count FROM videos');
    const videosCountResult = await videosCountStmt.first<{ count: number }>();
    const total_videos = Number(videosCountResult?.count) || 0;

    // 2. total_views: SELECT SUM(views) as count FROM videos
    const viewsStmt = context.env.DB.prepare('SELECT SUM(views) as count FROM videos');
    const viewsResult = await viewsStmt.first<{ count: number }>();
    const total_views = Number(viewsResult?.count) || 0;

    // 3. total_categories: SELECT COUNT(*) as count FROM categories
    const catsStmt = context.env.DB.prepare('SELECT COUNT(*) as count FROM categories');
    const catsResult = await catsStmt.first<{ count: number }>();
    const total_categories = Number(catsResult?.count) || 0;

    // 4. total_likes: SELECT SUM(likes) as count FROM videos
    const likesStmt = context.env.DB.prepare('SELECT SUM(likes) as count FROM videos');
    const likesResult = await likesStmt.first<{ count: number }>();
    const total_likes = Number(likesResult?.count) || 0;

    const stats = {
      total_videos,
      total_views,
      total_categories,
      total_likes,
      totalVideos: total_videos,
      totalViews: total_views,
      totalCategories: total_categories,
      totalLikes: total_likes,
      database: 'Cloudflare D1 (env.DB)',
      status: 'Operational',
    };

    return new Response(
      JSON.stringify({
        success: true,
        stats,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'Failed to fetch stats from Cloudflare D1',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return getStats(context);
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  return getStats(context);
};
