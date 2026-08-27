'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LayoutDashboard, Calendar, ClipboardList, LogOut, ArrowLeft } from 'lucide-react';

export const AdminSidebar: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    router.push('/admin/login');
  };

  const navItems = [
    { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
    { label: 'Exhibitions', href: '/admin/events', icon: Calendar },
    { label: 'Reservations', href: '/admin/bookings', icon: ClipboardList },
  ];

  return (
    <aside className="w-60 bg-white border-r border-zinc-200 text-zinc-900 flex flex-col shrink-0 h-screen select-none font-sans">
      {/* Brand Header */}
      <div className="h-14 px-5 flex items-center gap-3 border-b border-zinc-200">
        <div className="w-7 h-7 rounded-md bg-zinc-900 flex items-center justify-center font-black text-white text-xs">
          TB
        </div>
        <span className="font-bold text-sm tracking-tight text-zinc-900">TableBook Admin</span>
      </div>

      {/* Nav Links */}
      <nav className="p-3 flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold transition ${
                isActive
                  ? 'bg-zinc-900 text-white'
                  : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Footer Actions */}
      <div className="mt-auto p-3 border-t border-zinc-200 flex flex-col gap-1">
        <Link
          href="/"
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Visitor View</span>
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-zinc-600 hover:text-rose-700 hover:bg-rose-50 transition text-left"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};
