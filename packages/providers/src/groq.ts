import { z } from "zod";
import {
  BaseProvider,
  type CompletionRequest,
  type CompletionResponse,
  type HealthStatus,
  type ModelInfo,
  type ProviderConfig,
} from "./base";

const GroqModelSchema = z.object({
  id: z.string(),
  active: z.boolean().optional(),
  context_window: z.number().optional(),
});

const GroqModelsResponseSchema = z.object({
  data: z.array(GroqModelSchema),
});

// Phase 1-A4: Tool call schema for function calling
const GroqToolCallSchema = z.object({
  id: z.string(),
  type: z.literal("function"),
  function: z.object({
    name: z.string(),
    arguments: z.string(), // JSON string
  }),
});

const GroqChoiceSchema = z.object({
  message: z.object({
    content: z.string().nullish(), // When using tool_calls, content may be undefined (not just null)
    tool_calls: z.array(GroqToolCallSchema).optional(), // Phase 1-A4: Function calling
  }),
  finish_reason: z.string().optional().nullable(),
});

const GroqUsageSchema = z
  .object({
    prompt_tokens: z.number().optional(),
    completion_tokens: z.number().optional(),
    total_tokens: z.number().optional(),
  })
  .optional();

const GroqCompletionResponseSchema = z.object({
  id: z.string(),
  model: z.string(),
  choices: z.array(GroqChoiceSchema).min(1),
  usage: GroqUsageSchema,
});

export class GroqProvider extends BaseProvider {
  private readonly baseUrl = "https://api.groq.com/openai/v1";

  constructor(config: ProviderConfig) {
    super({
      ...config,
      baseUrl: config.baseUrl || "https://api.groq.com/openai/v1",
    });
  }

  get name(): string {
    return "groq";
  }

  get requiresApiKey(): boolean {
    return true;
  }

  async listModels(): Promise<ModelInfo[]> {
    if (!this.config.apiKey) {
      throw new Error("Groq API key required");
    }

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data = GroqModelsResponseSchema.parse(await response.json());

      return data.data
        .filter((model) => model.active !== false)
        .map((model) => ({
          id: model.id,
          name: model.id,
          context_window: model.context_window ?? 32768,
          pricing: this.getPricing(model.id),
        }));
    } catch (error) {
      throw new Error(
        `Failed to list Groq models: ${this.normalizeError(error)}`,
      );
    }
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.config.apiKey) {
      throw new Error("Groq API key required");
    }

    // STRICT: Validate tool_choice format when tools are provided
    if (request.tools?.length && request.tool_choice) {
      if (typeof request.tool_choice === "string") {
        if (!["auto", "none", "required"].includes(request.tool_choice)) {
          throw new Error(
            `[Groq] Invalid tool_choice: "${request.tool_choice}". ` +
              `Must be "auto", "none", "required", or {type: "function", function: {name: "..."}}`,
          );
        }
      }
    }

    const requestBody = {
      model: request.model,
      messages: request.messages,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens,
      top_p: request.top_p,
      stop: request.stop,
      response_format: request.response_format,
      tools: request.tools,
      tool_choice: request.tool_choice,
    };

    try {
      const response = await this.fetchWithRetry(
        `${this.baseUrl}/chat/completions`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.config.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        },
      );

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Groq completion failed: ${error}`);
      }

      const data = GroqCompletionResponseSchema.parse(await response.json());
      const usage = data.usage ?? {};
      const primaryChoice = data.choices[0];

      // Phase 1-A4: Handle function calling responses
      const toolCalls = primaryChoice.message.tool_calls?.map((tc) => ({
        id: tc.id,
        type: tc.type as "function",
        function: {
          name: tc.function.name,
          arguments: tc.function.arguments,
        },
      }));

      // STRICT: When tool_choice requires function calling, enforce it
      const requiresToolCall =
        request.tool_choice === "required" ||
        (typeof request.tool_choice === "object" &&
          request.tool_choice?.type === "function");

      if (requiresToolCall && !toolCalls?.length) {
        // Log full request/response for debugging
        console.error(
          "[Groq] Tool call required but model returned text instead.",
        );
        console.error(
          "[Groq] Request body:",
          JSON.stringify(requestBody, null, 2),
        );
        console.error("[Groq] Response data:", JSON.stringify(data, null, 2));
        throw new Error(
          `[Groq] Tool choice is required, but model did not call a tool.\n` +
            `Model: ${request.model}\n` +
            `Content returned: ${primaryChoice.message.content?.substring(0, 300) ?? "(empty)"}...\n` +
            `Action: Verify model supports function calling or adjust prompt.`,
        );
      }

      // When tool_calls are present, content may be null/undefined - this is expected
      // When no tool_calls, content MUST be present
      const content = primaryChoice.message.content;
      if (!toolCalls?.length && content === undefined) {
        throw new Error("Groq response missing both content and tool_calls");
      }

      return {
        id: data.id,
        model: data.model,
        content: content ?? "", // Safe: validated above that content exists when no tool_calls
        usage: {
          prompt_tokens: usage.prompt_tokens ?? 0,
          completion_tokens: usage.completion_tokens ?? 0,
          total_tokens: usage.total_tokens ?? 0,
        },
        finish_reason: this.normalizeFinishReason(primaryChoice.finish_reason),
        tool_calls: toolCalls, // Phase 1-A4: Include tool calls if present
      };
    } catch (error) {
      throw new Error(`Groq completion error: ${this.normalizeError(error)}`);
    }
  }

  async health(): Promise<HealthStatus> {
    if (!this.config.apiKey) {
      return {
        healthy: false,
        error: "API key not configured",
      };
    }

    const start = Date.now();

    try {
      const response = await this.fetchWithRetry(`${this.baseUrl}/models`, {
        headers: {
          Authorization: `Bearer ${this.config.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      return {
        healthy: response.ok,
        latency_ms: Date.now() - start,
        error: response.ok ? undefined : `HTTP ${response.status}`,
      };
    } catch (error) {
      return {
        healthy: false,
        latency_ms: Date.now() - start,
        error: this.normalizeError(error),
      };
    }
  }

  private getPricing(
    modelId: string,
  ): { prompt: number; completion: number } | undefined {
    const pricing: Record<string, { prompt: number; completion: number }> = {
      "llama-3.3-70b-versatile": { prompt: 0.59, completion: 0.79 },
      "llama-3.1-70b-versatile": { prompt: 0.59, completion: 0.79 },
      "llama-3.1-8b-instant": { prompt: 0.05, completion: 0.08 },
      "mixtral-8x7b-32768": { prompt: 0.24, completion: 0.24 },
      "gemma2-9b-it": { prompt: 0.2, completion: 0.2 },
      "llama-3-groq-70b-tool-use": { prompt: 0.89, completion: 0.89 }, // Phase 1-A4: Tool use model
    };

    return pricing[modelId];
  }
}
