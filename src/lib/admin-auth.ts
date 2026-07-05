import { createHmac, randomBytes, timingSafeEqual } from 'crypto';

function getSessionKey(): string {
  if (process.env.ADMIN_SESSION_SECRET) return process.env.ADMIN_SESSION_SECRET;
  if (typeof console !== 'undefined') {
    console.warn(
      'WARNING: ADMIN_SESSION_SECRET not set. Sessions will break if server restarts or across isolates. '
      + 'Add ADMIN_SESSION_SECRET to your .env.local'
    );
  }
  const g = globalThis as { __ADMIN_SESSION_KEY?: string };
  if (!g.__ADMIN_SESSION_KEY) g.__ADMIN_SESSION_KEY = randomBytes(32).toString('hex');
  return g.__ADMIN_SESSION_KEY;
}

const SESSION_KEY = getSessionKey();
const TOKEN_NAME = 'admin_token';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export type AdminPayload = {
  id: string;
  email: string;
  role: string;
};

function signToken(payload: AdminPayload & { exp: number }): string {
  const data = JSON.stringify(payload);
  const hmac = createHmac('sha256', SESSION_KEY).update(data).digest('hex');
  return Buffer.from(data).toString('base64') + '.' + hmac;
}

function verifyToken(token: string): (AdminPayload & { exp: number }) | null {
  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const data = Buffer.from(parts[0], 'base64').toString();
  const expectedHmac = createHmac('sha256', SESSION_KEY).update(data).digest('hex');
  const actualHmac = parts[1];

  const expectedBuf = Buffer.from(expectedHmac);
  const actualBuf = Buffer.from(actualHmac);
  if (expectedBuf.length !== actualBuf.length) return null;
  if (!timingSafeEqual(expectedBuf, actualBuf)) return null;

  try {
    const payload = JSON.parse(data);
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function createAdminSession(admin: AdminPayload): Promise<string> {
  const payload = { ...admin, exp: Date.now() + SESSION_DURATION_MS };
  return signToken(payload);
}

export function createAdminCookieHeader(token: string): string {
  const isSecure = process.env.NODE_ENV === 'production';
  return `${TOKEN_NAME}=${token}; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=${24 * 60 * 60}`;
}

export function createClearCookieHeader(): string {
  const isSecure = process.env.NODE_ENV === 'production';
  return `${TOKEN_NAME}=; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Path=/; Max-Age=0`;
}

export async function getAdminFromRequest(req: Request): Promise<AdminPayload | null> {
  const cookieHeader = req.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TOKEN_NAME}=([^;]*)`));
  if (!match) return null;

  const payload = verifyToken(match[1]);
  if (!payload) return null;

  return { id: payload.id, email: payload.email, role: payload.role };
}
