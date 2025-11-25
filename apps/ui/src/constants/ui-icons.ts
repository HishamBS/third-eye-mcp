/**
 * UI Icons SSOT - Phase 4
 *
 * Single source of truth for all UI icon names used throughout the application.
 * Maps semantic icon purposes to lucide-react icon names via DynamicIcon component.
 *
 * Per R01: SSOT for all icon references
 * Per R13: No magic string literals for icon names
 * Per R07: Strict typing, no 'any'
 *
 * Usage:
 * import { UI_ICON_NAMES } from '@/constants/ui-icons';
 * <DynamicIcon name={UI_ICON_NAMES.NAVIGATION.MENU} />
 */

/**
 * Navigation icons
 */
export const NAVIGATION_ICONS = {
  MENU: "menu",
  HOME: "home",
  BACK: "arrow-left",
  FORWARD: "arrow-right",
  UP: "arrow-up",
  DOWN: "arrow-down",
  CLOSE: "x",
  EXPAND: "chevron-right",
  COLLAPSE: "chevron-left",
  EXPAND_DOWN: "chevron-down",
  COLLAPSE_UP: "chevron-up",
  EXTERNAL_LINK: "external-link",
} as const;

/**
 * Action icons
 */
export const ACTION_ICONS = {
  ADD: "plus",
  EDIT: "pencil",
  DELETE: "trash-2",
  SAVE: "save",
  CANCEL: "x",
  COPY: "copy",
  DOWNLOAD: "download",
  UPLOAD: "upload",
  REFRESH: "refresh-cw",
  SEARCH: "search",
  FILTER: "filter",
  SORT: "arrow-up-down",
  SETTINGS: "settings",
  MORE: "more-horizontal",
  MORE_VERTICAL: "more-vertical",
} as const;

/**
 * Status icons
 */
export const STATUS_ICONS = {
  SUCCESS: "check-circle",
  ERROR: "x-circle",
  WARNING: "alert-triangle",
  INFO: "info",
  LOADING: "loader",
  CHECK: "check",
  CROSS: "x",
  PENDING: "clock",
  ACTIVE: "activity",
  INACTIVE: "circle",
} as const;

/**
 * Data visualization icons
 */
export const DATA_ICONS = {
  CHART_BAR: "bar-chart",
  CHART_LINE: "line-chart",
  CHART_PIE: "pie-chart",
  ANALYTICS: "trending-up",
  DASHBOARD: "layout-dashboard",
  MONITOR: "monitor",
  DATABASE: "database",
  SERVER: "server",
  CLOUD: "cloud",
} as const;

/**
 * Communication icons
 */
export const COMMUNICATION_ICONS = {
  MESSAGE: "message-circle",
  MAIL: "mail",
  BELL: "bell",
  CHAT: "message-square",
  COMMENT: "message-circle",
  SEND: "send",
  INBOX: "inbox",
} as const;

/**
 * User/Account icons
 */
export const USER_ICONS = {
  USER: "user",
  USERS: "users",
  USER_PLUS: "user-plus",
  USER_MINUS: "user-minus",
  USER_CHECK: "user-check",
  USER_X: "user-x",
  PROFILE: "user-circle",
  LOGIN: "log-in",
  LOGOUT: "log-out",
  KEY: "key",
  SHIELD: "shield",
  LOCK: "lock",
  UNLOCK: "unlock",
} as const;

/**
 * File/Document icons
 */
export const FILE_ICONS = {
  FILE: "file",
  FILE_TEXT: "file-text",
  FOLDER: "folder",
  FOLDER_OPEN: "folder-open",
  DOCUMENT: "file-text",
  CODE: "code",
  IMAGE: "image",
  VIDEO: "video",
  ARCHIVE: "archive",
} as const;

/**
 * Time/Calendar icons
 */
export const TIME_ICONS = {
  CALENDAR: "calendar",
  CLOCK: "clock",
  TIMER: "timer",
  HISTORY: "history",
  SCHEDULE: "calendar-clock",
} as const;

/**
 * System/Tool icons
 */
export const SYSTEM_ICONS = {
  COG: "cog",
  SETTINGS: "settings",
  TOOLS: "wrench",
  SLIDERS: "sliders",
  TOGGLE_LEFT: "toggle-left",
  TOGGLE_RIGHT: "toggle-right",
  POWER: "power",
  PLUG: "plug",
  WIFI: "wifi",
  WIFI_OFF: "wifi-off",
} as const;

/**
 * Media/Playback icons
 */
export const MEDIA_ICONS = {
  PLAY: "play",
  PAUSE: "pause",
  STOP: "square",
  SKIP_FORWARD: "skip-forward",
  SKIP_BACK: "skip-back",
  FAST_FORWARD: "fast-forward",
  REWIND: "rewind",
  VOLUME: "volume-2",
  VOLUME_OFF: "volume-x",
  MAXIMIZE: "maximize",
  MINIMIZE: "minimize",
} as const;

/**
 * E-commerce/Business icons
 */
export const BUSINESS_ICONS = {
  SHOPPING_CART: "shopping-cart",
  CREDIT_CARD: "credit-card",
  DOLLAR: "dollar-sign",
  TAG: "tag",
  GIFT: "gift",
  BRIEFCASE: "briefcase",
  BUILDING: "building",
} as const;

/**
 * Location/Map icons
 */
export const LOCATION_ICONS = {
  MAP: "map",
  MAP_PIN: "map-pin",
  NAVIGATION: "navigation",
  COMPASS: "compass",
  GLOBE: "globe",
} as const;

/**
 * Feedback/Interaction icons
 */
export const FEEDBACK_ICONS = {
  THUMBS_UP: "thumbs-up",
  THUMBS_DOWN: "thumbs-down",
  HEART: "heart",
  STAR: "star",
  FLAG: "flag",
  BOOKMARK: "bookmark",
  SHARE: "share-2",
  LINK: "link",
} as const;

/**
 * All UI icon names grouped by category
 * Single source of truth for all icon references
 */
export const UI_ICON_NAMES = {
  NAVIGATION: NAVIGATION_ICONS,
  ACTION: ACTION_ICONS,
  STATUS: STATUS_ICONS,
  DATA: DATA_ICONS,
  COMMUNICATION: COMMUNICATION_ICONS,
  USER: USER_ICONS,
  FILE: FILE_ICONS,
  TIME: TIME_ICONS,
  SYSTEM: SYSTEM_ICONS,
  MEDIA: MEDIA_ICONS,
  BUSINESS: BUSINESS_ICONS,
  LOCATION: LOCATION_ICONS,
  FEEDBACK: FEEDBACK_ICONS,
} as const;

/**
 * Type for all valid UI icon names
 */
export type UIIconName = (typeof UI_ICON_NAMES)[keyof typeof UI_ICON_NAMES][keyof (typeof UI_ICON_NAMES)[keyof typeof UI_ICON_NAMES]];

/**
 * Helper to check if a string is a valid UI icon name
 */
export function isValidUIIcon(name: string): name is UIIconName {
  const allIconNames = Object.values(UI_ICON_NAMES).flatMap((category) =>
    Object.values(category),
  );
  return allIconNames.includes(name as UIIconName);
}
