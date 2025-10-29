/**
 * DynamicIcon Component
 *
 * Renders lucide-react icons dynamically based on string identifier.
 * Replaces hardcoded emojis with proper icon components.
 */

import {
  Eye,
  Bot,
  User,
  Settings,
  MessageSquare,
  HelpCircle,
  Hand,
  Search,
  Braces,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BadgeCheck,
  type LucideIcon,
} from 'lucide-react';

const ICON_MAP: Record<string, LucideIcon> = {
  eye: Eye,
  bot: Bot,
  user: User,
  settings: Settings,
  timeline: MessageSquare,
  'help-circle': HelpCircle,
  hand: Hand,
  search: Search,
  braces: Braces,
  'check-circle': CheckCircle,
  'x-circle': XCircle,
  clock: Clock,
  'alert-triangle': AlertTriangle,
  'badge-check': BadgeCheck,
};

export interface DynamicIconProps {
  readonly name: string;
  readonly className?: string;
  readonly size?: number;
}

/**
 * Renders a lucide-react icon by name
 */
export function DynamicIcon({ name, className, size = 16 }: DynamicIconProps) {
  const IconComponent = ICON_MAP[name] || Eye;
  return <IconComponent className={className} size={size} />;
}
