/**
 * Clarification Storage & Resolution
 *
 * Manages clarification questions, answers, and resolved facts for sessions.
 */
import { clarifications, intentConfirmations } from '@third-eye/db/schema';
import { getDb } from '@third-eye/db';
import { eq, and } from 'drizzle-orm';
/**
 * Add clarification request for a session
 */
export async function addClarificationRequest(sessionId, requests) {
    const { db } = getDb();
    const now = new Date();
    const newClarifications = requests.map(req => ({
        id: `clar_${sessionId}_${req.field}`,
        sessionId,
        field: req.field,
        question: req.question,
        answer: null,
        status: 'pending',
        createdAt: now,
        answeredAt: null,
    }));
    await db.insert(clarifications).values(newClarifications);
}
/**
 * Resolve clarification with answer
 */
export async function resolveClarification(sessionId, answer) {
    const { db } = getDb();
    const now = new Date();
    await db
        .update(clarifications)
        .set({
        answer: answer.answer,
        status: 'answered',
        answeredAt: now,
    })
        .where(and(eq(clarifications.sessionId, sessionId), eq(clarifications.field, answer.field)));
}
/**
 * Get all pending clarifications for a session
 */
export async function getPendingClarifications(sessionId) {
    const { db } = getDb();
    const results = await db
        .select()
        .from(clarifications)
        .where(and(eq(clarifications.sessionId, sessionId), eq(clarifications.status, 'pending')));
    return results;
}
/**
 * Get resolved facts for a session (to append to guidance input)
 */
export async function getResolvedFacts(sessionId) {
    const { db } = getDb();
    const results = await db
        .select()
        .from(clarifications)
        .where(and(eq(clarifications.sessionId, sessionId), eq(clarifications.status, 'answered')));
    const facts = {};
    for (const clarification of results) {
        if (clarification.answer) {
            facts[clarification.field] = clarification.answer;
        }
    }
    return facts;
}
/**
 * Store intent confirmation
 */
export async function storeIntentConfirmation(sessionId, intentAnalysis, confirmationPrompt) {
    const { db } = getDb();
    const now = new Date();
    const id = `intent_${sessionId}`;
    const newConfirmation = {
        id,
        sessionId,
        intentAnalysis,
        confirmationPrompt,
        response: null,
        userIdentity: null,
        createdAt: now,
        respondedAt: null,
    };
    await db.insert(intentConfirmations).values(newConfirmation);
    return id;
}
/**
 * Record intent confirmation response
 */
export async function recordIntentConfirmationResponse(confirmationId, response, userIdentity) {
    const { db } = getDb();
    const now = new Date();
    await db
        .update(intentConfirmations)
        .set({
        response,
        userIdentity,
        respondedAt: now,
        status: 'answered',
    })
        .where(eq(intentConfirmations.id, confirmationId));
}
/**
 * Get intent confirmation status
 */
export async function getIntentConfirmationStatus(sessionId) {
    const { db } = getDb();
    const results = await db
        .select()
        .from(intentConfirmations)
        .where(eq(intentConfirmations.sessionId, sessionId))
        .limit(1);
    return results[0] || null;
}
//# sourceMappingURL=clarification-storage.js.map