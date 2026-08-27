import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TableBook — Exhibition Floor Plan & Stall Booking Platform',
  description: 'Interactive real-world architectural scale floor plan designer and instant stall reservation system.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">{children}</body>
    </html>
  );
}
