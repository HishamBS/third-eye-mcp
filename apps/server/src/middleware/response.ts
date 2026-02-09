import { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { z } from "zod";

const RESPONSE_VERSION = process.env.npm_package_version || "dev";

/**
 * Standardized HTTP Response Envelope Formatting
 *
 * Provides consistent API response structure following RFC7807 problem+json
 * for HTTP error responses.
 *
 * NOTE: This envelope format is intentionally DIFFERENT from the core messaging
 * Envelope in @third-eye/types (packages/types/envelope.ts). The core Envelope
 * is the Eye-to-Eye communication protocol with fields like {tag, ok, code, md,
 * data, next}. This HTTP envelope wraps API responses with {success, data/error,
 * meta} following REST/RFC7807 conventions. They serve different architectural
 * layers and should NOT be merged.
 *
 * @see packages/types/envelope.ts for the core Eye messaging protocol envelope
 */

// Standard success response envelope
export const SuccessEnvelopeSchema = z.object({
  success: z.literal(true),
  data: z.any(),
  meta: z.object({
    timestamp: z.number(),
    requestId: z.string().optional(),
    version: z.string().optional(),
    pagination: z
      .object({
        page: z.number(),
        limit: z.number(),
        total: z.number(),
        hasNext: z.boolean(),
        hasPrev: z.boolean(),
      })
      .optional(),
  }),
});

// Standard error response envelope
export const ErrorEnvelopeSchema = z.object({
  success: z.literal(false),
  error: z.object({
    type: z.string(),
    title: z.string(),
    status: z.number(),
    detail: z.string().optional(),
    instance: z.string().optional(),
    code: z.string().optional(),
    field: z.string().optional(),
    validation: z
      .array(
        z.object({
          path: z.string(),
          message: z.string(),
        }),
      )
      .optional(),
  }),
  meta: z.object({
    timestamp: z.number(),
    requestId: z.string().optional(),
    version: z.string().optional(),
  }),
});

export type SuccessEnvelope = z.infer<typeof SuccessEnvelopeSchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;

/**
 * Standard error types
 */
export const ERROR_TYPES = {
  VALIDATION_ERROR: "https://third-eye-mcp.dev/errors/validation",
  NOT_FOUND: "https://third-eye-mcp.dev/errors/not-found",
  UNAUTHORIZED: "https://third-eye-mcp.dev/errors/unauthorized",
  FORBIDDEN: "https://third-eye-mcp.dev/errors/forbidden",
  CONFLICT: "https://third-eye-mcp.dev/errors/conflict",
  RATE_LIMIT: "https://third-eye-mcp.dev/errors/rate-limit",
  INTERNAL_ERROR: "https://third-eye-mcp.dev/errors/internal",
  SERVICE_UNAVAILABLE: "https://third-eye-mcp.dev/errors/service-unavailable",
} as const;

/**
 * Create success response
 */
export function createSuccessResponse(
  c: Context,
  data: unknown,
  options?: {
    status?: number;
    pagination?: {
      page: number;
      limit: number;
      total: number;
    };
    requestId?: string;
  },
): Response {
  const status = options?.status || 200;
  const requestId =
    options?.requestId || c.req.header("x-request-id") || generateRequestId();

  // R07 Compliance: Explicitly type envelope to resolve conditional type inference
  const baseMeta = {
    timestamp: Date.now(),
    requestId,
    version: RESPONSE_VERSION,
  };

  const envelope: SuccessEnvelope = {
    success: true,
    data,
    meta: options?.pagination
      ? {
          ...baseMeta,
          pagination: {
            page: options.pagination.page,
            limit: options.pagination.limit,
            total: options.pagination.total,
            hasNext:
              options.pagination.page * options.pagination.limit <
              options.pagination.total,
            hasPrev: options.pagination.page > 1,
          },
        }
      : baseMeta,
  };

  return c.json(envelope, status as ContentfulStatusCode);
}

/**
 * Create error response
 */
export function createErrorResponse(
  c: Context,
  error: {
    type?: string;
    title: string;
    status: number;
    detail?: string;
    code?: string;
    field?: string;
    validation?: Array<{ path: string; message: string }>;
  },
  options?: {
    requestId?: string;
  },
): Response {
  const requestId =
    options?.requestId || c.req.header("x-request-id") || generateRequestId();
  const instance = `${c.req.method} ${c.req.url}`;

  const envelope: ErrorEnvelope = {
    success: false,
    error: {
      type: error.type || ERROR_TYPES.INTERNAL_ERROR,
      title: error.title,
      status: error.status,
      detail: error.detail,
      instance,
      code: error.code,
      field: error.field,
      validation: error.validation,
    },
    meta: {
      timestamp: Date.now(),
      requestId,
      version: RESPONSE_VERSION,
    },
  };

  return c.json(envelope, error.status as ContentfulStatusCode);
}

/**
 * Create validation error response
 */
export function createValidationErrorResponse(
  c: Context,
  validationErrors: Array<{ path: string; message: string }>,
  options?: {
    field?: string;
    requestId?: string;
  },
): Response {
  return createErrorResponse(
    c,
    {
      type: ERROR_TYPES.VALIDATION_ERROR,
      title: "Validation Error",
      status: 400,
      detail: "Request validation failed",
      field: options?.field,
      validation: validationErrors,
    },
    options,
  );
}

/**
 * Create not found error response
 */
export function createNotFoundResponse(
  c: Context,
  resource: string,
  id?: string,
  options?: {
    requestId?: string;
  },
): Response {
  return createErrorResponse(
    c,
    {
      type: ERROR_TYPES.NOT_FOUND,
      title: "Resource Not Found",
      status: 404,
      detail: id
        ? `${resource} with id '${id}' not found`
        : `${resource} not found`,
    },
    options,
  );
}

/**
 * Create internal error response
 */
export function createInternalErrorResponse(
  c: Context,
  message?: string,
  options?: {
    requestId?: string;
    code?: string;
  },
): Response {
  return createErrorResponse(
    c,
    {
      type: ERROR_TYPES.INTERNAL_ERROR,
      title: "Internal Server Error",
      status: 500,
      detail: message || "An unexpected error occurred",
      code: options?.code,
    },
    options,
  );
}

/**
 * Create conflict error response
 */
export function createConflictResponse(
  c: Context,
  message: string,
  options?: {
    requestId?: string;
    code?: string;
  },
): Response {
  return createErrorResponse(
    c,
    {
      type: ERROR_TYPES.CONFLICT,
      title: "Conflict",
      status: 409,
      detail: message,
      code: options?.code,
    },
    options,
  );
}

/**
 * Create unauthorized error response
 */
export function createUnauthorizedResponse(
  c: Context,
  message?: string,
  options?: {
    requestId?: string;
  },
): Response {
  return createErrorResponse(
    c,
    {
      type: ERROR_TYPES.UNAUTHORIZED,
      title: "Unauthorized",
      status: 401,
      detail: message || "Authentication required",
    },
    options,
  );
}

/**
 * Generate unique request ID
 */
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Middleware to add request ID to context
 */
export function requestIdMiddleware() {
  return async (c: Context, next: Function) => {
    const requestId = c.req.header("x-request-id") || generateRequestId();
    c.set("requestId", requestId);
    c.header("x-request-id", requestId);
    await next();
  };
}

/**
 * Enhanced validation middleware with standard error responses
 */
export function validateBodyWithEnvelope<T extends z.ZodSchema>(schema: T) {
  return async (c: Context, next: Function) => {
    try {
      const body = await c.req.json();

      // Normalize eye name to lowercase if present (for routing endpoints)
      // TODO: Phase 2 - Migrate to UUID-based identifiers instead of names
      if (
        body &&
        typeof body === "object" &&
        "eye" in body &&
        typeof body.eye === "string"
      ) {
        body.eye = body.eye.toLowerCase();
      }

      const validated = schema.parse(body);
      c.set("validatedBody", validated);
      await next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        const validationErrors = error.errors.map((e) => ({
          path: e.path.join("."),
          message: e.message,
        }));
        return createValidationErrorResponse(c, validationErrors);
      }

      return createInternalErrorResponse(c, "Failed to parse request body");
    }
  };
}

/**
 * Global error handler middleware
 */
export function errorHandler() {
  return async (c: Context, next: Function) => {
    try {
      await next();
    } catch (error) {
      console.error("Unhandled error:", error);

      if (error instanceof Error) {
        return createInternalErrorResponse(c, error.message);
      }

      return createInternalErrorResponse(c, "An unexpected error occurred");
    }
  };
}
