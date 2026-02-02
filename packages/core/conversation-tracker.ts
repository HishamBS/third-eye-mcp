/**
 * Conversation Tracker - Phase 5 Narrative Monitoring
 *
 * Tracks agent and human messages in the database for narrative timeline display.
 * Creates conversation events that show the "story" of the pipeline execution.
 *
 * Per R01: SSOT for event type constants
 * Per R07: Strict typing, no 'any'
 * Per R13: Event types from constants
 */

import type { Database } from "bun:sqlite";
import { generateId } from "@third-eye/db/utils/uuid";

/**
 * Event type constants (SSOT)
 */
export const CONVERSATION_EVENT_TYPES = {
  AGENT_MESSAGE: "agent_message",
  HUMAN_MESSAGE: "human_message",
  ROUTING_DECISION: "routing_decision",
  PAUSE: "pause",
  RESUME: "resume",
  ERROR: "error",
} as const;

export type ConversationEventType =
  (typeof CONVERSATION_EVENT_TYPES)[keyof typeof CONVERSATION_EVENT_TYPES];

/**
 * Conversation event data interface
 */
export interface ConversationEventData {
  sessionId: string;
  eventType: ConversationEventType;
  speaker: string; // Eye name or 'human'
  message: string;
  metadata?: Record<string, unknown>;
}

/**
 * Conversation Tracker - Logs agent and human interactions
 */
export class ConversationTracker {
  private tableExists: boolean | null = null;

  constructor(private readonly db: Database) {}

  /**
   * Check if the conversation_events table exists
   * Results are cached for performance
   */
  private checkTableExists(): boolean {
    if (this.tableExists !== null) {
      return this.tableExists;
    }

    try {
      const stmt = this.db.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name='conversation_events'
      `);
      const result = stmt.get() as { name: string } | undefined;
      this.tableExists = result !== undefined;
      return this.tableExists;
    } catch {
      this.tableExists = false;
      return false;
    }
  }

  /**
   * Log a conversation event
   * Returns empty string if table doesn't exist (graceful degradation)
   */
  logEvent(event: ConversationEventData): string {
    if (!this.checkTableExists()) {
      return "";
    }

    const id = generateId();
    const createdAt = Date.now();

    const stmt = this.db.prepare(`
      INSERT INTO conversation_events (id, session_id, event_type, speaker, message, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      event.sessionId,
      event.eventType,
      event.speaker,
      event.message,
      event.metadata ? JSON.stringify(event.metadata) : null,
      createdAt,
    );

    return id;
  }

  /**
   * Log agent message (from an eye)
   */
  logAgentMessage(
    sessionId: string,
    eyeName: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): string {
    return this.logEvent({
      sessionId,
      eventType: CONVERSATION_EVENT_TYPES.AGENT_MESSAGE,
      speaker: eyeName.toLowerCase(),
      message,
      metadata,
    });
  }

  /**
   * Log human message
   */
  logHumanMessage(
    sessionId: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): string {
    return this.logEvent({
      sessionId,
      eventType: CONVERSATION_EVENT_TYPES.HUMAN_MESSAGE,
      speaker: "human",
      message,
      metadata,
    });
  }

  /**
   * Log routing decision from Overseer
   */
  logRoutingDecision(
    sessionId: string,
    selectedEyes: string[],
    reasoning: string,
    metadata?: Record<string, unknown>,
  ): string {
    const message = `Routing to: ${selectedEyes.join(" → ")}`;
    return this.logEvent({
      sessionId,
      eventType: CONVERSATION_EVENT_TYPES.ROUTING_DECISION,
      speaker: "overseer",
      message,
      metadata: {
        ...metadata,
        selectedEyes,
        reasoning,
      },
    });
  }

  /**
   * Log pipeline pause
   */
  logPause(
    sessionId: string,
    eyeName: string,
    reason: string,
    metadata?: Record<string, unknown>,
  ): string {
    return this.logEvent({
      sessionId,
      eventType: CONVERSATION_EVENT_TYPES.PAUSE,
      speaker: eyeName.toLowerCase(),
      message: `Pipeline paused: ${reason}`,
      metadata: {
        ...metadata,
        reason,
      },
    });
  }

  /**
   * Log pipeline resume
   */
  logResume(
    sessionId: string,
    message: string,
    metadata?: Record<string, unknown>,
  ): string {
    return this.logEvent({
      sessionId,
      eventType: CONVERSATION_EVENT_TYPES.RESUME,
      speaker: "system",
      message,
      metadata,
    });
  }

  /**
   * Log error
   */
  logError(
    sessionId: string,
    eyeName: string,
    error: string,
    metadata?: Record<string, unknown>,
  ): string {
    return this.logEvent({
      sessionId,
      eventType: CONVERSATION_EVENT_TYPES.ERROR,
      speaker: eyeName.toLowerCase(),
      message: `Error: ${error}`,
      metadata,
    });
  }

  /**
   * Get conversation timeline for a session
   * Returns empty array if table doesn't exist (graceful degradation)
   */
  getConversationTimeline(
    sessionId: string,
  ): readonly ConversationEventRecord[] {
    if (!this.checkTableExists()) {
      return [];
    }

    const stmt = this.db.prepare(`
      SELECT id, session_id, event_type, speaker, message, metadata, created_at
      FROM conversation_events
      WHERE session_id = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(sessionId) as ConversationEventRow[];
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      eventType: row.event_type as ConversationEventType,
      speaker: row.speaker,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Get recent conversation events across all sessions
   * Returns empty array if table doesn't exist (graceful degradation)
   */
  getRecentEvents(limit: number = 50): readonly ConversationEventRecord[] {
    if (!this.checkTableExists()) {
      return [];
    }

    const stmt = this.db.prepare(`
      SELECT id, session_id, event_type, speaker, message, metadata, created_at
      FROM conversation_events
      ORDER BY created_at DESC
      LIMIT ?
    `);

    const rows = stmt.all(limit) as ConversationEventRow[];
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      eventType: row.event_type as ConversationEventType,
      speaker: row.speaker,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Get conversation events by type
   * Returns empty array if table doesn't exist (graceful degradation)
   */
  getEventsByType(
    sessionId: string,
    eventType: ConversationEventType,
  ): readonly ConversationEventRecord[] {
    if (!this.checkTableExists()) {
      return [];
    }

    const stmt = this.db.prepare(`
      SELECT id, session_id, event_type, speaker, message, metadata, created_at
      FROM conversation_events
      WHERE session_id = ? AND event_type = ?
      ORDER BY created_at ASC
    `);

    const rows = stmt.all(sessionId, eventType) as ConversationEventRow[];
    return rows.map((row) => ({
      id: row.id,
      sessionId: row.session_id,
      eventType: row.event_type as ConversationEventType,
      speaker: row.speaker,
      message: row.message,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: new Date(row.created_at),
    }));
  }

  /**
   * Delete old conversation events (cleanup)
   * Returns 0 if table doesn't exist (graceful degradation)
   */
  deleteOldEvents(daysOld: number): number {
    if (!this.checkTableExists()) {
      return 0;
    }

    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const stmt = this.db.prepare(`
      DELETE FROM conversation_events
      WHERE created_at < ?
    `);

    const result = stmt.run(cutoffTime);
    return result.changes;
  }
}

/**
 * Internal database row type
 */
interface ConversationEventRow {
  id: string;
  session_id: string;
  event_type: string;
  speaker: string;
  message: string;
  metadata: string | null;
  created_at: number;
}

/**
 * Public conversation event record type
 */
export interface ConversationEventRecord {
  id: string;
  sessionId: string;
  eventType: ConversationEventType;
  speaker: string;
  message: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
