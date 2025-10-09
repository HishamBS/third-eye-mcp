import { Context, Next } from 'hono';
import { getDb } from '@third-eye/db';
import { getConfig } from '@third-eye/config';
import { eq } from 'drizzle-orm';

/**
 * API Authentication Middleware
 *
 * Optional API key authentication for production deployments
 * Local-first mode: API key optional, defaults to localhost-only binding
 */

/**
 * Check if API key authentication is required
 */
export function isAuthRequired(): boolean {
  return process.env.REQUIRE_API_KEY === 'true';
}

/**
 * API Key authentication middleware
 */
export function requireApiKey() {
  return async (c: Context, next: Next) => {
    // Skip authentication if not required
    if (!isAuthRequired()) {
      await next();
      return;
    }

    const apiKey = c.req.header('X-API-Key') || c.req.query('apiKey');

    if (!apiKey) {
      return c.json({
        error: 'Unauthorized',
        message: 'API key required. Provide X-API-Key header or apiKey query parameter.',
      }, 401);
    }

    try {
      const { db } = getDb();

      // Note: This assumes an api_keys table exists
      // For now, we'll use a simple environment variable check
      const validKeys = (process.env.API_KEYS || '').split(',').filter(Boolean);

      if (validKeys.length === 0) {
        console.warn('⚠️  REQUIRE_API_KEY=true but no API_KEYS configured');
        return c.json({
          error: 'Server misconfiguration',
          message: 'API key authentication enabled but no keys configured',
        }, 500);
      }

      if (!validKeys.includes(apiKey)) {
        return c.json({
          error: 'Unauthorized',
          message: 'Invalid API key',
        }, 401);
      }

      // API key is valid, store it in context for usage tracking
      c.set('apiKey', apiKey);

      await next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return c.json({
        error: 'Authentication failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 500);
    }
  };
}

/**
 * Optional API key middleware (allows unauthenticated requests)
 */
export function optionalApiKey() {
  return async (c: Context, next: Next) => {
    const apiKey = c.req.header('X-API-Key') || c.req.query('apiKey');

    if (apiKey) {
      c.set('apiKey', apiKey);
    }

    await next();
  };
}

/**
 * CORS middleware for production deployments
 */
export function cors(options?: {
  origins?: string[];
  methods?: string[];
  headers?: string[];
}) {
  const origins = options?.origins || ['http://localhost:3000', 'http://localhost:5173'];
  const methods = options?.methods || ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'];
  const headers = options?.headers || ['Content-Type', 'X-API-Key', 'X-Session-Id'];

  return async (c: Context, next: Next) => {
    const origin = c.req.header('Origin');

    // Allow configured origins or wildcard
    if (origin && (origins.includes('*') || origins.includes(origin))) {
      c.header('Access-Control-Allow-Origin', origin);
    } else if (origins.includes('*')) {
      c.header('Access-Control-Allow-Origin', '*');
    }

    c.header('Access-Control-Allow-Methods', methods.join(', '));
    c.header('Access-Control-Allow-Headers', headers.join(', '));
    c.header('Access-Control-Max-Age', '86400'); // 24 hours

    // Handle preflight requests
    if (c.req.method === 'OPTIONS') {
      return c.text('', 204);
    }

    await next();
  };
}

/**
 * Security headers middleware
 */
export function securityHeaders() {
  return async (c: Context, next: Next) => {
    // Prevent clickjacking
    c.header('X-Frame-Options', 'SAMEORIGIN');

    // Prevent MIME type sniffing
    c.header('X-Content-Type-Options', 'nosniff');

    // XSS protection
    c.header('X-XSS-Protection', '1; mode=block');

    // Referrer policy
    c.header('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Content Security Policy
    c.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'");

    await next();
  };
}

/**
 * Localhost-only binding check
 */
export function checkLocalhostBinding() {
  const { server, security } = getConfig();
  const host = server.host;

  if (security.bindWarning && (host === '0.0.0.0' || host === '::')) {
    console.warn('⚠️  WARNING: Server binding to a public interface (all network interfaces)');
    console.warn('   This exposes the server to your local network.');
    console.warn('   For production, use REQUIRE_API_KEY=true or bind to 127.0.0.1');
  } else if (host === '127.0.0.1' || host === 'localhost') {
    console.log('✅ Server binding to localhost only (secure local-first mode)');
  }
}
