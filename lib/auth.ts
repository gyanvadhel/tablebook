import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { UserSession } from '@/types';

const COOKIE_NAME = 'admin_token';

/** Only used when JWT_SECRET is unset, and never in production. */
const DEV_ONLY_SECRET = 'tablebook-local-development-secret';

/**
 * The signing key for admin sessions.
 *
 * This used to fall back to a literal committed in this repository, which
 * meant any deployment missing JWT_SECRET could have admin tokens forged by
 * anyone who had read the source. Production now fails closed instead.
 *
 * Resolved per call rather than at module load so a missing variable surfaces
 * as a failed request, not a failed build.
 */
function getJwtSecret(): string {
  const fromEnv = process.env.JWT_SECRET?.trim();
  if (fromEnv) return fromEnv;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'JWT_SECRET is not set. Refusing to sign or verify admin sessions with a default key in production.'
    );
  }

  return DEV_ONLY_SECRET;
}

export function signToken(user: UserSession): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    getJwtSecret(),
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, getJwtSecret()) as UserSession;
  } catch (err) {
    // An unset JWT_SECRET in production is a deployment fault, not a bad
    // token — surface it rather than reporting every visitor as logged out.
    if (err instanceof Error && err.message.includes('JWT_SECRET is not set')) throw err;
    return null;
  }
}

export async function getSession(req?: any): Promise<UserSession | null> {
  let token: string | undefined;

  if (req && req.cookies) {
    if (typeof req.cookies.get === 'function') {
      token = req.cookies.get(COOKIE_NAME)?.value;
    } else if (typeof req.cookies === 'object') {
      token = req.cookies[COOKIE_NAME];
    }
  }

  if (!token) {
    try {
      const cookieStore = cookies();
      token = cookieStore.get(COOKIE_NAME)?.value;
    } catch (err) {
      // Ignored if outside request context
    }
  }

  if (!token) return null;
  return verifyToken(token);
}

export async function setAuthCookie(token: string) {
  try {
    const cookieStore = cookies();
    cookieStore.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });
  } catch (err) {
    // Handled in response cookies
  }
}

export async function removeAuthCookie() {
  try {
    const cookieStore = cookies();
    cookieStore.delete(COOKIE_NAME);
  } catch (err) {
    // Handled in response cookies
  }
}
