/**
 * API-related constants for Third Eye MCP
 * Leaderboard categories, export formats, and other API enums
 */

/**
 * Leaderboard Categories - Rankings by performance metrics
 */
export const LEADERBOARD_CATEGORIES = {
  FASTEST: "fastest",
  CHEAPEST: "cheapest",
  RELIABLE: "reliable",
  POPULAR: "popular",
  QUALITY: "quality",
} as const;

export type LeaderboardCategory =
  (typeof LEADERBOARD_CATEGORIES)[keyof typeof LEADERBOARD_CATEGORIES];

/**
 * Export Formats - Supported file formats for data export
 */
export const EXPORT_FORMATS = {
  PDF: "pdf",
  HTML: "html",
  JSON: "json",
  MARKDOWN: "md",
} as const;

export type ExportFormat = (typeof EXPORT_FORMATS)[keyof typeof EXPORT_FORMATS];

/**
 * Helper function to check if a value is a valid leaderboard category
 */
export const isLeaderboardCategory = (
  value: string,
): value is LeaderboardCategory => {
  return Object.values(LEADERBOARD_CATEGORIES).includes(
    value as LeaderboardCategory,
  );
};

/**
 * Helper function to check if a value is a valid export format
 */
export const isExportFormat = (value: string): value is ExportFormat => {
  return Object.values(EXPORT_FORMATS).includes(value as ExportFormat);
};
