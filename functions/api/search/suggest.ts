interface Env {
  DB: D1Database;
}

const corsHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
};

export const onRequestOptions: PagesFunction<Env> = async () => {
  return new Response(null, {
    status: 204,
    headers: corsHeaders,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const q = (url.searchParams.get('q') || '').trim();

  if (!q) {
    return new Response(
      JSON.stringify({
        success: true,
        suggestions: [],
      }),
      { status: 200, headers: corsHeaders }
    );
  }

  try {
    const pattern = `%${q}%`;
    const stmt = context.env.DB.prepare(
      'SELECT title, tags FROM videos WHERE title LIKE ? OR tags LIKE ? LIMIT 6'
    ).bind(pattern, pattern);

    const result = await stmt.all();
    const rows = (result.results || []) as Array<{ title?: string; tags?: string }>;

    const rawSuggestions: string[] = [];

    for (const row of rows) {
      if (row.title) {
        rawSuggestions.push(row.title);
      }
      if (row.tags) {
        const tagList = row.tags.split(',').map((t) => t.trim()).filter(Boolean);
        for (const tag of tagList) {
          if (tag.toLowerCase().includes(q.toLowerCase())) {
            rawSuggestions.push(tag);
          }
        }
      }
    }

    try {
      const catStmt = context.env.DB.prepare(
        'SELECT name FROM categories WHERE name LIKE ? LIMIT 3'
      ).bind(pattern);
      const catResult = await catStmt.all();
      const catRows = (catResult.results || []) as Array<{ name?: string }>;
      for (const cat of catRows) {
        if (cat.name) {
          rawSuggestions.push(cat.name);
        }
      }
    } catch {
    }

    const seen = new Set<string>();
    const suggestions: string[] = [];

    for (const item of rawSuggestions) {
      const clean = item.trim();
      const lower = clean.toLowerCase();
      if (clean && !seen.has(lower)) {
        seen.add(lower);
        suggestions.push(clean);
        if (suggestions.length >= 6) {
          break;
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        suggestions,
      }),
      {
        status: 200,
        headers: corsHeaders,
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: err?.message || 'Failed to fetch suggestions',
        suggestions: [],
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
};
