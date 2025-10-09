// Re-export everything from src/index.ts (which has the registry and getEye function)
export * from "./src/index";

// Re-export base types and utilities
export type { BaseEnvelope, BaseEnvelope as EyeResponse } from "./src/schemas/base";
export { isApproved, isRejected, needsInput } from "./src/schemas/base";

// Re-export MarkdownBuilder utility
export {
  MarkdownBuilder,
  type MarkdownHeading,
  type MarkdownListSymbol,
  type MarkdownAlignment,
  type MarkdownTableOptions,
} from "./utils/markdown-builder";
