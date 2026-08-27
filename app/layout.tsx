import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'TableBook — Exhibition Floor Plan & Stall Booking Platform',
  description: 'Interactive real-world architectural scale floor plan designer and instant stall reservation system.',
  icons: {
    icon: "data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><rect width='100' height='100' rx='22' fill='%2318181b'/><text x='50' y='68' font-size='56' text-anchor='middle' fill='%23f4f4f5' font-family='sans-serif' font-weight='900'>T</text></svg>",
  },
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
