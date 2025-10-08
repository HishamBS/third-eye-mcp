/**
 * RFC7807 Problem+JSON Error Formatting
 *
 * Standardized HTTP error responses following RFC7807 specification
 */

import { z } from 'zod';

// RFC7807 Problem Details schema
export const ProblemDetailsSchema = z.object({
  type: z.string().url().optional(),
  title: z.string(),
  status: z.number().int().min(100).max(599).optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
  // Extension members (additional properties allowed)
}).passthrough();

export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;

// Common error types for Third Eye MCP
export const ERROR_TYPES = {
  // Pipeline Errors
  PIPELINE_ORDER: 'https://third-eye-mcp.dev/errors/pipeline-order',
  EYE_NOT_FOUND: 'https://third-eye-mcp.dev/errors/eye-not-found',
  EYE_VALIDATION: 'https://third-eye-mcp.dev/errors/eye-validation',
  EYE_EXECUTION: 'https://third-eye-mcp.dev/errors/eye-execution',

  // Configuration Errors
  ROUTING_CONFIG: 'https://third-eye-mcp.dev/errors/routing-config',
  PROVIDER_KEY: 'https://third-eye-mcp.dev/errors/provider-key',
  MODEL_UNAVAILABLE: 'https://third-eye-mcp.dev/errors/model-unavailable',

  // Session Errors
  SESSION_NOT_FOUND: 'https://third-eye-mcp.dev/errors/session-not-found',
  SESSION_EXPIRED: 'https://third-eye-mcp.dev/errors/session-expired',
  SESSION_CONFLICT: 'https://third-eye-mcp.dev/errors/session-conflict',

  // Database Errors
  DB_CONNECTION: 'https://third-eye-mcp.dev/errors/db-connection',
  DB_MIGRATION: 'https://third-eye-mcp.dev/errors/db-migration',
  DB_CONSTRAINT: 'https://third-eye-mcp.dev/errors/db-constraint',

  // Authentication Errors
  ENCRYPTION_FAILED: 'https://third-eye-mcp.dev/errors/encryption-failed',
  PASSPHRASE_INVALID: 'https://third-eye-mcp.dev/errors/passphrase-invalid',

  // Input Validation Errors
  INVALID_INPUT: 'https://third-eye-mcp.dev/errors/invalid-input',
  SCHEMA_VALIDATION: 'https://third-eye-mcp.dev/errors/schema-validation',

  // Generic
  INTERNAL_ERROR: 'https://third-eye-mcp.dev/errors/internal-error',
  NOT_IMPLEMENTED: 'https://third-eye-mcp.dev/errors/not-implemented',
} as const;

// HTTP status codes mapping
export const ERROR_STATUS_CODES = {
  [ERROR_TYPES.PIPELINE_ORDER]: 422,
  [ERROR_TYPES.EYE_NOT_FOUND]: 404,
  [ERROR_TYPES.EYE_VALIDATION]: 422,
  [ERROR_TYPES.EYE_EXECUTION]: 500,
  [ERROR_TYPES.ROUTING_CONFIG]: 500,
  [ERROR_TYPES.PROVIDER_KEY]: 500,
  [ERROR_TYPES.MODEL_UNAVAILABLE]: 503,
  [ERROR_TYPES.SESSION_NOT_FOUND]: 404,
  [ERROR_TYPES.SESSION_EXPIRED]: 410,
  [ERROR_TYPES.SESSION_CONFLICT]: 409,
  [ERROR_TYPES.DB_CONNECTION]: 503,
  [ERROR_TYPES.DB_MIGRATION]: 500,
  [ERROR_TYPES.DB_CONSTRAINT]: 409,
  [ERROR_TYPES.ENCRYPTION_FAILED]: 500,
  [ERROR_TYPES.PASSPHRASE_INVALID]: 401,
  [ERROR_TYPES.INVALID_INPUT]: 400,
  [ERROR_TYPES.SCHEMA_VALIDATION]: 400,
  [ERROR_TYPES.INTERNAL_ERROR]: 500,
  [ERROR_TYPES.NOT_IMPLEMENTED]: 501,
} as const;

/**
 * Problem+JSON error formatter
 */
export class ProblemJsonFormatter {
  /**
   * Create standardized problem details
   */
  static createProblem(options: {
    type?: string;
    title: string;
    status?: number;
    detail?: string;
    instance?: string;
    extensions?: Record<string, any>;
  }): ProblemDetails {
    const problem: ProblemDetails = {
      title: options.title,
    };

    if (options.type) {
      problem.type = options.type;
      // Auto-assign status code if type is known
      if (!options.status && options.type in ERROR_STATUS_CODES) {
        problem.status = ERROR_STATUS_CODES[options.type as keyof typeof ERROR_STATUS_CODES];
      }
    }

    if (options.status) {
      problem.status = options.status;
    }

    if (options.detail) {
      problem.detail = options.detail;
    }

    if (options.instance) {
      problem.instance = options.instance;
    }

    // Add extension members
    if (options.extensions) {
      Object.assign(problem, options.extensions);
    }

    return problem;
  }

  /**
   * Create pipeline order violation problem
   */
  static pipelineOrder(violation: {
    eye: string;
    violation: string;
    expectedNext: string[];
    fixInstructions: string;
    sessionId?: string;
  }): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.PIPELINE_ORDER,
      title: 'Pipeline Order Violation',
      detail: violation.violation,
      instance: violation.sessionId ? `/sessions/${violation.sessionId}` : undefined,
      extensions: {
        eye: violation.eye,
        expectedNext: violation.expectedNext,
        fixInstructions: violation.fixInstructions,
        code: 'E_PIPELINE_ORDER',
      },
    });
  }

  /**
   * Create Eye not found problem
   */
  static eyeNotFound(eyeName: string): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.EYE_NOT_FOUND,
      title: 'Eye Not Found',
      detail: `Eye implementation not found: ${eyeName}`,
      extensions: {
        eyeName,
        availableEyes: ['overseer', 'sharingan', 'prompt-helper', 'jogan', 'rinnegan', 'mangekyo', 'tenseigan', 'byakugan'],
      },
    });
  }

  /**
   * Create Eye validation problem
   */
  static eyeValidation(eyeName: string, errors: string[]): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.EYE_VALIDATION,
      title: 'Eye Validation Failed',
      detail: `Eye response validation failed: ${errors.join(', ')}`,
      extensions: {
        eyeName,
        validationErrors: errors,
      },
    });
  }

  /**
   * Create routing configuration problem
   */
  static routingConfig(eyeName: string): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.ROUTING_CONFIG,
      title: 'Routing Configuration Missing',
      detail: `No routing configuration found for Eye: ${eyeName}. Run migration 0004 to seed routing.`,
      extensions: {
        eyeName,
        solution: 'Run migration 0004 to seed routing configuration',
      },
    });
  }

  /**
   * Create provider key problem
   */
  static providerKey(provider: string): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.PROVIDER_KEY,
      title: 'Provider API Key Missing',
      detail: `No API key configured for provider: ${provider}. Add key via UI Settings or .env file.`,
      extensions: {
        provider,
        solution: 'Add API key via UI Settings or environment variables',
      },
    });
  }

  /**
   * Create session not found problem
   */
  static sessionNotFound(sessionId: string): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.SESSION_NOT_FOUND,
      title: 'Session Not Found',
      detail: `Session does not exist: ${sessionId}`,
      instance: `/sessions/${sessionId}`,
      extensions: {
        sessionId,
      },
    });
  }

  /**
   * Create validation error problem
   */
  static validationError(field: string, errors: string[]): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.SCHEMA_VALIDATION,
      title: 'Input Validation Failed',
      detail: `Validation failed for field: ${field}`,
      extensions: {
        field,
        errors,
      },
    });
  }

  /**
   * Create database connection problem
   */
  static databaseConnection(error: string): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.DB_CONNECTION,
      title: 'Database Connection Failed',
      detail: 'Unable to connect to database',
      extensions: {
        error,
        solution: 'Check database configuration and ensure database is running',
      },
    });
  }

  /**
   * Create encryption problem
   */
  static encryptionFailed(operation: string): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.ENCRYPTION_FAILED,
      title: 'Encryption Operation Failed',
      detail: `Failed to ${operation} encrypted data`,
      extensions: {
        operation,
        solution: 'Check passphrase file and encryption configuration',
      },
    });
  }

  /**
   * Create internal error problem
   */
  static internalError(error: string, context?: Record<string, any>): ProblemDetails {
    return this.createProblem({
      type: ERROR_TYPES.INTERNAL_ERROR,
      title: 'Internal Server Error',
      detail: 'An unexpected error occurred',
      extensions: {
        error,
        context,
      },
    });
  }

  /**
   * Convert any error to problem+json format
   */
  static fromError(error: Error, context?: Record<string, any>): ProblemDetails {
    // Check if error already has problem details
    if ('type' in error && 'title' in error) {
      return error as unknown as ProblemDetails;
    }

    // Map common error types
    if (error.message.includes('not found')) {
      return this.createProblem({
        type: ERROR_TYPES.NOT_IMPLEMENTED,
        title: 'Resource Not Found',
        detail: error.message,
        extensions: context,
      });
    }

    if (error.message.includes('validation')) {
      return this.createProblem({
        type: ERROR_TYPES.SCHEMA_VALIDATION,
        title: 'Validation Error',
        detail: error.message,
        extensions: context,
      });
    }

    // Default to internal error
    return this.internalError(error.message, {
      ...context,
      stack: error.stack,
    });
  }

  /**
   * Validate problem details against RFC7807
   */
  static validate(problem: unknown): ProblemDetails {
    const result = ProblemDetailsSchema.safeParse(problem);
    if (!result.success) {
      throw new Error(`Invalid problem details: ${result.error.issues.map(i => i.message).join(', ')}`);
    }
    return result.data;
  }

  /**
   * Serialize problem to JSON string
   */
  static serialize(problem: ProblemDetails): string {
    return JSON.stringify(problem, null, 2);
  }

  /**
   * Get content type for HTTP responses
   */
  static getContentType(): string {
    return 'application/problem+json';
  }
}

/**
 * Third Eye specific problem types
 */
export class ThirdEyeProblem extends Error {
  public readonly type: string;
  public readonly title: string;
  public readonly status?: number;
  public readonly detail?: string;
  public readonly instance?: string;
  public readonly extensions?: Record<string, any>;

  constructor(problem: ProblemDetails) {
    super(problem.title);
    this.name = 'ThirdEyeProblem';
    this.type = problem.type || ERROR_TYPES.INTERNAL_ERROR;
    this.title = problem.title;
    this.status = problem.status;
    this.detail = problem.detail;
    this.instance = problem.instance;
    this.extensions = { ...problem };

    // Remove standard fields from extensions
    delete this.extensions.type;
    delete this.extensions.title;
    delete this.extensions.status;
    delete this.extensions.detail;
    delete this.extensions.instance;
  }

  toProblemDetails(): ProblemDetails {
    return {
      type: this.type,
      title: this.title,
      status: this.status,
      detail: this.detail,
      instance: this.instance,
      ...this.extensions,
    };
  }

  toJSON(): ProblemDetails {
    return this.toProblemDetails();
  }
}

// Export utility functions
export { ProblemJsonFormatter as ProblemJson };