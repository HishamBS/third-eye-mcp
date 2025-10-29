import { z } from 'zod';
import { BaseEye } from '../schemas/base';
export declare const KyuubiMetadata: z.ZodObject<{
    originalLength: z.ZodNumber;
    optimizedLength: z.ZodNumber;
    clarityScore: z.ZodNumber;
    improvements: z.ZodArray<z.ZodObject<{
        category: z.ZodEnum<["clarity", "specificity", "structure", "conciseness", "context"]>;
        before: z.ZodString;
        after: z.ZodString;
        reason: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        category: "clarity" | "specificity" | "structure" | "conciseness" | "context";
        before: string;
        after: string;
        reason: string;
    }, {
        category: "clarity" | "specificity" | "structure" | "conciseness" | "context";
        before: string;
        after: string;
        reason: string;
    }>, "many">;
    rewrittenPrompt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    originalLength: number;
    optimizedLength: number;
    clarityScore: number;
    improvements: {
        category: "clarity" | "specificity" | "structure" | "conciseness" | "context";
        before: string;
        after: string;
        reason: string;
    }[];
    rewrittenPrompt?: string | undefined;
}, {
    originalLength: number;
    optimizedLength: number;
    clarityScore: number;
    improvements: {
        category: "clarity" | "specificity" | "structure" | "conciseness" | "context";
        before: string;
        after: string;
        reason: string;
    }[];
    rewrittenPrompt?: string | undefined;
}>;
export declare const KyuubiEnvelopeSchema: z.ZodObject<{
    ok: z.ZodBoolean;
    code: z.ZodEnum<["OK", "OK_WITH_NOTES", "OK_NO_CLARIFICATION_NEEDED", "OK_INTENT_CONFIRMED", "OK_PROMPT_READY", "OK_SCHEMA_EMITTED", "OK_PLAN_APPROVED", "OK_SCAFFOLD_APPROVED", "OK_IMPL_APPROVED", "OK_TESTS_APPROVED", "OK_DOCS_APPROVED", "OK_CODE_APPROVED", "OK_TEXT_VALIDATED", "OK_CONSISTENT", "OK_ALL_APPROVED", "REJECT_AMBIGUOUS", "REJECT_UNSAFE", "REJECT_INCOMPLETE", "REJECT_INCONSISTENT", "REJECT_NO_EVIDENCE", "REJECT_BAD_PLAN", "REJECT_CODE_ISSUES", "E_NEEDS_CLARIFICATION", "E_INTENT_UNCONFIRMED", "E_PLAN_INCOMPLETE", "E_REASONING_MISSING", "E_SCAFFOLD_ISSUES", "E_IMPL_ISSUES", "E_TESTS_INSUFFICIENT", "E_DOCS_MISSING", "E_CITATIONS_MISSING", "E_CONTRADICTION_DETECTED", "E_PHASES_INCOMPLETE", "NEED_CLARIFICATION", "NEED_MORE_CONTEXT", "SUGGEST_ALTERNATIVE", "EYE_ERROR", "EYE_TIMEOUT", "INVALID_ENVELOPE"]>;
    md: z.ZodString;
    next: z.ZodUnion<[z.ZodString, z.ZodArray<z.ZodString, "many">]>;
    next_action: z.ZodOptional<z.ZodString>;
    ui: z.ZodOptional<z.ZodObject<{
        title: z.ZodString;
        summary: z.ZodString;
        details: z.ZodString;
        icon: z.ZodString;
        color: z.ZodEnum<["success", "warning", "error", "info"]>;
    }, "strip", z.ZodTypeAny, {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    }, {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    }>>;
} & {
    tag: z.ZodLiteral<"kyuubi">;
    data: z.ZodObject<{
        structuredBrief: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        briefAlignment: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        qualityScore: z.ZodOptional<z.ZodNumber>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        structuredBrief: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        briefAlignment: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        qualityScore: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        structuredBrief: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        briefAlignment: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        qualityScore: z.ZodOptional<z.ZodNumber>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    tag: "kyuubi";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        structuredBrief?: Record<string, unknown> | undefined;
        briefAlignment?: Record<string, unknown> | undefined;
        qualityScore?: number | undefined;
    } & {
        [k: string]: unknown;
    };
    next: string | string[];
    next_action?: string | undefined;
    ui?: {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    } | undefined;
}, {
    tag: "kyuubi";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        structuredBrief?: Record<string, unknown> | undefined;
        briefAlignment?: Record<string, unknown> | undefined;
        qualityScore?: number | undefined;
    } & {
        [k: string]: unknown;
    };
    next: string | string[];
    next_action?: string | undefined;
    ui?: {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    } | undefined;
}>;
export type KyuubiEnvelope = z.infer<typeof KyuubiEnvelopeSchema>;
/**
 * Kyuubi Eye - Prompt Optimization
 * Rewrites prompts for clarity, specificity, and effectiveness
 */
/**
 * KyuubiEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export declare class KyuubiEye implements BaseEye {
    readonly name = "kyuubi";
    validate(envelope: unknown): envelope is KyuubiEnvelope;
}
export declare const kyuubi: KyuubiEye;
//# sourceMappingURL=kyuubi.d.ts.map