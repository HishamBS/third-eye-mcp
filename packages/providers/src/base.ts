import type {
  ProviderModelInfo,
  CompletionRequest,
  CompletionResponse,
  HealthStatus,
  ProviderConfig,
  FunctionTool,
  ToolCall,
} from "@third-eye/types";

// Re-export types from SSOT for convenience
export type {
  ProviderModelInfo as ModelInfo,
  CompletionRequest,
  CompletionResponse,
  HealthStatus,
  ProviderConfig,
  FunctionTool,
  ToolCall,
};

// Base provider interface
export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config,
    };
  }

  abstract get name(): string;
  abstract get requiresApiKey(): boolean;

  abstract listModels(): Promise<ProviderModelInfo[]>;
  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
  abstract health(): Promise<HealthStatus>;

  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = this.config.maxRetries || 3,
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeout);

      // Retry on rate limit or server errors
      if ((response.status === 429 || response.status >= 500) && retries > 0) {
        const delay = Math.min(1000 * Math.pow(2, 3 - retries), 8000);
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);

      if (retries > 0 && error instanceof Error) {
        const delay = 1000;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw error;
    }
  }

  protected normalizeError(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === "AbortError") {
        return `Request timeout after ${this.config.timeout}ms`;
      }
      return error.message;
    }
    return String(error);
  }

  protected normalizeFinishReason(
    reason: string | undefined | null,
  ): CompletionResponse["finish_reason"] {
    if (
      reason === "length" ||
      reason === "content_filter" ||
      reason === "tool_calls"
    ) {
      return reason;
    }
    return "stop";
  }
}
