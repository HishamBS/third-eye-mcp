/**
 * Persona Guards
 *
 * Ensures envelopes meet SSOT requirements and validates behavior.
 * Integrates with orchestrator retry loop without heuristics.
 */
import type { PersonaBlueprint } from '../interfaces/persona-blueprint';
export interface GuardViolation {
    /** Field that violated requirements */
    field: string;
    /** Error message describing violation */
    message: string;
    /** Suggested reminder to send to LLM */
    reminder: string;
}
export interface GuardResult {
    /** Whether envelope passed validation */
    valid: boolean;
    /** Violations found */
    violations: GuardViolation[];
}
/**
 * Ensure eye behavior according to blueprint
 */
export declare function ensureEyeBehavior(blueprint: PersonaBlueprint, envelope: unknown): GuardResult;
/**
 * Build targeted reminder message referencing violations
 */
export declare function buildReminderMessage(violations: GuardViolation[]): string;
/**
 * Check if envelope matches valid status code for eye
 */
export declare function validateStatusCode(code: unknown, allowedCodes: readonly string[]): boolean;
//# sourceMappingURL=persona-guards.d.ts.map