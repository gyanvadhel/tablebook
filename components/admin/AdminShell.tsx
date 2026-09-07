'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { AdminNav, AdminSidebar } from '@/components/admin/AdminSidebar';

interface AdminShellProps {
  title: string;
  subtitle?: string;
  /** Page-level buttons. Full width on phones, inline from `sm` up. */
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Chrome shared by every admin page.
 *
 * From `lg` up this is the familiar fixed sidebar beside a scrolling page.
 * Below that the sidebar would eat most of a phone screen, so it becomes a
 * slide-in drawer behind a sticky top bar and the content gets the full width.
 */
export const AdminShell: React.FC<AdminShellProps> = ({ title, subtitle, actions, children }) => {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Tapping a link navigates; make sure the drawer is not left covering the page
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  // While the drawer is over the page, don't let the page scroll behind it
  useEffect(() => {
    if (!isDrawerOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsDrawerOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);

    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isDrawerOpen]);

  return (
    <div className="min-h-dvh bg-zinc-50 font-sans text-zinc-900 lg:flex">
      <AdminSidebar />

      {/* Mobile top bar */}
      <header className="lg:hidden sticky top-0 z-30 h-14 bg-white/95 backdrop-blur border-b border-zinc-200 flex items-center gap-3 px-3">
        <button
          type="button"
          onClick={() => setIsDrawerOpen(true)}
          aria-label="Open navigation menu"
          aria-expanded={isDrawerOpen}
          className="w-10 h-10 -ml-0.5 flex items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 active:bg-zinc-200 transition"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-6 h-6 rounded-md bg-zinc-900 flex items-center justify-center font-black text-white text-[11px] shrink-0">
          T
        </div>
        <span className="font-bold text-sm text-zinc-900 truncate">{title}</span>
      </header>

      {/* Drawer backdrop */}
      <div
        onClick={() => setIsDrawerOpen(false)}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-40 bg-zinc-900/50 transition-opacity duration-200 ${
          isDrawerOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Admin navigation"
        aria-hidden={!isDrawerOpen}
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 max-w-[82vw] bg-white border-r border-zinc-200 flex flex-col shadow-2xl transition-transform duration-200 ease-out ${
          isDrawerOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsDrawerOpen(false)}
          aria-label="Close navigation menu"
          className="absolute top-2.5 right-2.5 w-9 h-9 flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 transition"
        >
          <X className="w-4 h-4" />
        </button>
        <AdminNav onNavigate={() => setIsDrawerOpen(false)} />
      </aside>

      {/* Page */}
      <main className="flex-1 min-w-0 px-4 pt-5 pb-12 sm:px-6 lg:p-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 lg:mb-8">
          <div className="min-w-0">
            {/* The top bar already carries the title on phones */}
            <h1 className="hidden lg:block text-xl font-bold text-zinc-900">{title}</h1>
            {subtitle && <p className="text-xs text-zinc-500 lg:mt-0.5">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 shrink-0 [&>*]:flex-1 sm:[&>*]:flex-none">{actions}</div>}
        </div>

        {children}
      </main>
    </div>
  );
};
