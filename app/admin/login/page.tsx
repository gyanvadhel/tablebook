'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock, User, ArrowLeft, AlertCircle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Login failed');
      }

      router.push('/admin/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid username or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 font-sans text-zinc-900 relative">
      <Link
        href="/"
        className="absolute top-6 left-6 flex items-center gap-2 text-xs font-medium text-zinc-500 hover:text-zinc-900 transition"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Return to Exhibitions</span>
      </Link>

      <div className="max-w-sm w-full bg-white border border-zinc-200 rounded-xl p-8 shadow-xs">
        <div className="text-center mb-6">
          <div className="w-10 h-10 rounded-lg bg-zinc-900 flex items-center justify-center mx-auto mb-3 font-bold text-white text-sm">
            TB
          </div>
          <h1 className="text-lg font-bold text-zinc-900">TableBook Admin</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Sign in to manage exhibitions and floor plans</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-3.5 text-xs">
          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Username</label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-zinc-300 rounded-lg text-zinc-900 placeholder-zinc-400 focus:outline-none focus:ring-1 focus:ring-zinc-900 focus:border-zinc-900 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="mt-2 w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-lg font-bold shadow-xs transition text-xs"
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-5 text-center text-[11px] text-zinc-400">
          Default Credentials: <code className="text-zinc-600 font-semibold">admin</code> / <code className="text-zinc-600 font-semibold">admin123</code>
        </div>
      </div>
    </div>
  );
}
