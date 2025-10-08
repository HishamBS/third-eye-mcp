/**
 * Session Manager - Pipeline State Tracking
 *
 * Manages session lifecycle, state persistence, and pipeline progress tracking
 */

import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { sessions, runs } from '@third-eye/db';
import { eq, desc, and } from 'drizzle-orm';
import type { EyeName } from '@third-eye/eyes';
import { orderGuard, type PipelineState } from './order-guard';

export interface SessionConfig {
  agentName?: string;
  model?: string;
  displayName?: string;
  maxTokens?: number;
  temperature?: number;
  metadata?: Record<string, any>;
}

export interface SessionInfo {
  id: string;
  status: 'active' | 'paused' | 'completed' | 'failed';
  agentName: string;
  displayName?: string;
  portalUrl: string;
  createdAt: Date;
  updatedAt: Date;
  config: SessionConfig;
  pipelineState: PipelineState | null;
  runCount: number;
  lastActivity: Date;
}

export interface SessionMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  totalTokensIn: number;
  totalTokensOut: number;
  averageLatency: number;
  eyeUsageStats: Record<string, number>;
}

/**
 * Centralized session management with pipeline state tracking
 */
export class SessionManager {
  private db;

  constructor() {
    const { db } = getDb();
    this.db = db;
  }

  /**
   * Create new session with configuration
   */
  async createSession(config: SessionConfig = {}): Promise<SessionInfo> {
    const sessionId = nanoid();
    const now = new Date();

    // Insert session into database
    await this.db.insert(sessions).values({
      id: sessionId,
      createdAt: now,
      status: 'active',
      configJson: JSON.stringify(config),
      agentName: config.agentName || 'Unknown Agent',
      model: config.model || null,
      displayName: config.displayName || null,
      lastActivity: now,
    });

    // Initialize pipeline state in order guard
    orderGuard.clearSession(sessionId); // Ensure clean state

    // Build portal URL
    const host = process.env.SERVER_HOST || '127.0.0.1';
    const uiPort = parseInt(process.env.UI_PORT || '3300', 10);
    const portalUrl = `http://${host}:${uiPort}/monitor?session=${sessionId}`;

    return {
      id: sessionId,
      status: 'active',
      agentName: config.agentName || 'Unknown Agent',
      displayName: config.displayName,
      portalUrl,
      createdAt: now,
      updatedAt: now,
      config,
      pipelineState: null,
      runCount: 0,
      lastActivity: now,
    };
  }

  /**
   * Get session information with current state
   */
  async getSession(sessionId: string): Promise<SessionInfo | null> {
    const dbSession = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1);

    if (!dbSession[0]) {
      return null;
    }

    const session = dbSession[0];

    // Get pipeline state from order guard
    const pipelineState = orderGuard.getState(sessionId);

    // Get run count and last activity
    const runStats = await this.db
      .select({
        count: runs.id,
        lastCreated: runs.createdAt,
      })
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(desc(runs.createdAt))
      .limit(1);

    const runCount = await this.getRunCount(sessionId);
    const lastActivity = runStats[0]?.lastCreated || session.createdAt;

    // Build portal URL
    const host = process.env.SERVER_HOST || '127.0.0.1';
    const uiPort = parseInt(process.env.UI_PORT || '3300', 10);
    const portalUrl = `http://${host}:${uiPort}/monitor?session=${sessionId}`;

    return {
      id: session.id,
      status: session.status as 'active' | 'paused' | 'completed' | 'failed',
      agentName: session.agentName || 'Unknown Agent',
      displayName: session.displayName || undefined,
      portalUrl,
      createdAt: session.createdAt,
      updatedAt: session.lastActivity || session.createdAt,
      config: typeof session.configJson === 'string' ? JSON.parse(session.configJson) : session.configJson,
      pipelineState,
      runCount,
      lastActivity,
    };
  }

  /**
   * Update session status and metadata
   */
  async updateSession(sessionId: string, updates: Partial<SessionConfig & { status?: string }>): Promise<void> {
    const { status, ...config } = updates;
    const now = new Date();

    const updateData: any = {
      lastActivity: now,
    };

    if (status) {
      updateData.status = status;
    }

    if (Object.keys(config).length > 0) {
      // Merge with existing config
      const existing = await this.getSession(sessionId);
      if (existing) {
        updateData.configJson = JSON.stringify({ ...existing.config, ...config });
      }
    }

    await this.db
      .update(sessions)
      .set(updateData)
      .where(eq(sessions.id, sessionId));
  }

  /**
   * Get session metrics and statistics
   */
  async getSessionMetrics(sessionId: string): Promise<SessionMetrics> {
    const allRuns = await this.db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId));

    const successfulRuns = allRuns.filter(run =>
      run.provider !== 'error' && run.provider !== 'order-guard'
    );

    const failedRuns = allRuns.filter(run =>
      run.provider === 'error' || run.provider === 'order-guard'
    );

    const totalTokensIn = successfulRuns.reduce((sum, run) => sum + (run.tokensIn || 0), 0);
    const totalTokensOut = successfulRuns.reduce((sum, run) => sum + (run.tokensOut || 0), 0);

    const totalLatency = successfulRuns.reduce((sum, run) => sum + (run.latencyMs || 0), 0);
    const averageLatency = successfulRuns.length > 0 ? totalLatency / successfulRuns.length : 0;

    // Eye usage statistics
    const eyeUsageStats: Record<string, number> = {};
    allRuns.forEach(run => {
      eyeUsageStats[run.eye] = (eyeUsageStats[run.eye] || 0) + 1;
    });

    return {
      totalRuns: allRuns.length,
      successfulRuns: successfulRuns.length,
      failedRuns: failedRuns.length,
      totalTokensIn,
      totalTokensOut,
      averageLatency,
      eyeUsageStats,
    };
  }

  /**
   * List all sessions with basic info
   */
  async listSessions(limit = 50, offset = 0): Promise<SessionInfo[]> {
    const dbSessions = await this.db
      .select()
      .from(sessions)
      .orderBy(desc(sessions.lastActivity))
      .limit(limit)
      .offset(offset);

    const sessionInfos = await Promise.all(
      dbSessions.map(async (session) => {
        const info = await this.getSession(session.id);
        return info!;
      })
    );

    return sessionInfos;
  }

  /**
   * Get active sessions only
   */
  async getActiveSessions(): Promise<SessionInfo[]> {
    const dbSessions = await this.db
      .select()
      .from(sessions)
      .where(eq(sessions.status, 'active'))
      .orderBy(desc(sessions.lastActivity));

    const sessionInfos = await Promise.all(
      dbSessions.map(async (session) => {
        const info = await this.getSession(session.id);
        return info!;
      })
    );

    return sessionInfos;
  }

  /**
   * Close session and finalize state
   */
  async closeSession(sessionId: string, status: 'completed' | 'failed' = 'completed'): Promise<void> {
    await this.updateSession(sessionId, { status });

    // Optionally clear pipeline state to free memory
    // orderGuard.clearSession(sessionId);
  }

  /**
   * Pause session temporarily
   */
  async pauseSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, { status: 'paused' });
  }

  /**
   * Resume paused session
   */
  async resumeSession(sessionId: string): Promise<void> {
    await this.updateSession(sessionId, { status: 'active' });
  }

  /**
   * Get pipeline progress for session
   */
  getPipelineProgress(sessionId: string): {
    currentPhase: string;
    completedEyes: EyeName[];
    expectedNext: EyeName[];
    progressPercentage: number;
  } {
    const state = orderGuard.getState(sessionId);
    const expectedNext = orderGuard.getExpectedNext(sessionId);

    if (!state) {
      return {
        currentPhase: 'not_started',
        completedEyes: [],
        expectedNext: ['overseer', 'sharingan'],
        progressPercentage: 0,
      };
    }

    // Estimate progress based on phase
    let progressPercentage = 0;
    switch (state.currentPhase) {
      case 'initialization': progressPercentage = 10; break;
      case 'clarification': progressPercentage = 30; break;
      case 'planning': progressPercentage = 50; break;
      case 'implementation': progressPercentage = 80; break;
      case 'review': progressPercentage = 90; break;
      case 'completion': progressPercentage = 100; break;
    }

    return {
      currentPhase: state.currentPhase,
      completedEyes: state.completedEyes,
      expectedNext,
      progressPercentage,
    };
  }

  /**
   * Get run count for session
   */
  private async getRunCount(sessionId: string): Promise<number> {
    const result = await this.db
      .select({ count: runs.id })
      .from(runs)
      .where(eq(runs.sessionId, sessionId));

    return result.length;
  }

  /**
   * Clean up old sessions (utility method)
   */
  async cleanupOldSessions(olderThanDays = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    // Get sessions to clean up
    const oldSessions = await this.db
      .select({ id: sessions.id })
      .from(sessions)
      .where(and(
        eq(sessions.status, 'completed'),
        // Add date comparison logic here if needed
      ));

    // Clear from order guard memory
    oldSessions.forEach(session => {
      orderGuard.clearSession(session.id);
    });

    return oldSessions.length;
  }
}

// Export singleton instance
export const sessionManager = new SessionManager();