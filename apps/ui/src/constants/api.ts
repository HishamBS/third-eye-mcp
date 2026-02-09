/**
 * API Configuration Constants
 *
 * SSOT for all API-related configuration values.
 *
 * CRITICAL: This is the SINGLE SOURCE OF TRUTH for API URLs.
 * - All API calls MUST use these constants
 * - NEVER hardcode API URLs in components or services
 */

import {
  DEFAULT_API_URL,
  DEFAULT_SERVER_PORT,
  DEFAULT_HOST,
} from "@third-eye/config/constants";

/** Default WebSocket URL derived from SSOT host/port */
const DEFAULT_WS_URL = `ws://${DEFAULT_HOST}:${DEFAULT_SERVER_PORT}`;

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || DEFAULT_WS_URL;

export const DEFAULT_API_PORT = DEFAULT_SERVER_PORT;

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
