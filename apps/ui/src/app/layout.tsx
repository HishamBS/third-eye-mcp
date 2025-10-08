import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource/geist-mono';
import '../index.css';
import { UIProvider } from '@/contexts/UIContext';
import { GlobalNav } from '@/components/GlobalNav';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SecurityBanner } from '@/components/SecurityBanner';
import { ThemeScript } from '@/components/ThemeScript';
import { SessionNotifier } from '@/components/SessionNotifier';
import { DialogProvider } from '@/hooks/useDialog';

export const metadata: Metadata = {
  title: 'Third Eye MCP - Overseer',
  description: 'Local-first AI orchestration layer with Eyes',
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
    ],
    shortcut: ['/favicon.ico'],
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="any" />
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <UIProvider>
          <SecurityBanner />
          <SessionNotifier />
          <div id="root">
            <GlobalNav />
            <Breadcrumbs />
            <main className="min-h-[calc(100vh-64px)]">
              {children}
            </main>
          </div>
          <DialogProvider />
        </UIProvider>
      </body>
    </html>
  );
}
