/**
 * DynamicIcon Component - SSOT for UI Icons
 *
 * Renders lucide-react icons dynamically based on string identifier.
 * Single source of truth for all UI icon components in the application.
 *
 * Per R01: SSOT for icon component mapping
 * Per R13: No direct lucide-react imports in other files
 * Per R07: Strict typing, no 'any'
 *
 * Usage: Import from @/constants/ui-icons for icon names
 */

import {
  // Navigation
  Menu,
  Home,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ArrowDown,
  X,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  // Actions
  Plus,
  Pencil,
  Trash2,
  Save,
  Copy,
  Download,
  Upload,
  RefreshCw,
  Search,
  Filter,
  ArrowUpDown,
  Settings,
  MoreHorizontal,
  MoreVertical,
  // Status
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Loader,
  Check,
  Clock,
  Activity,
  Circle,
  // Data visualization
  BarChart,
  LineChart,
  PieChart,
  TrendingUp,
  LayoutDashboard,
  Monitor,
  Database,
  Server,
  Cloud,
  // Communication
  MessageCircle,
  Mail,
  Bell,
  MessageSquare,
  Send,
  Inbox,
  // User/Account
  User,
  Users,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  UserCircle,
  LogIn,
  LogOut,
  Key,
  Shield,
  Lock,
  Unlock,
  // File/Document
  File,
  FileText,
  Folder,
  FolderOpen,
  Code,
  Image,
  Video,
  Archive,
  // Time/Calendar
  Calendar,
  Timer,
  History,
  CalendarClock,
  // System/Tool
  Cog,
  Wrench,
  Sliders,
  ToggleLeft,
  ToggleRight,
  Power,
  Plug,
  Wifi,
  WifiOff,
  // Media/Playback
  Play,
  Pause,
  Square,
  SkipForward,
  SkipBack,
  FastForward,
  Rewind,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  // Business
  ShoppingCart,
  CreditCard,
  DollarSign,
  Tag,
  Gift,
  Briefcase,
  Building,
  // Location/Map
  Map,
  MapPin,
  Navigation,
  Compass,
  Globe,
  // Feedback/Interaction
  ThumbsUp,
  ThumbsDown,
  Heart,
  Star,
  Flag,
  Bookmark,
  Share2,
  Link,
  // Legacy/Other
  Eye,
  Bot,
  HelpCircle,
  Hand,
  Braces,
  BadgeCheck,
  type LucideIcon,
} from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  // Navigation
  menu: Menu,
  home: Home,
  "arrow-left": ArrowLeft,
  "arrow-right": ArrowRight,
  "arrow-up": ArrowUp,
  "arrow-down": ArrowDown,
  x: X,
  "chevron-right": ChevronRight,
  "chevron-left": ChevronLeft,
  "chevron-down": ChevronDown,
  "chevron-up": ChevronUp,
  "external-link": ExternalLink,
  // Actions
  plus: Plus,
  pencil: Pencil,
  "trash-2": Trash2,
  save: Save,
  copy: Copy,
  download: Download,
  upload: Upload,
  "refresh-cw": RefreshCw,
  search: Search,
  filter: Filter,
  "arrow-up-down": ArrowUpDown,
  settings: Settings,
  "more-horizontal": MoreHorizontal,
  "more-vertical": MoreVertical,
  // Status
  "check-circle": CheckCircle,
  "x-circle": XCircle,
  "alert-triangle": AlertTriangle,
  info: Info,
  loader: Loader,
  check: Check,
  clock: Clock,
  activity: Activity,
  circle: Circle,
  // Data visualization
  "bar-chart": BarChart,
  "line-chart": LineChart,
  "pie-chart": PieChart,
  "trending-up": TrendingUp,
  "layout-dashboard": LayoutDashboard,
  monitor: Monitor,
  database: Database,
  server: Server,
  cloud: Cloud,
  // Communication
  "message-circle": MessageCircle,
  mail: Mail,
  bell: Bell,
  "message-square": MessageSquare,
  send: Send,
  inbox: Inbox,
  // User/Account
  user: User,
  users: Users,
  "user-plus": UserPlus,
  "user-minus": UserMinus,
  "user-check": UserCheck,
  "user-x": UserX,
  "user-circle": UserCircle,
  "log-in": LogIn,
  "log-out": LogOut,
  key: Key,
  shield: Shield,
  lock: Lock,
  unlock: Unlock,
  // File/Document
  file: File,
  "file-text": FileText,
  folder: Folder,
  "folder-open": FolderOpen,
  code: Code,
  image: Image,
  video: Video,
  archive: Archive,
  // Time/Calendar
  calendar: Calendar,
  timer: Timer,
  history: History,
  "calendar-clock": CalendarClock,
  // System/Tool
  cog: Cog,
  wrench: Wrench,
  sliders: Sliders,
  "toggle-left": ToggleLeft,
  "toggle-right": ToggleRight,
  power: Power,
  plug: Plug,
  wifi: Wifi,
  "wifi-off": WifiOff,
  // Media/Playback
  play: Play,
  pause: Pause,
  square: Square,
  "skip-forward": SkipForward,
  "skip-back": SkipBack,
  "fast-forward": FastForward,
  rewind: Rewind,
  "volume-2": Volume2,
  "volume-x": VolumeX,
  maximize: Maximize,
  minimize: Minimize,
  // Business
  "shopping-cart": ShoppingCart,
  "credit-card": CreditCard,
  "dollar-sign": DollarSign,
  tag: Tag,
  gift: Gift,
  briefcase: Briefcase,
  building: Building,
  // Location/Map
  map: Map,
  "map-pin": MapPin,
  navigation: Navigation,
  compass: Compass,
  globe: Globe,
  // Feedback/Interaction
  "thumbs-up": ThumbsUp,
  "thumbs-down": ThumbsDown,
  heart: Heart,
  star: Star,
  flag: Flag,
  bookmark: Bookmark,
  "share-2": Share2,
  link: Link,
  // Legacy/Other (for backward compatibility)
  eye: Eye,
  bot: Bot,
  timeline: MessageSquare,
  "help-circle": HelpCircle,
  hand: Hand,
  braces: Braces,
  "badge-check": BadgeCheck,
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
