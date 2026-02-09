/**
 * API Configuration Constants
 *
 * SSOT for all API-related configuration values.
 *
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for API URLs.
 * - All API calls MUST use these constants
 * - NEVER hardcode API URLs in components or services
 */

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:7070";
export const WS_BASE_URL =
  process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:7070";

export const DEFAULT_API_PORT = 7070;

/**
 * Get API URL without trailing slash
 * Some components use regex to remove trailing slashes - this centralizes that logic
 */
export function getApiUrl(): string {
  return API_BASE_URL.replace(/\/$/, "");
}

/**
 * Get WebSocket URL without trailing slash
 */
export function getWsUrl(): string {
  return WS_BASE_URL.replace(/\/$/, "");
}
