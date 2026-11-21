interface Env {
  DB: D1Database;
  JWT_SECRET?: string;
}

interface EphemeralSession {
  id: number;
  username: string;
  issuedAt: number;
  lastVerifiedAt: number;
}

const LOCKOUT_DURATION_MS = 2 * 60 * 60 * 1000;
const EPHEMERAL_IDLE_TTL_MS = 2 * 60 * 1000;
const MAX_REVOKED_TOKENS = 500;

let workerFailedAttempts = 0;
let workerLockoutUntil = 0;

const ephemeralSessions = new Map<string, EphemeralSession>();
const ephemeralRevokedTokens = new Set<string>();

function stripNetworkMetadata(request: Request): {
  method: string;
  url: string;
  headers: Headers;
  readJsonBody: () => Promise<Record<string, unknown>>;
} {
  const safeHeaders = new Headers();
  const allowedKeys = [
    'content-type',
    'authorization',
    'accept',
    'x-requested-with',
    'origin',
  ];

  for (const key of allowedKeys) {
    const val = request.headers.get(key);
    if (val !== null) {
      safeHeaders.set(key, val);
    }
  }

  return {
    method: request.method,
    url: request.url,
    headers: safeHeaders,
    readJsonBody: async () => {
      try {
        const parsed = await request.json();
        return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {};
      } catch {
        return {};
      }
    },
  };
}

function buildAuthHeaders(requestUrl: string, safeHeaders: Headers): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
    'Vary': 'Origin',
  };

  const requestOrigin = safeHeaders.get('origin');
  try {
    const expectedOrigin = new URL(requestUrl).origin;
    if (requestOrigin && requestOrigin === expectedOrigin) {
      headers['Access-Control-Allow-Origin'] = requestOrigin;
    }
  } catch {
  }

  return headers;
}

function extractBearerToken(safeHeaders: Headers): string {
  const authHeader = safeHeaders.get('authorization') || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return '';
  }
  return authHeader.slice(7).trim();
}

function pruneEphemeralSessions(now: number): void {
  for (const [token, session] of ephemeralSessions.entries()) {
    if (now - session.lastVerifiedAt > EPHEMERAL_IDLE_TTL_MS) {
      ephemeralSessions.delete(token);
    }
  }
  if (ephemeralRevokedTokens.size > MAX_REVOKED_TOKENS) {
    ephemeralRevokedTokens.clear();
  }
}

function revokeEphemeralToken(token: string): void {
  if (!token) return;
  ephemeralSessions.delete(token);
  if (ephemeralRevokedTokens.size >= MAX_REVOKED_TOKENS) {
    ephemeralRevokedTokens.clear();
  }
  ephemeralRevokedTokens.add(token);
}

function constantTimeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const aBytes = encoder.encode(a);
  const bBytes = encoder.encode(b);
  const maxLen = Math.max(aBytes.length, bBytes.length);
  let diff = aBytes.length ^ bBytes.length;
  for (let i = 0; i < maxLen; i += 1) {
    const byteA = i < aBytes.length ? aBytes[i] : 0;
    const byteB = i < bBytes.length ? bBytes[i] : 0;
    diff |= byteA ^ byteB;
  }
  return diff === 0;
}

function parseTokenPayload(token: string): { id: number; username: string; issuedAt: number } | null {
  if (!token.startsWith('ubcexx_admin_')) return null;
  const encoded = token.slice('ubcexx_admin_'.length);
  if (!encoded) return null;
  try {
    const decoded = atob(encoded);
    const parts = decoded.split(':');
    if (parts.length < 3) return null;
    const id = Number(parts[0]);
    const username = parts[1];
    const issuedAt = Number(parts[2]);
    if (!Number.isFinite(id) || !username || !Number.isFinite(issuedAt)) return null;
    return { id, username, issuedAt };
  } catch {
    return null;
  }
}

export const onRequestOptions: PagesFunction<Env> = async (context) => {
  const stripped = stripNetworkMetadata(context.request);
  const headers = buildAuthHeaders(stripped.url, stripped.headers);
  return new Response(null, {
    status: 204,
    headers,
  });
};

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const stripped = stripNetworkMetadata(context.request);
  const headers = buildAuthHeaders(stripped.url, stripped.headers);
  const now = Date.now();
  pruneEphemeralSessions(now);

  const isLocked = now < workerLockoutUntil;
  if (!isLocked && workerLockoutUntil > 0) {
    workerFailedAttempts = 0;
    workerLockoutUntil = 0;
  }

  const bearerToken = extractBearerToken(stripped.headers);
  if (bearerToken) {
    if (ephemeralRevokedTokens.has(bearerToken)) {
      return new Response(
        JSON.stringify({
          success: false,
          authenticated: false,
          error: 'Admin session has been logged out.',
        }),
        { status: 401, headers }
      );
    }

    const activeSession = ephemeralSessions.get(bearerToken);
    if (activeSession) {
      activeSession.lastVerifiedAt = now;
      return new Response(
        JSON.stringify({
          success: true,
          authenticated: true,
          locked: isLocked,
          lockoutUntil: isLocked ? workerLockoutUntil : 0,
          remainingSeconds: isLocked ? Math.ceil((workerLockoutUntil - now) / 1000) : 0,
          failedAttempts: isLocked ? 2 : workerFailedAttempts,
          admin: {
            id: activeSession.id,
            username: activeSession.username,
            role: 'Administrator',
          },
        }),
        { status: 200, headers }
      );
    }

    const parsed = parseTokenPayload(bearerToken);
    if (!parsed) {
      return new Response(
        JSON.stringify({
          success: false,
          authenticated: false,
          error: 'Invalid or expired admin session.',
        }),
        { status: 401, headers }
      );
    }

    ephemeralSessions.set(bearerToken, {
      id: parsed.id,
      username: parsed.username,
      issuedAt: parsed.issuedAt,
      lastVerifiedAt: now,
    });

    return new Response(
      JSON.stringify({
        success: true,
        authenticated: true,
        locked: isLocked,
        lockoutUntil: isLocked ? workerLockoutUntil : 0,
        remainingSeconds: isLocked ? Math.ceil((workerLockoutUntil - now) / 1000) : 0,
        failedAttempts: isLocked ? 2 : workerFailedAttempts,
        admin: {
          id: parsed.id,
          username: parsed.username,
          role: 'Administrator',
        },
      }),
      { status: 200, headers }
    );
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
    { status: 200, headers }
  );
};

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const stripped = stripNetworkMetadata(context.request);
  const headers = buildAuthHeaders(stripped.url, stripped.headers);
  const bearerToken = extractBearerToken(stripped.headers);
  revokeEphemeralToken(bearerToken);

  return new Response(
    JSON.stringify({
      success: true,
      loggedOut: true,
      message: 'Admin session cleared anonymously.',
    }),
    { status: 200, headers }
  );
};

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const stripped = stripNetworkMetadata(context.request);
  const headers = buildAuthHeaders(stripped.url, stripped.headers);

  try {
    const now = Date.now();
    pruneEphemeralSessions(now);

    const body = await stripped.readJsonBody();
    if (String(body.action || '').toLowerCase() === 'logout') {
      const tokenFromHeader = extractBearerToken(stripped.headers);
      const tokenFromBody = typeof body.token === 'string' ? body.token.trim() : '';
      revokeEphemeralToken(tokenFromHeader || tokenFromBody);
      return new Response(
        JSON.stringify({
          success: true,
          loggedOut: true,
          message: 'Admin session cleared anonymously.',
        }),
        { status: 200, headers }
      );
    }

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
        { status: 429, headers }
      );
    }

    const identifier = String(body.email || body.username || '').trim();
    const password = String(body.password || '');

    if (!identifier || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Email and password required' }),
        { status: 400, headers }
      );
    }

    const stmt = context.env.DB.prepare(`
      SELECT id, username, password_hash FROM admins WHERE username = ?
    `).bind(identifier);
    const admin = await stmt.first<{ id: number; username: string; password_hash: string }>();

    const isMatch = Boolean(
      admin && constantTimeEqual(admin.password_hash, password)
    );

    if (!admin || !isMatch) {
      workerFailedAttempts += 1;
      if (workerFailedAttempts >= 2) {
        workerLockoutUntil = now + LOCKOUT_DURATION_MS;
        return new Response(
          JSON.stringify({
            success: false,
            locked: true,
            lockoutUntil: workerLockoutUntil,
            remainingSeconds: 7200,
            error: 'Security Lockout: 2 failed attempts exceeded. Admin access locked for 2 hours.',
          }),
          { status: 429, headers }
        );
      }
      return new Response(
        JSON.stringify({
          success: false,
          remainingAttempts: 1,
          error: 'Invalid admin credentials. 1 attempt remaining before 2-hour lockout.',
        }),
        { status: 401, headers }
      );
    }

    workerFailedAttempts = 0;
    workerLockoutUntil = 0;

    const nonceBytes = new Uint8Array(16);
    crypto.getRandomValues(nonceBytes);
    const nonce = Array.from(nonceBytes, (b) => b.toString(16).padStart(2, '0')).join('');
    const token = `ubcexx_admin_${btoa(`${admin.id}:${admin.username}:${now}:${nonce}`)}`;

    ephemeralSessions.set(token, {
      id: admin.id,
      username: admin.username,
      issuedAt: now,
      lastVerifiedAt: now,
    });

    return new Response(
      JSON.stringify({
        success: true,
        token,
        admin: { id: admin.id, username: admin.username, role: 'Administrator' },
        message: 'UBCEXX Admin Portal authentication successful',
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Authentication error' }),
      { status: 500, headers }
    );
  }
};

