import { z } from 'zod';
import { BaseEye } from '../schemas/base';
export declare const RinneganMetadata: z.ZodObject<{
    planQualityScore: z.ZodNumber;
    hasSteps: z.ZodBoolean;
    stepCount: z.ZodNumber;
    hasSuccessCriteria: z.ZodBoolean;
    hasRollback: z.ZodBoolean;
    hasDependencies: z.ZodBoolean;
    hasTimeEstimates: z.ZodBoolean;
    criticalGaps: z.ZodArray<z.ZodString, "many">;
    riskFactors: z.ZodArray<z.ZodObject<{
        risk: z.ZodString;
        severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
        mitigation: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        severity: "critical" | "low" | "medium" | "high";
        risk: string;
        mitigation: string;
    }, {
        severity: "critical" | "low" | "medium" | "high";
        risk: string;
        mitigation: string;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    planQualityScore: number;
    hasSteps: boolean;
    stepCount: number;
    hasSuccessCriteria: boolean;
    hasRollback: boolean;
    hasDependencies: boolean;
    hasTimeEstimates: boolean;
    criticalGaps: string[];
    riskFactors: {
        severity: "critical" | "low" | "medium" | "high";
        risk: string;
        mitigation: string;
    }[];
}, {
    planQualityScore: number;
    hasSteps: boolean;
    stepCount: number;
    hasSuccessCriteria: boolean;
    hasRollback: boolean;
    hasDependencies: boolean;
    hasTimeEstimates: boolean;
    criticalGaps: string[];
    riskFactors: {
        severity: "critical" | "low" | "medium" | "high";
        risk: string;
        mitigation: string;
    }[];
}>;
export declare const RinneganEnvelopeSchema: z.ZodObject<{
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
    tag: z.ZodLiteral<"rinnegan">;
    data: z.ZodObject<{
        planQualityScore: z.ZodOptional<z.ZodNumber>;
        hasSteps: z.ZodOptional<z.ZodBoolean>;
        stepCount: z.ZodOptional<z.ZodNumber>;
        hasSuccessCriteria: z.ZodOptional<z.ZodBoolean>;
        hasRollback: z.ZodOptional<z.ZodBoolean>;
        hasDependencies: z.ZodOptional<z.ZodBoolean>;
        hasTimeEstimates: z.ZodOptional<z.ZodBoolean>;
        criticalGaps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        riskFactors: z.ZodOptional<z.ZodArray<z.ZodObject<{
            risk: z.ZodString;
            severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
            mitigation: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            severity: "critical" | "low" | "medium" | "high";
            risk: string;
            mitigation: string;
        }, {
            severity: "critical" | "low" | "medium" | "high";
            risk: string;
            mitigation: string;
        }>, "many">>;
    }, "passthrough", z.ZodTypeAny, z.objectOutputType<{
        planQualityScore: z.ZodOptional<z.ZodNumber>;
        hasSteps: z.ZodOptional<z.ZodBoolean>;
        stepCount: z.ZodOptional<z.ZodNumber>;
        hasSuccessCriteria: z.ZodOptional<z.ZodBoolean>;
        hasRollback: z.ZodOptional<z.ZodBoolean>;
        hasDependencies: z.ZodOptional<z.ZodBoolean>;
        hasTimeEstimates: z.ZodOptional<z.ZodBoolean>;
        criticalGaps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        riskFactors: z.ZodOptional<z.ZodArray<z.ZodObject<{
            risk: z.ZodString;
            severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
            mitigation: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            severity: "critical" | "low" | "medium" | "high";
            risk: string;
            mitigation: string;
        }, {
            severity: "critical" | "low" | "medium" | "high";
            risk: string;
            mitigation: string;
        }>, "many">>;
    }, z.ZodTypeAny, "passthrough">, z.objectInputType<{
        planQualityScore: z.ZodOptional<z.ZodNumber>;
        hasSteps: z.ZodOptional<z.ZodBoolean>;
        stepCount: z.ZodOptional<z.ZodNumber>;
        hasSuccessCriteria: z.ZodOptional<z.ZodBoolean>;
        hasRollback: z.ZodOptional<z.ZodBoolean>;
        hasDependencies: z.ZodOptional<z.ZodBoolean>;
        hasTimeEstimates: z.ZodOptional<z.ZodBoolean>;
        criticalGaps: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        riskFactors: z.ZodOptional<z.ZodArray<z.ZodObject<{
            risk: z.ZodString;
            severity: z.ZodEnum<["low", "medium", "high", "critical"]>;
            mitigation: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            severity: "critical" | "low" | "medium" | "high";
            risk: string;
            mitigation: string;
        }, {
            severity: "critical" | "low" | "medium" | "high";
            risk: string;
            mitigation: string;
        }>, "many">>;
    }, z.ZodTypeAny, "passthrough">>;
}, "strip", z.ZodTypeAny, {
    tag: "rinnegan";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        planQualityScore?: number | undefined;
        hasSteps?: boolean | undefined;
        stepCount?: number | undefined;
        hasSuccessCriteria?: boolean | undefined;
        hasRollback?: boolean | undefined;
        hasDependencies?: boolean | undefined;
        hasTimeEstimates?: boolean | undefined;
        criticalGaps?: string[] | undefined;
        riskFactors?: {
            severity: "critical" | "low" | "medium" | "high";
            risk: string;
            mitigation: string;
        }[] | undefined;
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
    tag: "rinnegan";
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: {
        planQualityScore?: number | undefined;
        hasSteps?: boolean | undefined;
        stepCount?: number | undefined;
        hasSuccessCriteria?: boolean | undefined;
        hasRollback?: boolean | undefined;
        hasDependencies?: boolean | undefined;
        hasTimeEstimates?: boolean | undefined;
        criticalGaps?: string[] | undefined;
        riskFactors?: {
            severity: "critical" | "low" | "medium" | "high";
            risk: string;
            mitigation: string;
        }[] | undefined;
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
export type RinneganEnvelope = z.infer<typeof RinneganEnvelopeSchema>;
/**
 * Rinnegan Eye - Plan Reviewer
 * Validates implementation plans for completeness, feasibility, and risk management
 */
/**
 * RinneganEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export declare class RinneganEye implements BaseEye {
    readonly name = "rinnegan";
    validate(envelope: unknown): envelope is RinneganEnvelope;
}
export declare const rinnegan: RinneganEye;
//# sourceMappingURL=rinnegan.d.ts.map