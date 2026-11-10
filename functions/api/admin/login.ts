interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
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

let workerFailedAttempts = 0;
let workerLockoutUntil = 0;

export const onRequestGet: PagesFunction<Env> = async () => {
  const now = Date.now();
  const isLocked = now < workerLockoutUntil;
  if (!isLocked && workerLockoutUntil > 0) {
    workerFailedAttempts = 0;
    workerLockoutUntil = 0;
  }
  return new Response(
    JSON.stringify({
      success: true,
      locked: isLocked,
      lockoutUntil: isLocked ? workerLockoutUntil : 0,
      remainingSeconds: isLocked ? Math.ceil((workerLockoutUntil - now) / 1000) : 0,
      failedAttempts: isLocked ? 2 : workerFailedAttempts,
      message: 'UBCEXX Admin Authentication endpoint ready.',
    }),
    { status: 200, headers: corsHeaders }
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const now = Date.now();
    if (now < workerLockoutUntil) {
      const remainingSeconds = Math.ceil((workerLockoutUntil - now) / 1000);
      return new Response(
        JSON.stringify({
          success: false,
          locked: true,
          lockoutUntil: workerLockoutUntil,
          remainingSeconds,
          error: 'Security Lockout: 2 failed attempts exceeded. Admin access locked for 2 hours.',
        }),
        { status: 429, headers: corsHeaders }
      );
    }

    const body: any = await context.request.json().catch(() => ({}));
    const identifier = String(body.email || body.username || '').trim();
    const password = String(body.password || '');

    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const stmt = context.env.DB.prepare(`
      SELECT id, username, password_hash FROM admins WHERE username = ?
    `).bind(identifier);
    const admin = await stmt.first<{ id: number; username: string; password_hash: string }>();

    const isMatch = Boolean(
      admin && admin.password_hash === password
    );

    if (!admin || !isMatch) {
      workerFailedAttempts += 1;
      if (workerFailedAttempts >= 2) {
        workerLockoutUntil = now + (2 * 60 * 60 * 1000);
        return new Response(
          JSON.stringify({
            success: false,
            locked: true,
            lockoutUntil: workerLockoutUntil,
            remainingSeconds: 7200,
            error: 'Security Lockout: 2 failed attempts exceeded. Admin access locked for 2 hours.',
          }),
          { status: 429, headers: corsHeaders }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          remainingAttempts: 1,
          error: 'Invalid admin credentials. 1 attempt remaining before 2-hour lockout.',
        }),
        { status: 401, headers: corsHeaders }
      );
    }

    workerFailedAttempts = 0;
    workerLockoutUntil = 0;

    const token = `ubcexx_admin_${btoa(`${admin.id}:${admin.username}:${Date.now()}`)}`;

    return new Response(
      JSON.stringify({
        success: true,
        token,
        admin: { id: admin.id, username: admin.username, role: 'Administrator' },
        message: 'UBCEXX Admin Portal authentication successful',
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Authentication error' }),
      { status: 500, headers: corsHeaders }
    );
  }
};
