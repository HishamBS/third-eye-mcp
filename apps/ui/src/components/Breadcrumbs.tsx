'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';

interface Breadcrumb {
  label: string;
  href: string;
}

const ROUTE_LABELS: Record<string, string> = {
  connections: 'Connections',
  eyes: 'Eyes',
  models: 'Models',
  personas: 'Personas',
  pipelines: 'Pipelines',
  strictness: 'Strictness',
  prompts: 'Prompts',
  settings: 'Settings',
  database: 'Database',
  metrics: 'Metrics',
  monitor: 'Monitor',
  replay: 'Replay',
  duel: 'Duel',
  session: 'Session',
  audit: 'Audit',
};

export function Breadcrumbs() {
  const pathname = usePathname();

  const breadcrumbs: Breadcrumb[] = [{ label: 'Home', href: '/' }];

  if (pathname !== '/') {
    const segments = pathname.split('/').filter(Boolean);

    segments.forEach((segment, index) => {
      const href = '/' + segments.slice(0, index + 1).join('/');

      // Check if this is a dynamic ID segment (like session/abc123)
      const isId = /^[a-zA-Z0-9_-]{10,}$/.test(segment);

      if (isId && index > 0) {
        // For IDs, use the parent route's label with "Detail" suffix
        const parentSegment = segments[index - 1];
        const parentLabel = ROUTE_LABELS[parentSegment] || parentSegment;
        breadcrumbs.push({ label: `${parentLabel} Detail`, href });
      } else {
        const label = ROUTE_LABELS[segment] || segment.charAt(0).toUpperCase() + segment.slice(1);
        breadcrumbs.push({ label, href });
      }
    });
  }

  if (breadcrumbs.length === 1) {
    return null;
  }

  return (
    <nav className="border-b border-brand-outline/40 bg-brand-paper/30 px-6 py-3">
      <ol className="flex items-center space-x-2 text-sm">
        {breadcrumbs.map((crumb, index) => {
          const isLast = index === breadcrumbs.length - 1;
          const isFirst = index === 0;

          return (
            <li key={crumb.href} className="flex items-center">
              {index > 0 && (
                <ChevronRight className="mx-2 h-4 w-4 text-slate-500" />
              )}
              {isFirst ? (
                <Link
                  href={crumb.href}
                  className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
                >
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
              ) : (
                <Link
                  href={crumb.href}
                  className={`transition-colors ${
                    isLast
                      ? 'text-brand-accent font-medium'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
