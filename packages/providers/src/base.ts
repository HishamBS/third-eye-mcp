import { z } from 'zod';

// Provider types
export interface ModelInfo {
  id: string;
  name: string;
  context_window: number;
  pricing?: {
    prompt: number; // per 1M tokens
    completion: number; // per 1M tokens
  };
}

export interface CompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stop?: string[];
  response_format?: { type: 'json_object' | 'text' };
}

export interface CompletionResponse {
  id: string;
  model: string;
  content: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  finish_reason: 'stop' | 'length' | 'content_filter' | 'tool_calls';
}

export interface HealthStatus {
  healthy: boolean;
  latency_ms?: number;
  error?: string;
}

export interface ProviderConfig {
  apiKey?: string;
  baseUrl?: string;
  timeout?: number; // milliseconds
  maxRetries?: number;
}

// Base provider interface
export abstract class BaseProvider {
  protected config: ProviderConfig;

  constructor(config: ProviderConfig = {}) {
    this.config = {
      timeout: 30000,
      maxRetries: 3,
      ...config
    };
  }

  abstract get name(): string;
  abstract get requiresApiKey(): boolean;

  abstract listModels(): Promise<ModelInfo[]>;
  abstract complete(request: CompletionRequest): Promise<CompletionResponse>;
  abstract health(): Promise<HealthStatus>;

  protected async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = this.config.maxRetries || 3
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeout);

      // Retry on rate limit or server errors
      if ((response.status === 429 || response.status >= 500) && retries > 0) {
        const delay = Math.min(1000 * Math.pow(2, 3 - retries), 8000);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      return response;
    } catch (error) {
      clearTimeout(timeout);

      if (retries > 0 && error instanceof Error) {
        const delay = 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.fetchWithRetry(url, options, retries - 1);
      }

      throw error;
    }
  }

  protected normalizeError(error: unknown): string {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return `Request timeout after ${this.config.timeout}ms`;
      }
      return error.message;
    }
    return String(error);
  }

  protected normalizeFinishReason(reason: string | undefined | null): CompletionResponse['finish_reason'] {
    if (reason === 'length' || reason === 'content_filter' || reason === 'tool_calls') {
      return reason;
    }
    return 'stop';
  }
}
