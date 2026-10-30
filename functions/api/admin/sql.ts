// Cloudflare Pages Function: /api/admin/sql
// POST & GET - Direct Cloudflare D1 SQL query execution console

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

export const onRequestGet: PagesFunction<Env> = async () => {
  return new Response(
    JSON.stringify({
      success: true,
      message: 'Cloudflare D1 SQL endpoint operational. Send POST with { sql: string } to execute.',
    }),
    { status: 200, headers: corsHeaders }
  );
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
    const { sql } = body;

    if (!sql || typeof sql !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'SQL query string required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const stmt = context.env.DB.prepare(sql);
    const result = await stmt.all();

    return new Response(
      JSON.stringify({
        success: true,
        results: result.results || [],
        meta: result.meta,
        executedQuery: sql,
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err.message || 'SQL execution failed',
      }),
      { status: 500, headers: corsHeaders }
    );
  }
};
