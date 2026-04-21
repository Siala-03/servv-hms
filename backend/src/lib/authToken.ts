import { createHmac, timingSafeEqual } from 'crypto';

interface AuthTokenPayload {
  uid: string;
  role: string;
  hid: string | null;
  iat: number;
  exp: number;
}

const DEFAULT_TTL_SECONDS = 12 * 60 * 60; // 12 hours

function base64UrlEncode(input: Buffer | string) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(padded, 'base64').toString('utf8');
}

function getSigningSecret() {
  const secret =
    process.env.AUTH_TOKEN_SECRET
    ?? process.env.JWT_SECRET
    ?? process.env.SUPABASE_SERVICE_ROLE_KEY
    ?? '';

  if (!secret || secret.length < 24) {
    throw new Error('Missing secure AUTH_TOKEN_SECRET (or JWT_SECRET).');
  }

  return secret;
}

function signSegment(data: string, secret: string) {
  return base64UrlEncode(createHmac('sha256', secret).update(data).digest());
}

export function createAuthToken(input: {
  userId: string;
  role: string;
  hotelId: string | null;
  ttlSeconds?: number;
}) {
  const secret = getSigningSecret();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + (input.ttlSeconds ?? DEFAULT_TTL_SECONDS);

  const payload: AuthTokenPayload = {
    uid: input.userId,
    role: input.role,
    hid: input.hotelId,
    iat,
    exp,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signSegment(encodedPayload, secret);

  return {
    token: `${encodedPayload}.${signature}`,
    expiresAt: exp,
    expiresIn: exp - iat,
  };
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
  const secret = getSigningSecret();
  const parts = token.trim().split('.');
  if (parts.length !== 2) return null;

  const [encodedPayload, signature] = parts;
  const expected = signSegment(encodedPayload, secret);

  const providedBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(providedBuf, expectedBuf)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AuthTokenPayload;
    if (!payload?.uid || !payload?.role || typeof payload.exp !== 'number') return null;
    if (payload.exp <= Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function extractBearerToken(value?: string) {
  if (!value) return null;
  const m = value.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() || null;
}
