'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, ClipboardList, LogOut, ArrowLeft } from 'lucide-react';

export const ADMIN_NAV = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Exhibitions', href: '/admin/events', icon: Calendar },
  { label: 'Reservations', href: '/admin/bookings', icon: ClipboardList },
];

/** True when a nav href is the section the current path belongs to. */
export function isNavActive(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(href + '/');
}

interface AdminNavProps {
  /** Called after a link is tapped, so the mobile drawer can close itself. */
  onNavigate?: () => void;
}

/**
 * The navigation itself, shared by the desktop sidebar and the mobile drawer.
 * Rows are 44px tall on touch screens so they are comfortable to tap.
 */
export const AdminNav: React.FC<AdminNavProps> = ({ onNavigate }) => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    onNavigate?.();
    router.push('/admin/login');
  };

  return (
    <>
      {/* Brand */}
      <div className="h-14 px-5 flex items-center gap-3 border-b border-zinc-200 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-zinc-900 flex items-center justify-center font-black text-white text-sm shadow-xs">
          T
        </div>
        <span className="font-bold text-sm tracking-tight text-zinc-900">TableBook</span>
      </div>

      {/* Links */}
      <nav className="p-3 flex flex-col gap-1">
        {ADMIN_NAV.map((item) => {
          const Icon = item.icon;
          const isActive = isNavActive(pathname, item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? 'page' : undefined}
              className={`flex items-center gap-2.5 px-3 py-3 lg:py-2 rounded-lg text-sm lg:text-xs font-semibold transition ${
                isActive ? 'bg-zinc-900 text-white' : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="mt-auto p-3 border-t border-zinc-200 flex flex-col gap-1">
        <Link
          href="/"
          onClick={onNavigate}
          className="flex items-center gap-2.5 px-3 py-3 lg:py-2 rounded-lg text-sm lg:text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Visitor View</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-3 lg:py-2 rounded-lg text-sm lg:text-xs font-medium text-zinc-600 hover:text-rose-700 hover:bg-rose-50 transition text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </>
  );
};

/**
 * Desktop sidebar. Hidden below `lg`, where AdminShell shows a top bar and a
 * slide-in drawer instead.
 */
export const AdminSidebar: React.FC = () => (
  <aside className="hidden lg:flex w-60 bg-white border-r border-zinc-200 text-zinc-900 flex-col shrink-0 h-screen sticky top-0 select-none font-sans">
    <AdminNav />
  </aside>
);
