import { BaseEnvelopeSchema, BaseEye, BaseEnvelope } from "./schemas/base";

/**
 * DynamicEye - Single class for ALL eyes
 * No eye-specific validation, fully data-driven
 *
 * This replaces 8 individual eye schema files (sharingan.ts, byakugan.ts, etc.)
 * All eyes now use the same base schema, with eye-specific logic stored in the database
 */
export class DynamicEye implements BaseEye {
  constructor(public readonly name: string) {}

  validate(envelope: unknown): envelope is BaseEnvelope {
    return BaseEnvelopeSchema.safeParse(envelope).success;
  }
}

/**
 * Factory function to create eye instances from database
 * Used by orchestrator and other components
 */
export function createEye(name: string): DynamicEye {
  return new DynamicEye(name);
}
