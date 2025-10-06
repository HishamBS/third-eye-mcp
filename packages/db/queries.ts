import { getDb } from './index';
import { runs, eyeLeaderboard } from './schema';
import { eq, sql, and, gte } from 'drizzle-orm';

/**
 * Calculate Eye trend from runs data
 * Compares last 7 days vs previous 7 days
 * @param eyeName Name of the Eye
 * @returns Trend object with direction and percentage change
 */
export async function calculateEyeTrend(eyeName: string): Promise<{
  trend: 'up' | 'down' | 'stable';
  changePercent: number;
  currentWeekRuns: number;
  previousWeekRuns: number;
}> {
  const { db } = getDb();
  const now = new Date();

  // Define time ranges
  const currentWeekStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const previousWeekStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  // Get all runs for last 14 days for this Eye
  const allRuns = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.eye, eyeName),
        gte(runs.createdAt, previousWeekStart)
      )
    )
    .all();

  // Split into current and previous week
  const currentWeekRuns = allRuns.filter((run) => {
    const runDate = new Date(run.createdAt);
    return runDate >= currentWeekStart;
  });

  const previousWeekRuns = allRuns.filter((run) => {
    const runDate = new Date(run.createdAt);
    return runDate >= previousWeekStart && runDate < currentWeekStart;
  });

  // Calculate approval rates for each period
  const currentWeekApprovals = currentWeekRuns.filter((run) => {
    try {
      const output = typeof run.outputJson === 'string'
        ? JSON.parse(run.outputJson)
        : run.outputJson;
      return output?.verdict === 'APPROVED';
    } catch {
      return false;
    }
  }).length;

  const previousWeekApprovals = previousWeekRuns.filter((run) => {
    try {
      const output = typeof run.outputJson === 'string'
        ? JSON.parse(run.outputJson)
        : run.outputJson;
      return output?.verdict === 'APPROVED';
    } catch {
      return false;
    }
  }).length;

  const currentWeekApprovalRate = currentWeekRuns.length > 0
    ? (currentWeekApprovals / currentWeekRuns.length) * 100
    : 0;

  const previousWeekApprovalRate = previousWeekRuns.length > 0
    ? (previousWeekApprovals / previousWeekRuns.length) * 100
    : 0;

  // Calculate percentage change
  let changePercent = 0;
  let trend: 'up' | 'down' | 'stable' = 'stable';

  if (previousWeekApprovalRate > 0) {
    changePercent = ((currentWeekApprovalRate - previousWeekApprovalRate) / previousWeekApprovalRate) * 100;

    // ±5% threshold for trend determination
    if (changePercent > 5) {
      trend = 'up';
    } else if (changePercent < -5) {
      trend = 'down';
    }
  } else if (currentWeekApprovalRate > 0) {
    // If previous week had no data but current week does, trend is up
    trend = 'up';
    changePercent = 100;
  }

  return {
    trend,
    changePercent,
    currentWeekRuns: currentWeekRuns.length,
    previousWeekRuns: previousWeekRuns.length,
  };
}

/**
 * Update Eye leaderboard cache
 * @param eyeName Name of the Eye
 */
export async function updateEyeLeaderboard(eyeName: string): Promise<void> {
  const { db } = getDb();
  const now = new Date();

  // Get all runs for this Eye in last 14 days
  const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

  const eyeRuns = await db
    .select()
    .from(runs)
    .where(
      and(
        eq(runs.eye, eyeName),
        gte(runs.createdAt, fourteenDaysAgo)
      )
    )
    .all();

  if (eyeRuns.length === 0) {
    return;
  }

  // Calculate stats
  let totalApprovals = 0;
  let totalLatency = 0;

  eyeRuns.forEach((run) => {
    totalLatency += run.latencyMs || 0;

    try {
      const output = typeof run.outputJson === 'string'
        ? JSON.parse(run.outputJson)
        : run.outputJson;
      if (output?.verdict === 'APPROVED') {
        totalApprovals++;
      }
    } catch {
      // Ignore parse errors
    }
  });

  const approvalRate = Math.round((totalApprovals / eyeRuns.length) * 100);
  const avgLatency = Math.round(totalLatency / eyeRuns.length);

  // Build trend data (last 14 days, one entry per day)
  const trendData: Array<{ day: string; runs: number; approvals: number }> = [];

  for (let i = 13; i >= 0; i--) {
    const day = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(day.setHours(0, 0, 0, 0));
    const dayEnd = new Date(day.setHours(23, 59, 59, 999));

    const dayRuns = eyeRuns.filter((run) => {
      const runDate = new Date(run.createdAt);
      return runDate >= dayStart && runDate <= dayEnd;
    });

    const dayApprovals = dayRuns.filter((run) => {
      try {
        const output = typeof run.outputJson === 'string'
          ? JSON.parse(run.outputJson)
          : run.outputJson;
        return output?.verdict === 'APPROVED';
      } catch {
        return false;
      }
    }).length;

    trendData.push({
      day: dayStart.toISOString().split('T')[0],
      runs: dayRuns.length,
      approvals: dayApprovals,
    });
  }

  // Upsert into leaderboard table
  const existing = await db
    .select()
    .from(eyeLeaderboard)
    .where(eq(eyeLeaderboard.eye, eyeName))
    .get();

  if (existing) {
    await db
      .update(eyeLeaderboard)
      .set({
        totalRuns: eyeRuns.length,
        approvalRate,
        avgLatency,
        trendData,
        lastUpdated: now,
      })
      .where(eq(eyeLeaderboard.eye, eyeName))
      .run();
  } else {
    await db
      .insert(eyeLeaderboard)
      .values({
        eye: eyeName,
        totalRuns: eyeRuns.length,
        approvalRate,
        avgLatency,
        trendData,
        lastUpdated: now,
      })
      .run();
  }
}

/**
 * Get leaderboard data for all Eyes
 */
export async function getEyeLeaderboards(): Promise<Array<{
  eye: string;
  totalRuns: number;
  approvalRate: number;
  avgLatency: number;
  trend: 'up' | 'down' | 'stable';
  trendData?: any;
}>> {
  const { db } = getDb();

  const leaderboards = await db.select().from(eyeLeaderboard).all();

  // Calculate trends for each Eye
  const results = await Promise.all(
    leaderboards.map(async (board) => {
      const trendInfo = await calculateEyeTrend(board.eye);
      return {
        eye: board.eye,
        totalRuns: board.totalRuns,
        approvalRate: board.approvalRate,
        avgLatency: board.avgLatency,
        trend: trendInfo.trend,
        trendData: board.trendData,
      };
    })
  );

  return results;
}

/**
 * Create database indexes for performance optimization
 * Should be run on application startup
 */
export async function createDatabaseIndexes(): Promise<void> {
  const { db } = getDb();

  try {
    // Index on runs.session_id for session queries
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_runs_session_id
      ON runs(session_id)
    `);

    // Composite index on runs.eye + created_at for leaderboard queries
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_runs_eye_created
      ON runs(eye, created_at)
    `);

    // Index on sessions.status + created_at for dashboard queries
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_sessions_status_created
      ON sessions(status, created_at)
    `);

    // Composite index on runs.session_id + created_at for timeline
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_runs_session_timeline
      ON runs(session_id, created_at)
    `);

    // Index on pipeline_events.session_id for event queries
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_events_session_id
      ON pipeline_events(session_id)
    `);

    // Index on pipeline_events.eye for Eye-specific queries
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_events_eye
      ON pipeline_events(eye)
    `);

    // Index on runs.created_at for time-based queries
    await db.run(sql`
      CREATE INDEX IF NOT EXISTS idx_runs_created_at
      ON runs(created_at)
    `);

    console.log('✅ Database indexes created successfully');
  } catch (error) {
    console.error('❌ Failed to create database indexes:', error);
    throw error;
  }
}

/**
 * Analyze query performance
 * Returns EXPLAIN QUERY PLAN results for a given query
 */
export async function analyzeQuery(query: string): Promise<any[]> {
  const { db } = getDb();

  try {
    const results = await db.all(sql.raw(`EXPLAIN QUERY PLAN ${query}`));
    return results;
  } catch (error) {
    console.error('Failed to analyze query:', error);
    throw error;
  }
}
