/**
 * HTTP Constants - SSOT for all HTTP-related magic values
 * R13 Compliance: No magic numbers or literal strings
 * R01 Compliance: Single Source of Truth for HTTP constants
 */

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  MULTI_STATUS: 207,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
  NOT_IMPLEMENTED: 501,
  SERVICE_UNAVAILABLE: 503,
} as const;

export const CORS_ORIGINS = {
  WILDCARD: "*",
  MCP_PROTOCOL: "mcp://",
} as const;

export const HTTP_METHODS = {
  GET: "GET",
  POST: "POST",
  PUT: "PUT",
  PATCH: "PATCH",
  DELETE: "DELETE",
  OPTIONS: "OPTIONS",
  HEAD: "HEAD",
} as const;

export const CONTENT_TYPES = {
  JSON: "application/json",
  TEXT: "text/plain",
  HTML: "text/html",
  MARKDOWN: "text/markdown",
  CSV: "text/csv",
  XML: "application/xml",
  FORM_URLENCODED: "application/x-www-form-urlencoded",
  MULTIPART_FORM: "multipart/form-data",
} as const;

export const HTTP_HEADERS = {
  CONTENT_TYPE: "Content-Type",
  AUTHORIZATION: "Authorization",
  ACCEPT: "Accept",
  USER_AGENT: "User-Agent",
  ORIGIN: "Origin",
  REFERER: "Referer",
  X_REQUEST_ID: "X-Request-ID",
  X_FORWARDED_FOR: "X-Forwarded-For",
} as const;
