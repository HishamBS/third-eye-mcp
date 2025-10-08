'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Cable, Eye, Cpu, Users, GitBranch, Shield, FileText,
  Settings, Database, BarChart, Bell, ChevronDown, Swords
} from 'lucide-react';
import { SessionSelector } from './SessionSelector';

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
            : 'text-slate-300 hover:text-white hover:bg-brand-paper/60'
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
                        : 'text-slate-300 hover:bg-brand-paper/60 hover:text-white'
                    }`}
                  >
                    <div className="mt-0.5">{item.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {item.description && (
                        <div className="text-xs text-slate-400 mt-0.5">{item.description}</div>
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
      <div className="mx-auto max-w-7xl px-8 py-4 grid grid-cols-[1fr_auto_1fr] items-center gap-8">
        {/* Left: Logo */}
        <Link
          href="/"
          className="flex items-center space-x-3 group justify-self-start"
          aria-label="Third Eye MCP"
        >
          <Image
            src="/logo.svg"
            alt="Third Eye MCP logo"
            width={40}
            height={40}
            priority
            className="h-10 w-10 transform transition-transform duration-200 group-hover:scale-110"
          />
          <span className="text-xl font-semibold text-white group-hover:text-brand-accent transition-colors">
            Third Eye MCP
          </span>
        </Link>

        {/* Center: Navigation */}
        <nav className="flex items-center justify-center space-x-1">
          {NAVIGATION_SECTIONS.map((section) => (
            <Dropdown key={section.label} section={section} />
          ))}
        </nav>

        {/* Right: Actions */}
        <div className="flex items-center justify-self-end space-x-3">
          <SessionSelector />
          <Link
            href="/monitor"
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-brand-paper/60 transition-colors"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            href="/settings"
            className="rounded-lg p-2 text-slate-400 hover:text-white hover:bg-brand-paper/60 transition-colors"
          >
            <Settings className="h-5 w-5" />
          </Link>
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm font-semibold">
            AI
          </div>
        </div>
      </div>
    </header>
  );
}
