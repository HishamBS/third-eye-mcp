/**
 * @third-eye/providers - AI Provider adapters with unified API
 */

// Provider implementations
export { GroqProvider } from "./src/groq";
export { OpenRouterProvider } from "./src/openrouter";
export { OllamaProvider } from "./src/ollama";
export { LMStudioProvider } from "./src/lmstudio";

// Provider factory
export { ProviderFactory } from "./src/factory";
export { BaseProvider } from "./src/base";
export type { ProviderType } from "./src/factory";

export type { ProviderConfig } from "./src/base";

// Re-export types
export type {
  ProviderId,
  ProviderClient,
  ModelInfo,
  CompletionRequest,
  CompletionResponse,
  HealthResponse,
} from "@third-eye/types";
