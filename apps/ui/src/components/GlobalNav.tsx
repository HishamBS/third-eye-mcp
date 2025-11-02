'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Cable, Eye, Cpu, Users, GitBranch, Shield, FileText,
  Settings, Database, BarChart, ChevronDown, Swords, FlaskConical,
  History, Activity, PlayCircle
} from 'lucide-react';
import { SessionSelector } from './SessionSelector';
import { ThemeSwitcher } from './ThemeSwitcher';
import { ViewModeToggle } from './ViewModeToggle';
import { ANIMATION_DURATION } from '@/constants/timing';
import { GRADIENT } from '@/constants/design-tokens';

interface DropdownItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  description?: string;
}

interface DropdownSection {
  label: string;
  items: DropdownItem[];
}

const NAVIGATION_SECTIONS: DropdownSection[] = [
  {
    label: 'CONFIGURATION',
    items: [
      { href: '/connections', label: 'Connections', icon: <Cable className="h-4 w-4" />, description: 'MCP setup guides' },
      { href: '/eyes', label: 'Eyes', icon: <Eye className="h-4 w-4" />, description: 'Built-in + custom' },
      { href: '/models', label: 'Models', icon: <Cpu className="h-4 w-4" />, description: 'Providers + routing' },
      { href: '/personas', label: 'Personas', icon: <Users className="h-4 w-4" />, description: 'Eye personalities' },
    ],
  },
  {
    label: 'WORKFLOWS',
    items: [
      { href: '/pipelines', label: 'Pipelines', icon: <GitBranch className="h-4 w-4" />, description: 'Visual builder' },
      { href: '/strictness', label: 'Strictness', icon: <Shield className="h-4 w-4" />, description: 'Profiles + sliders' },
      { href: '/prompts', label: 'Prompts', icon: <FileText className="h-4 w-4" />, description: 'Library' },
      { href: '/duel', label: 'Duel Mode', icon: <Swords className="h-4 w-4" />, description: 'Compare models' },
      { href: '/playground', label: 'Playground', icon: <FlaskConical className="h-4 w-4" />, description: 'Test Eyes manually' },
    ],
  },
  {
    label: 'MONITORING',
    items: [
      { href: '/sessions', label: 'Sessions', icon: <History className="h-4 w-4" />, description: 'Session history' },
      { href: '/monitor', label: 'Monitor', icon: <Activity className="h-4 w-4" />, description: 'Real-time view' },
      { href: '/replay', label: 'Replay', icon: <PlayCircle className="h-4 w-4" />, description: 'Session playback' },
    ],
  },
  {
    label: 'SYSTEM',
    items: [
      { href: '/settings', label: 'Settings', icon: <Settings className="h-4 w-4" />, description: 'App config' },
      { href: '/database', label: 'Database', icon: <Database className="h-4 w-4" />, description: 'Browse + backup' },
      { href: '/metrics', label: 'Metrics', icon: <BarChart className="h-4 w-4" />, description: 'Performance' },
    ],
  },
];

function Dropdown({ section }: { section: DropdownSection }) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const isActive = section.items.some(item => pathname.startsWith(item.href));

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <button
        className={`flex items-center space-x-1 px-4 py-2 text-sm font-medium transition-colors rounded-lg ${
          isActive
            ? 'text-brand-accent bg-brand-accent/10'
            : 'text-semantic-muted hover:text-brand-foreground hover:bg-brand-paper/60'
        }`}
      >
        <span>{section.label}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full pt-2 w-64 z-50">
          <div className="rounded-xl border border-brand-outline/40 bg-brand-paperElev/95 backdrop-blur-lg shadow-2xl">
            <div className="p-2">
              {section.items.map((item) => {
                const isItemActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-start space-x-3 rounded-lg p-3 transition-colors ${
                      isItemActive
                        ? 'bg-brand-accent/20 text-brand-accent'
                        : 'text-semantic-muted hover:bg-brand-paper/60 hover:text-brand-foreground'
                    }`}
                  >
                    <div className="mt-0.5">{item.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-semantic-muted mt-0.5">{item.description}</div>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function GlobalNav() {
  return (
    <header className="border-b border-brand-outline/60 bg-brand-paperElev/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="mx-auto max-w-[1600px] px-6 py-3.5">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Logo */}
          <Link
            href="/"
            className="flex items-center gap-3 group shrink-0"
            aria-label="Third Eye MCP"
          >
            <Image
              src="/logo.svg"
              alt="Third Eye MCP logo"
              width={36}
              height={36}
              priority
              className={`h-9 w-9 transform transition-transform ${ANIMATION_DURATION.FAST} group-hover:scale-110`}
            />
            <span className="text-lg font-semibold text-brand-foreground group-hover:text-brand-accent transition-colors whitespace-nowrap">
              Third Eye MCP
            </span>
          </Link>

          {/* Center: Navigation */}
          <nav className="flex items-center justify-center gap-1 flex-1">
            {NAVIGATION_SECTIONS.map((section) => (
              <Dropdown key={section.label} section={section} />
            ))}
          </nav>

          {/* Right: Actions */}
          <div className="flex items-center gap-3 shrink-0">
            <SessionSelector />
            <ViewModeToggle />
            <ThemeSwitcher />
            <Link
              href="/settings"
              className="rounded-lg p-2 text-semantic-muted hover:text-brand-foreground hover:bg-brand-paper/60 transition-colors"
              aria-label="Settings"
            >
              <Settings className="h-5 w-5" />
            </Link>
            <div className={`h-8 w-8 rounded-full bg-gradient-to-br ${GRADIENT.avatar} flex items-center justify-center text-brand-foreground text-sm font-semibold`}>
              AI
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
