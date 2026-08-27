import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';
import type { UserSession } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'tablebook-secret-key-super-secure-change-in-prod';
const COOKIE_NAME = 'admin_token';

export function signToken(user: UserSession): string {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): UserSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as UserSession;
  } catch (err) {
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
