import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { dbGet } from '@/lib/db';
import { signToken, setAuthCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const admin = await dbGet('SELECT * FROM admins WHERE username = $1', [username.trim()]);
    if (!admin) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const isValid = await bcrypt.compare(password, admin.password_hash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }

    const token = signToken({
      id: Number(admin.id),
      username: admin.username,
      role: 'admin',
    });

    await setAuthCookie(token);

    return NextResponse.json({
      success: true,
      user: { id: admin.id, username: admin.username, role: 'admin' },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
