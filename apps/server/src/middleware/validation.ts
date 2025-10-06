import { Context, Next } from 'hono';
import { z, ZodSchema } from 'zod';

/**
 * Input Validation Middleware
 *
 * Validates request bodies, sanitizes inputs, and enforces rate limits
 */

// Rate limiting storage (in-memory, use Redis in production)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

/**
 * Sanitize string input to prevent injection attacks
 */
export function sanitizeString(input: string): string {
  if (typeof input !== 'string') return input;

  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, '')
    // Remove SQL injection patterns
    .replace(/(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/gi, '')
    // Remove script tags and event handlers
    .replace(/on\w+\s*=/gi, '')
    // Trim whitespace
    .trim();
}

/**
 * Recursively sanitize object values
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (obj !== null && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      sanitized[key] = sanitizeObject(value);
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate request body against Zod schema
 */
export function validateBody<T extends ZodSchema>(schema: T) {
  return async (c: Context, next: Next) => {
    try {
      const body = await c.req.json();

      // Sanitize inputs
      const sanitized = sanitizeObject(body);

      // Validate against schema
      const validated = schema.parse(sanitized);

      // Store validated body for route handler
      c.set('validatedBody', validated);

      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return c.json({
          error: 'Validation failed',
          details: error.errors.map((e) => ({
            path: e.path.join('.'),
            message: e.message,
          })),
        }, 400);
      }

      return c.json({
        error: 'Invalid request body',
        message: error instanceof Error ? error.message : 'Unknown error',
      }, 400);
    }
  };
}

/**
 * Rate limiting middleware
 * Default: 100 requests per minute per session/IP
 */
export function rateLimit(options?: {
  maxRequests?: number;
  windowMs?: number;
  keyGenerator?: (c: Context) => string;
}) {
  const maxRequests = options?.maxRequests || 100;
  const windowMs = options?.windowMs || 60000; // 1 minute
  const keyGenerator = options?.keyGenerator || ((c: Context) => {
    // Use sessionId if available, otherwise IP address
    const sessionId = c.req.query('sessionId') || c.req.header('x-session-id');
    if (sessionId) return `session:${sessionId}`;

    const ip = c.req.header('x-forwarded-for') || c.req.header('x-real-ip') || 'unknown';
    return `ip:${ip}`;
  });

  return async (c: Context, next: Next) => {
    const key = keyGenerator(c);
    const now = Date.now();

    // Get or create rate limit entry
    let entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      // Create new window
      entry = {
        count: 0,
        resetAt: now + windowMs,
      };
      rateLimitStore.set(key, entry);
    }

    // Increment request count
    entry.count++;

    // Check if rate limit exceeded
    if (entry.count > maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);

      c.header('X-RateLimit-Limit', maxRequests.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', entry.resetAt.toString());
      c.header('Retry-After', retryAfter.toString());

      return c.json({
        error: 'Rate limit exceeded',
        message: `Too many requests. Please try again in ${retryAfter} seconds.`,
        retryAfter,
      }, 429);
    }

    // Set rate limit headers
    c.header('X-RateLimit-Limit', maxRequests.toString());
    c.header('X-RateLimit-Remaining', (maxRequests - entry.count).toString());
    c.header('X-RateLimit-Reset', entry.resetAt.toString());

    await next();
  };
}

/**
 * Clean up expired rate limit entries periodically
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetAt + 60000) { // 1 minute grace period
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Run every minute

/**
 * Common validation schemas
 */
export const schemas = {
  mcpRun: z.object({
    eye: z.string().optional(),
    input: z.any().optional(),
    task: z.string().optional(),
    sessionId: z.string().optional(),
  }).refine(
    (data) => (data.eye && data.input) || data.task,
    'Either (eye + input) or task must be provided'
  ),

  sessionCreate: z.object({
    config: z.record(z.any()).optional(),
  }),

  contextAdd: z.object({
    source: z.enum(['user', 'eye']),
    key: z.string().min(1),
    value: z.any(),
  }),

  duelCreate: z.object({
    eyeName: z.string().min(1),
    modelA: z.string().min(1),
    modelB: z.string().min(1),
    input: z.string().min(1),
    iterations: z.number().int().min(1).max(10).default(5),
  }),

  clarificationValidate: z.object({
    answer: z.string().min(1),
  }),
};

/**
 * Helper to get validated body from context
 */
export function getValidatedBody<T>(c: Context): T {
  return c.get('validatedBody') as T;
}
