/**
 * Clarification Storage & Resolution
 *
 * Manages clarification questions, answers, and resolved facts for sessions.
 */
import { type Clarification, type IntentConfirmation } from '@third-eye/db/schema';
export interface ClarificationRequest {
    field: string;
    question: string;
}
export interface ClarificationAnswer {
    field: string;
    answer: string;
}
export interface ClarificationResolution {
    status: 'answered' | 'pending';
    resolvedFacts: Record<string, string>;
}
/**
 * Add clarification request for a session
 */
export declare function addClarificationRequest(sessionId: string, requests: ClarificationRequest[]): Promise<void>;
/**
 * Resolve clarification with answer
 */
export declare function resolveClarification(sessionId: string, answer: ClarificationAnswer): Promise<void>;
/**
 * Get all pending clarifications for a session
 */
export declare function getPendingClarifications(sessionId: string): Promise<Clarification[]>;
/**
 * Get resolved facts for a session (to append to guidance input)
 */
export declare function getResolvedFacts(sessionId: string): Promise<Record<string, string>>;
/**
 * Store intent confirmation
 */
export declare function storeIntentConfirmation(sessionId: string, intentAnalysis: unknown, confirmationPrompt: string): Promise<string>;
/**
 * Record intent confirmation response
 */
export declare function recordIntentConfirmationResponse(confirmationId: string, response: 'approved' | 'rejected' | 'modified', userIdentity?: string): Promise<void>;
/**
 * Get intent confirmation status
 */
export declare function getIntentConfirmationStatus(sessionId: string): Promise<IntentConfirmation | null>;
//# sourceMappingURL=clarification-storage.d.ts.map