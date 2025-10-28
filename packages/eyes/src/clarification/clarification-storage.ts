/**
 * Clarification Storage & Resolution
 * 
 * Manages clarification questions, answers, and resolved facts for sessions.
 */

import type { Clarification, NewClarification, IntentConfirmation, NewIntentConfirmation } from '@third-eye/db';
import { clarifications, intentConfirmations } from '@third-eye/db';
import { getDb } from '@third-eye/db';
import { eq, and } from 'drizzle-orm';

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
export async function addClarificationRequest(
  sessionId: string,
  requests: ClarificationRequest[],
): Promise<void> {
  const { db } = getDb();
  const now = new Date();

  const newClarifications: NewClarification[] = requests.map(req => ({
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
export async function resolveClarification(
  sessionId: string,
  answer: ClarificationAnswer,
): Promise<void> {
  const { db } = getDb();
  const now = new Date();

  await db
    .update(clarifications)
    .set({
      answer: answer.answer,
      status: 'answered',
      answeredAt: now,
    })
    .where(
      and(
        eq(clarifications.sessionId, sessionId),
        eq(clarifications.field, answer.field),
      ),
    );
}

/**
 * Get all pending clarifications for a session
 */
export async function getPendingClarifications(sessionId: string): Promise<Clarification[]> {
  const { db } = getDb();

  const results = await db
    .select()
    .from(clarifications)
    .where(
      and(
        eq(clarifications.sessionId, sessionId),
        eq(clarifications.status, 'pending'),
      ),
    );

  return results;
}

/**
 * Get resolved facts for a session (to append to guidance input)
 */
export async function getResolvedFacts(sessionId: string): Promise<Record<string, string>> {
  const { db } = getDb();

  const results = await db
    .select()
    .from(clarifications)
    .where(
      and(
        eq(clarifications.sessionId, sessionId),
        eq(clarifications.status, 'answered'),
      ),
    );

  const facts: Record<string, string> = {};
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
export async function storeIntentConfirmation(
  sessionId: string,
  intentAnalysis: unknown,
  confirmationPrompt: string,
): Promise<string> {
  const { db } = getDb();
  const now = new Date();
  const id = `intent_${sessionId}`;

  const newConfirmation: NewIntentConfirmation = {
    id,
    sessionId,
    intentAnalysis: intentAnalysis as any,
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
export async function recordIntentConfirmationResponse(
  confirmationId: string,
  response: 'approved' | 'rejected' | 'modified',
  userIdentity?: string,
): Promise<void> {
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
export async function getIntentConfirmationStatus(sessionId: string): Promise<IntentConfirmation | null> {
  const { db } = getDb();

  const results = await db
    .select()
    .from(intentConfirmations)
    .where(eq(intentConfirmations.sessionId, sessionId))
    .limit(1);

  return results[0] || null;
}

