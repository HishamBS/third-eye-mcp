import type { Metadata, Viewport } from 'next';
import '@fontsource-variable/inter';
import '@fontsource/geist-mono';
import '../index.css';
import { UIProvider } from '@/contexts/UIContext';

export const metadata: Metadata = {
  title: 'Third Eye MCP - Overseer',
  description: 'Local-first AI orchestration layer with Eyes',
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
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <link rel="icon" type="image/svg+xml" href="/vite.svg" />
      </head>
      <body className="min-h-screen bg-background font-sans antialiased" suppressHydrationWarning>
        <UIProvider>
          <div id="root">
            {children}
          </div>
        </UIProvider>
      </body>
    </html>
  );
}