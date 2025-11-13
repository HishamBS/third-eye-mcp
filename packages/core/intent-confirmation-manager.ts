/**
 * Intent Confirmation Manager - Phase 2-B
 *
 * Handles Jōgan intent confirmation flow including:
 * - Creating confirmation requests
 * - Pausing pipeline for human confirmation
 * - Recording confirmation responses
 * - Tracking confirmation source (human vs agent)
 *
 * Per R07: Strict typing, no 'any'
 * Per R13: Interfaces exported for SSOT
 */

import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";

/**
 * Intent confirmation request
 */
export interface IntentConfirmation {
  readonly id: string;
  readonly sessionId: string;
  readonly intentAnalysis: Record<string, unknown>;
  readonly confirmationPrompt: string;
  readonly response?: string;
  readonly userIdentity?: string;
  readonly status: "pending" | "confirmed" | "rejected" | "expired";
  readonly createdAt: number;
  readonly respondedAt?: number;
}

/**
 * Confirmation response from human or agent
 */
export interface ConfirmationResponse {
  readonly confirmed: boolean;
  readonly response: string;
  readonly source: "human" | "agent";
  readonly userIdentity?: string;
}

/**
 * Intent Confirmation Manager
 */
export class IntentConfirmationManager {
  constructor(private readonly db: Database) {}

  /**
   * Create intent confirmation request
   * Pauses pipeline until human confirms
   */
  async createConfirmation(params: {
    sessionId: string;
    intentAnalysis: Record<string, unknown>;
    confirmationPrompt: string;
  }): Promise<IntentConfirmation> {
    const id = randomUUID();
    const createdAt = Date.now();

    const confirmation: IntentConfirmation = {
      id,
      sessionId: params.sessionId,
      intentAnalysis: params.intentAnalysis,
      confirmationPrompt: params.confirmationPrompt,
      status: "pending",
      createdAt,
    };

    this.db
      .prepare(
        `INSERT INTO intent_confirmations (id, session_id, intent_analysis, confirmation_prompt, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(
        confirmation.id,
        confirmation.sessionId,
        JSON.stringify(confirmation.intentAnalysis),
        confirmation.confirmationPrompt,
        confirmation.status,
        confirmation.createdAt,
      );

    return confirmation;
  }

  /**
   * Submit confirmation response
   */
  async submitConfirmation(
    confirmationId: string,
    response: ConfirmationResponse,
  ): Promise<IntentConfirmation> {
    const respondedAt = Date.now();
    const status = response.confirmed ? "confirmed" : "rejected";

    this.db
      .prepare(
        `UPDATE intent_confirmations
         SET response = ?, user_identity = ?, status = ?, responded_at = ?
         WHERE id = ?`,
      )
      .run(
        response.response,
        response.userIdentity ?? response.source,
        status,
        respondedAt,
        confirmationId,
      );

    return this.getConfirmation(confirmationId)!;
  }

  /**
   * Get confirmation by ID
   */
  getConfirmation(confirmationId: string): IntentConfirmation | null {
    const row = this.db
      .prepare(
        `SELECT id, session_id, intent_analysis, confirmation_prompt, response, user_identity, status, created_at, responded_at
         FROM intent_confirmations
         WHERE id = ?`,
      )
      .get(confirmationId) as
      | {
          id: string;
          session_id: string;
          intent_analysis: string | null;
          confirmation_prompt: string;
          response: string | null;
          user_identity: string | null;
          status: string;
          created_at: number;
          responded_at: number | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      sessionId: row.session_id,
      intentAnalysis: row.intent_analysis
        ? (JSON.parse(row.intent_analysis) as Record<string, unknown>)
        : {},
      confirmationPrompt: row.confirmation_prompt,
      response: row.response ?? undefined,
      userIdentity: row.user_identity ?? undefined,
      status: row.status as "pending" | "confirmed" | "rejected" | "expired",
      createdAt: row.created_at,
      respondedAt: row.responded_at ?? undefined,
    };
  }

  /**
   * Get pending confirmations for session
   */
  getPendingConfirmations(sessionId: string): readonly IntentConfirmation[] {
    const rows = this.db
      .prepare(
        `SELECT id, session_id, intent_analysis, confirmation_prompt, response, user_identity, status, created_at, responded_at
         FROM intent_confirmations
         WHERE session_id = ? AND status = 'pending'
         ORDER BY created_at DESC`,
      )
      .all(sessionId) as Array<{
      id: string;
      session_id: string;
      intent_analysis: string | null;
      confirmation_prompt: string;
      response: string | null;
      user_identity: string | null;
      status: string;
      created_at: number;
      responded_at: number | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      intentAnalysis: row.intent_analysis
        ? (JSON.parse(row.intent_analysis) as Record<string, unknown>)
        : {},
      confirmationPrompt: row.confirmation_prompt,
      response: row.response ?? undefined,
      userIdentity: row.user_identity ?? undefined,
      status: row.status as "pending" | "confirmed" | "rejected" | "expired",
      createdAt: row.created_at,
      respondedAt: row.responded_at ?? undefined,
    }));
  }

  /**
   * Get all confirmations for session
   */
  getSessionConfirmations(sessionId: string): readonly IntentConfirmation[] {
    const rows = this.db
      .prepare(
        `SELECT id, session_id, intent_analysis, confirmation_prompt, response, user_identity, status, created_at, responded_at
         FROM intent_confirmations
         WHERE session_id = ?
         ORDER BY created_at DESC`,
      )
      .all(sessionId) as Array<{
      id: string;
      session_id: string;
      intent_analysis: string | null;
      confirmation_prompt: string;
      response: string | null;
      user_identity: string | null;
      status: string;
      created_at: number;
      responded_at: number | null;
    }>;

    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      intentAnalysis: row.intent_analysis
        ? (JSON.parse(row.intent_analysis) as Record<string, unknown>)
        : {},
      confirmationPrompt: row.confirmation_prompt,
      response: row.response ?? undefined,
      userIdentity: row.user_identity ?? undefined,
      status: row.status as "pending" | "confirmed" | "rejected" | "expired",
      createdAt: row.created_at,
      respondedAt: row.responded_at ?? undefined,
    }));
  }

  /**
   * Expire old pending confirmations
   */
  expireOldConfirmations(maxAgeMs: number = 3600000): number {
    const cutoff = Date.now() - maxAgeMs;
    const result = this.db
      .prepare(
        `UPDATE intent_confirmations
         SET status = 'expired'
         WHERE status = 'pending' AND created_at < ?`,
      )
      .run(cutoff);

    return result.changes;
  }
}
