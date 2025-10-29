import { z } from 'zod';
import { BaseEye } from '../schemas/base';
export declare const Inconsistency: z.ZodObject<{
    type: z.ZodEnum<["logical", "temporal", "factual", "scope", "assumption"]>;
    severity: z.ZodEnum<["minor", "moderate", "major", "critical"]>;
    description: z.ZodString;
    conflictingStatements: z.ZodArray<z.ZodString, "many">;
    suggestion: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "logical" | "temporal" | "factual" | "scope" | "assumption";
    severity: "minor" | "moderate" | "major" | "critical";
    description: string;
    conflictingStatements: string[];
    suggestion: string;
}, {
    type: "logical" | "temporal" | "factual" | "scope" | "assumption";
    severity: "minor" | "moderate" | "major" | "critical";
    description: string;
    conflictingStatements: string[];
    suggestion: string;
}>;
export declare const ByakuganMetadata: z.ZodObject<{
    consistencyScore: z.ZodNumber;
    inconsistenciesFound: z.ZodNumber;
    inconsistenciesByType: z.ZodRecord<z.ZodString, z.ZodNumber>;
    inconsistenciesBySeverity: z.ZodRecord<z.ZodString, z.ZodNumber>;
    inconsistencies: z.ZodArray<z.ZodObject<{
        type: z.ZodEnum<["logical", "temporal", "factual", "scope", "assumption"]>;
        severity: z.ZodEnum<["minor", "moderate", "major", "critical"]>;
        description: z.ZodString;
        conflictingStatements: z.ZodArray<z.ZodString, "many">;
        suggestion: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        type: "logical" | "temporal" | "factual" | "scope" | "assumption";
        severity: "minor" | "moderate" | "major" | "critical";
        description: string;
        conflictingStatements: string[];
        suggestion: string;
    }, {
        type: "logical" | "temporal" | "factual" | "scope" | "assumption";
        severity: "minor" | "moderate" | "major" | "critical";
        description: string;
        conflictingStatements: string[];
        suggestion: string;
    }>, "many">;
    assumptions: z.ZodArray<z.ZodString, "many">;
    logicalFlaws: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    consistencyScore: number;
    inconsistenciesFound: number;
    inconsistenciesByType: Record<string, number>;
    inconsistenciesBySeverity: Record<string, number>;
    inconsistencies: {
        type: "logical" | "temporal" | "factual" | "scope" | "assumption";
        severity: "minor" | "moderate" | "major" | "critical";
        description: string;
        conflictingStatements: string[];
        suggestion: string;
    }[];
    assumptions: string[];
    logicalFlaws: string[];
}, {
    consistencyScore: number;
    inconsistenciesFound: number;
    inconsistenciesByType: Record<string, number>;
    inconsistenciesBySeverity: Record<string, number>;
    inconsistencies: {
        type: "logical" | "temporal" | "factual" | "scope" | "assumption";
        severity: "minor" | "moderate" | "major" | "critical";
        description: string;
        conflictingStatements: string[];
        suggestion: string;
    }[];
    assumptions: string[];
    logicalFlaws: string[];
}>;
export declare const ByakuganEnvelopeSchema: z.ZodObject<{
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
    tag: z.ZodLiteral<"byakugan">;
    data: z.ZodObject<{
        finalReview: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        overallScore: z.ZodOptional<z.ZodNumber>;
        criticalIssues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        minorIssues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        finalReview: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        overallScore: z.ZodOptional<z.ZodNumber>;
        criticalIssues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        minorIssues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        finalReview: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
        overallScore: z.ZodOptional<z.ZodNumber>;
        criticalIssues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        minorIssues: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    tag: "byakugan";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        finalReview?: Record<string, unknown> | undefined;
        overallScore?: number | undefined;
        criticalIssues?: string[] | undefined;
        minorIssues?: string[] | undefined;
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
    tag: "byakugan";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        finalReview?: Record<string, unknown> | undefined;
        overallScore?: number | undefined;
        criticalIssues?: string[] | undefined;
        minorIssues?: string[] | undefined;
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
export type ByakuganEnvelope = z.infer<typeof ByakuganEnvelopeSchema>;
/**
 * Byakugan Eye - Consistency Checker
 * Detects logical inconsistencies, contradictions, and flawed assumptions
 */
/**
 * ByakuganEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export declare class ByakuganEye implements BaseEye {
    readonly name = "byakugan";
    validate(envelope: unknown): envelope is ByakuganEnvelope;
}
export declare const byakugan: ByakuganEye;
//# sourceMappingURL=byakugan.d.ts.map