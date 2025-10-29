import { z } from 'zod';
import { BaseEye } from '../schemas/base';
export declare const CodeGate: z.ZodEnum<["implementation", "tests", "documentation", "security"]>;
export declare const GateResult: z.ZodObject<{
    gate: z.ZodEnum<["implementation", "tests", "documentation", "security"]>;
    passed: z.ZodBoolean;
    score: z.ZodNumber;
    issues: z.ZodArray<z.ZodObject<{
        severity: z.ZodEnum<["info", "warning", "error", "critical"]>;
        message: z.ZodString;
        line: z.ZodOptional<z.ZodNumber>;
        suggestion: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        message: string;
        severity: "warning" | "error" | "info" | "critical";
        suggestion?: string | undefined;
        line?: number | undefined;
    }, {
        message: string;
        severity: "warning" | "error" | "info" | "critical";
        suggestion?: string | undefined;
        line?: number | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    issues: {
        message: string;
        severity: "warning" | "error" | "info" | "critical";
        suggestion?: string | undefined;
        line?: number | undefined;
    }[];
    gate: "implementation" | "tests" | "documentation" | "security";
    passed: boolean;
    score: number;
}, {
    issues: {
        message: string;
        severity: "warning" | "error" | "info" | "critical";
        suggestion?: string | undefined;
        line?: number | undefined;
    }[];
    gate: "implementation" | "tests" | "documentation" | "security";
    passed: boolean;
    score: number;
}>;
export declare const MangekyoMetadata: z.ZodObject<{
    overallScore: z.ZodNumber;
    gates: z.ZodArray<z.ZodObject<{
        gate: z.ZodEnum<["implementation", "tests", "documentation", "security"]>;
        passed: z.ZodBoolean;
        score: z.ZodNumber;
        issues: z.ZodArray<z.ZodObject<{
            severity: z.ZodEnum<["info", "warning", "error", "critical"]>;
            message: z.ZodString;
            line: z.ZodOptional<z.ZodNumber>;
            suggestion: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            message: string;
            severity: "warning" | "error" | "info" | "critical";
            suggestion?: string | undefined;
            line?: number | undefined;
        }, {
            message: string;
            severity: "warning" | "error" | "info" | "critical";
            suggestion?: string | undefined;
            line?: number | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        issues: {
            message: string;
            severity: "warning" | "error" | "info" | "critical";
            suggestion?: string | undefined;
            line?: number | undefined;
        }[];
        gate: "implementation" | "tests" | "documentation" | "security";
        passed: boolean;
        score: number;
    }, {
        issues: {
            message: string;
            severity: "warning" | "error" | "info" | "critical";
            suggestion?: string | undefined;
            line?: number | undefined;
        }[];
        gate: "implementation" | "tests" | "documentation" | "security";
        passed: boolean;
        score: number;
    }>, "many">;
    passedGates: z.ZodNumber;
    totalGates: z.ZodLiteral<4>;
    codeLanguage: z.ZodOptional<z.ZodString>;
    linesAnalyzed: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    overallScore: number;
    gates: {
        issues: {
            message: string;
            severity: "warning" | "error" | "info" | "critical";
            suggestion?: string | undefined;
            line?: number | undefined;
        }[];
        gate: "implementation" | "tests" | "documentation" | "security";
        passed: boolean;
        score: number;
    }[];
    passedGates: number;
    totalGates: 4;
    linesAnalyzed: number;
    codeLanguage?: string | undefined;
}, {
    overallScore: number;
    gates: {
        issues: {
            message: string;
            severity: "warning" | "error" | "info" | "critical";
            suggestion?: string | undefined;
            line?: number | undefined;
        }[];
        gate: "implementation" | "tests" | "documentation" | "security";
        passed: boolean;
        score: number;
    }[];
    passedGates: number;
    totalGates: 4;
    linesAnalyzed: number;
    codeLanguage?: string | undefined;
}>;
export declare const MangekyoEnvelopeSchema: z.ZodObject<{
    tag: z.ZodString;
    ok: z.ZodBoolean;
    code: z.ZodEnum<["OK", "OK_WITH_NOTES", "OK_NO_CLARIFICATION_NEEDED", "OK_INTENT_CONFIRMED", "OK_PROMPT_READY", "OK_SCHEMA_EMITTED", "OK_PLAN_APPROVED", "OK_SCAFFOLD_APPROVED", "OK_IMPL_APPROVED", "OK_TESTS_APPROVED", "OK_DOCS_APPROVED", "OK_CODE_APPROVED", "OK_TEXT_VALIDATED", "OK_CONSISTENT", "OK_ALL_APPROVED", "REJECT_AMBIGUOUS", "REJECT_UNSAFE", "REJECT_INCOMPLETE", "REJECT_INCONSISTENT", "REJECT_NO_EVIDENCE", "REJECT_BAD_PLAN", "REJECT_CODE_ISSUES", "E_NEEDS_CLARIFICATION", "E_INTENT_UNCONFIRMED", "E_PLAN_INCOMPLETE", "E_REASONING_MISSING", "E_SCAFFOLD_ISSUES", "E_IMPL_ISSUES", "E_TESTS_INSUFFICIENT", "E_DOCS_MISSING", "E_CITATIONS_MISSING", "E_CONTRADICTION_DETECTED", "E_PHASES_INCOMPLETE", "NEED_CLARIFICATION", "NEED_MORE_CONTEXT", "SUGGEST_ALTERNATIVE", "EYE_ERROR", "EYE_TIMEOUT", "INVALID_ENVELOPE"]>;
    md: z.ZodString;
    data: z.ZodRecord<z.ZodString, z.ZodUnknown>;
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
    eye: z.ZodLiteral<"mangekyo">;
    metadata: z.ZodOptional<z.ZodObject<{
        overallScore: z.ZodNumber;
        gates: z.ZodArray<z.ZodObject<{
            gate: z.ZodEnum<["implementation", "tests", "documentation", "security"]>;
            passed: z.ZodBoolean;
            score: z.ZodNumber;
            issues: z.ZodArray<z.ZodObject<{
                severity: z.ZodEnum<["info", "warning", "error", "critical"]>;
                message: z.ZodString;
                line: z.ZodOptional<z.ZodNumber>;
                suggestion: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                message: string;
                severity: "warning" | "error" | "info" | "critical";
                suggestion?: string | undefined;
                line?: number | undefined;
            }, {
                message: string;
                severity: "warning" | "error" | "info" | "critical";
                suggestion?: string | undefined;
                line?: number | undefined;
            }>, "many">;
        }, "strip", z.ZodTypeAny, {
            issues: {
                message: string;
                severity: "warning" | "error" | "info" | "critical";
                suggestion?: string | undefined;
                line?: number | undefined;
            }[];
            gate: "implementation" | "tests" | "documentation" | "security";
            passed: boolean;
            score: number;
        }, {
            issues: {
                message: string;
                severity: "warning" | "error" | "info" | "critical";
                suggestion?: string | undefined;
                line?: number | undefined;
            }[];
            gate: "implementation" | "tests" | "documentation" | "security";
            passed: boolean;
            score: number;
        }>, "many">;
        passedGates: z.ZodNumber;
        totalGates: z.ZodLiteral<4>;
        codeLanguage: z.ZodOptional<z.ZodString>;
        linesAnalyzed: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        overallScore: number;
        gates: {
            issues: {
                message: string;
                severity: "warning" | "error" | "info" | "critical";
                suggestion?: string | undefined;
                line?: number | undefined;
            }[];
            gate: "implementation" | "tests" | "documentation" | "security";
            passed: boolean;
            score: number;
        }[];
        passedGates: number;
        totalGates: 4;
        linesAnalyzed: number;
        codeLanguage?: string | undefined;
    }, {
        overallScore: number;
        gates: {
            issues: {
                message: string;
                severity: "warning" | "error" | "info" | "critical";
                suggestion?: string | undefined;
                line?: number | undefined;
            }[];
            gate: "implementation" | "tests" | "documentation" | "security";
            passed: boolean;
            score: number;
        }[];
        passedGates: number;
        totalGates: 4;
        linesAnalyzed: number;
        codeLanguage?: string | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    tag: string;
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: Record<string, unknown>;
    next: string | string[];
    eye: "mangekyo";
    next_action?: string | undefined;
    ui?: {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    } | undefined;
    metadata?: {
        overallScore: number;
        gates: {
            issues: {
                message: string;
                severity: "warning" | "error" | "info" | "critical";
                suggestion?: string | undefined;
                line?: number | undefined;
            }[];
            gate: "implementation" | "tests" | "documentation" | "security";
            passed: boolean;
            score: number;
        }[];
        passedGates: number;
        totalGates: 4;
        linesAnalyzed: number;
        codeLanguage?: string | undefined;
    } | undefined;
}, {
    tag: string;
    ok: boolean;
    code: "OK" | "OK_WITH_NOTES" | "OK_NO_CLARIFICATION_NEEDED" | "OK_INTENT_CONFIRMED" | "OK_PROMPT_READY" | "OK_SCHEMA_EMITTED" | "OK_PLAN_APPROVED" | "OK_SCAFFOLD_APPROVED" | "OK_IMPL_APPROVED" | "OK_TESTS_APPROVED" | "OK_DOCS_APPROVED" | "OK_CODE_APPROVED" | "OK_TEXT_VALIDATED" | "OK_CONSISTENT" | "OK_ALL_APPROVED" | "REJECT_AMBIGUOUS" | "REJECT_UNSAFE" | "REJECT_INCOMPLETE" | "REJECT_INCONSISTENT" | "REJECT_NO_EVIDENCE" | "REJECT_BAD_PLAN" | "REJECT_CODE_ISSUES" | "E_NEEDS_CLARIFICATION" | "E_INTENT_UNCONFIRMED" | "E_PLAN_INCOMPLETE" | "E_REASONING_MISSING" | "E_SCAFFOLD_ISSUES" | "E_IMPL_ISSUES" | "E_TESTS_INSUFFICIENT" | "E_DOCS_MISSING" | "E_CITATIONS_MISSING" | "E_CONTRADICTION_DETECTED" | "E_PHASES_INCOMPLETE" | "NEED_CLARIFICATION" | "NEED_MORE_CONTEXT" | "SUGGEST_ALTERNATIVE" | "EYE_ERROR" | "EYE_TIMEOUT" | "INVALID_ENVELOPE";
    md: string;
    data: Record<string, unknown>;
    next: string | string[];
    eye: "mangekyo";
    next_action?: string | undefined;
    ui?: {
        title: string;
        summary: string;
        details: string;
        icon: string;
        color: "success" | "warning" | "error" | "info";
    } | undefined;
    metadata?: {
        overallScore: number;
        gates: {
            issues: {
                message: string;
                severity: "warning" | "error" | "info" | "critical";
                suggestion?: string | undefined;
                line?: number | undefined;
            }[];
            gate: "implementation" | "tests" | "documentation" | "security";
            passed: boolean;
            score: number;
        }[];
        passedGates: number;
        totalGates: 4;
        linesAnalyzed: number;
        codeLanguage?: string | undefined;
    } | undefined;
}>;
export type MangekyoEnvelope = z.infer<typeof MangekyoEnvelopeSchema>;
/**
 * Mangekyō Eye - Code Review (4 Gates)
 * Reviews code through 4 gates: Implementation, Tests, Documentation, Security
 */
/**
 * MangekyoEye
 *
 * NOTE: Persona content is stored in database (personas table).
 * This class only provides schema validation.
 */
export declare class MangekyoEye implements BaseEye {
    readonly name = "mangekyo";
    validate(envelope: unknown): envelope is MangekyoEnvelope;
}
export declare const mangekyo: MangekyoEye;
//# sourceMappingURL=mangekyo.d.ts.map