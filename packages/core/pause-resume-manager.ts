/**
 * Pause/Resume Manager - Phase 1-A3
 *
 * Handles pipeline pause/resume state persistence and recovery.
 * Enables human-in-the-loop interactions by storing pipeline state
 * and allowing resumption after human input.
 *
 * Per R07: Strict typing, no 'any'
 * Per R13: Interfaces exported for SSOT
 */

import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';

/**
 * Pipeline state for pause/resume
 */
export interface PipelineState {
  readonly sessionId: string;
  readonly status: 'running' | 'paused_for_human' | 'paused_for_agent' | 'completed';
  readonly currentEye: string;
  readonly pauseReason?: 'clarification' | 'confirmation' | 'validation_failed';
  readonly pendingData?: Record<string, unknown>;
  readonly resumeToken: string;
  readonly pausedAt?: number;
  readonly expiresAt?: number;
}

/**
 * Pending question for human-in-the-loop
 */
export interface PendingQuestion {
  readonly id: string;
  readonly sessionId: string;
  readonly eyeName: string;
  readonly questions: readonly string[];
  readonly context?: Record<string, unknown>;
  readonly status: 'pending' | 'answered' | 'expired';
  readonly createdAt: number;
  readonly expiresAt: number;
}

/**
 * Human response to pending questions
 */
export interface HumanResponse {
  readonly id: string;
  readonly questionId: string;
  readonly sessionId: string;
  readonly answers: Record<string, unknown>;
  readonly source: 'human' | 'agent';
  readonly validated: boolean;
  readonly createdAt: number;
}

/**
 * Pause/Resume Manager - Database persistence for pipeline states
 */
export class PauseResumeManager {
  constructor(private readonly db: Database) {}

  /**
   * Pause pipeline and persist state to database
   */
  async pausePipeline(params: {
    sessionId: string;
    currentEye: string;
    reason?: 'clarification' | 'confirmation' | 'validation_failed';
    pendingData?: Record<string, unknown>;
    expiresInMs?: number;
  }): Promise<PipelineState> {
    const resumeToken = randomUUID();
    const pausedAt = Date.now();
    const expiresAt = params.expiresInMs ? pausedAt + params.expiresInMs : undefined;

    const state: PipelineState = {
      sessionId: params.sessionId,
      status: params.reason === 'confirmation' ? 'paused_for_human' : 'paused_for_agent',
      currentEye: params.currentEye,
      pauseReason: params.reason,
      pendingData: params.pendingData,
      resumeToken,
      pausedAt,
      expiresAt,
    };

    // Persist to database
    this.db
      .prepare(
        `INSERT INTO pipeline_states (session_id, status, current_eye, pause_reason, pending_data, resume_token, paused_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(session_id) DO UPDATE SET
           status = excluded.status,
           current_eye = excluded.current_eye,
           pause_reason = excluded.pause_reason,
           pending_data = excluded.pending_data,
           resume_token = excluded.resume_token,
           paused_at = excluded.paused_at,
           expires_at = excluded.expires_at`
      )
      .run(
        state.sessionId,
        state.status,
        state.currentEye,
        state.pauseReason ?? null,
        state.pendingData ? JSON.stringify(state.pendingData) : null,
        state.resumeToken,
        state.pausedAt ?? null,
        state.expiresAt ?? null
      );

    return state;
  }

  /**
   * Resume pipeline from paused state
   */
  async resumePipeline(sessionId: string, resumeToken: string): Promise<PipelineState> {
    // Load state from database
    const row = this.db
      .prepare(
        `SELECT session_id, status, current_eye, pause_reason, pending_data, resume_token, paused_at, expires_at
         FROM pipeline_states
         WHERE session_id = ? AND resume_token = ?`
      )
      .get(sessionId, resumeToken) as
      | {
          session_id: string;
          status: string;
          current_eye: string;
          pause_reason: string | null;
          pending_data: string | null;
          resume_token: string;
          paused_at: number | null;
          expires_at: number | null;
        }
      | undefined;

    if (!row) {
      throw new Error(`Pipeline state not found for session ${sessionId} with token ${resumeToken}`);
    }

    // Check expiration
    if (row.expires_at && row.expires_at < Date.now()) {
      throw new Error(`Pipeline state for session ${sessionId} has expired`);
    }

    // Check status
    if (row.status !== 'paused_for_human' && row.status !== 'paused_for_agent') {
      throw new Error(`Cannot resume pipeline with status: ${row.status}`);
    }

    const state: PipelineState = {
      sessionId: row.session_id,
      status: 'running',
      currentEye: row.current_eye,
      pauseReason: row.pause_reason as 'clarification' | 'confirmation' | 'validation_failed' | undefined,
      pendingData: row.pending_data ? (JSON.parse(row.pending_data) as Record<string, unknown>) : undefined,
      resumeToken: row.resume_token,
      pausedAt: row.paused_at ?? undefined,
      expiresAt: row.expires_at ?? undefined,
    };

    // Update status to running
    this.db
      .prepare(`UPDATE pipeline_states SET status = 'running' WHERE session_id = ?`)
      .run(sessionId);

    return state;
  }

  /**
   * Get pipeline state for session
   */
  async getPipelineState(sessionId: string): Promise<PipelineState | null> {
    const row = this.db
      .prepare(
        `SELECT session_id, status, current_eye, pause_reason, pending_data, resume_token, paused_at, expires_at
         FROM pipeline_states
         WHERE session_id = ?`
      )
      .get(sessionId) as
      | {
          session_id: string;
          status: string;
          current_eye: string;
          pause_reason: string | null;
          pending_data: string | null;
          resume_token: string;
          paused_at: number | null;
          expires_at: number | null;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      sessionId: row.session_id,
      status: row.status as 'running' | 'paused_for_human' | 'paused_for_agent' | 'completed',
      currentEye: row.current_eye,
      pauseReason: row.pause_reason as 'clarification' | 'confirmation' | 'validation_failed' | undefined,
      pendingData: row.pending_data ? (JSON.parse(row.pending_data) as Record<string, unknown>) : undefined,
      resumeToken: row.resume_token,
      pausedAt: row.paused_at ?? undefined,
      expiresAt: row.expires_at ?? undefined,
    };
  }

  /**
   * Complete pipeline (remove from paused state)
   */
  async completePipeline(sessionId: string): Promise<void> {
    this.db
      .prepare(`UPDATE pipeline_states SET status = 'completed' WHERE session_id = ?`)
      .run(sessionId);
  }

  /**
   * Create pending question for human-in-the-loop
   */
  async createPendingQuestion(params: {
    sessionId: string;
    eyeName: string;
    questions: readonly string[];
    context?: Record<string, unknown>;
    expiresInMs?: number;
  }): Promise<PendingQuestion> {
    const id = randomUUID();
    const createdAt = Date.now();
    const expiresAt = createdAt + (params.expiresInMs ?? 3600000); // Default 1 hour

    const question: PendingQuestion = {
      id,
      sessionId: params.sessionId,
      eyeName: params.eyeName,
      questions: params.questions,
      context: params.context,
      status: 'pending',
      createdAt,
      expiresAt,
    };

    this.db
      .prepare(
        `INSERT INTO pending_questions (id, session_id, eye_name, questions, context, status, created_at, expires_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        question.id,
        question.sessionId,
        question.eyeName,
        JSON.stringify(question.questions),
        question.context ? JSON.stringify(question.context) : null,
        question.status,
        question.createdAt,
        question.expiresAt
      );

    return question;
  }

  /**
   * Get pending questions for session
   */
  async getPendingQuestions(sessionId: string): Promise<readonly PendingQuestion[]> {
    const rows = this.db
      .prepare(
        `SELECT id, session_id, eye_name, questions, context, status, created_at, expires_at
         FROM pending_questions
         WHERE session_id = ? AND status = 'pending'
         ORDER BY created_at DESC`
      )
      .all(sessionId) as Array<{
      id: string;
      session_id: string;
      eye_name: string;
      questions: string;
      context: string | null;
      status: string;
      created_at: number;
      expires_at: number;
    }>;

    return rows.map(row => ({
      id: row.id,
      sessionId: row.session_id,
      eyeName: row.eye_name,
      questions: JSON.parse(row.questions) as string[],
      context: row.context ? (JSON.parse(row.context) as Record<string, unknown>) : undefined,
      status: row.status as 'pending' | 'answered' | 'expired',
      createdAt: row.created_at,
      expiresAt: row.expires_at,
    }));
  }

  /**
   * Submit human response to pending question
   */
  async submitHumanResponse(params: {
    questionId: string;
    sessionId: string;
    answers: Record<string, unknown>;
    source: 'human' | 'agent';
  }): Promise<HumanResponse> {
    const id = randomUUID();
    const createdAt = Date.now();

    const response: HumanResponse = {
      id,
      questionId: params.questionId,
      sessionId: params.sessionId,
      answers: params.answers,
      source: params.source,
      validated: false,
      createdAt,
    };

    // Insert response
    this.db
      .prepare(
        `INSERT INTO human_responses (id, question_id, session_id, answers, source, validated, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        response.id,
        response.questionId,
        response.sessionId,
        JSON.stringify(response.answers),
        response.source,
        response.validated ? 1 : 0,
        response.createdAt
      );

    // Mark question as answered
    this.db
      .prepare(`UPDATE pending_questions SET status = 'answered' WHERE id = ?`)
      .run(params.questionId);

    return response;
  }

  /**
   * Get human responses for question
   */
  async getHumanResponses(questionId: string): Promise<readonly HumanResponse[]> {
    const rows = this.db
      .prepare(
        `SELECT id, question_id, session_id, answers, source, validated, created_at
         FROM human_responses
         WHERE question_id = ?
         ORDER BY created_at DESC`
      )
      .all(questionId) as Array<{
      id: string;
      question_id: string;
      session_id: string;
      answers: string;
      source: string;
      validated: number;
      created_at: number;
    }>;

    return rows.map(row => ({
      id: row.id,
      questionId: row.question_id,
      sessionId: row.session_id,
      answers: JSON.parse(row.answers) as Record<string, unknown>,
      source: row.source as 'human' | 'agent',
      validated: row.validated === 1,
      createdAt: row.created_at,
    }));
  }

  /**
   * Expire old pending questions
   */
  async expireOldQuestions(): Promise<number> {
    const now = Date.now();
    const result = this.db
      .prepare(
        `UPDATE pending_questions
         SET status = 'expired'
         WHERE status = 'pending' AND expires_at < ?`
      )
      .run(now);

    return result.changes;
  }
}
