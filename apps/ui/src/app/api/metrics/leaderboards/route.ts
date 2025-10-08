// @ts-nocheck
import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const range = searchParams.get('range') || '7d';

  try {
    // Calculate date threshold based on range
    const now = new Date();
    let thresholdDate: Date;

    switch (range) {
      case '24h':
        thresholdDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        thresholdDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        thresholdDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'all':
      default:
        thresholdDate = new Date(0); // All time
    }

    // Dynamic import to avoid bundling bun:sqlite
    const { getDb, runs } = await import('@third-eye/db');
    const { db } = getDb();
    const { sql } = await import('drizzle-orm');

    // Get all runs within timeframe
    const allRuns = await db
      .select()
      .from(runs)
      .where(sql`${runs.createdAt} >= ${thresholdDate.toISOString()}`)
      .all();

    // Calculate first-try approvals
    const sessionFirstRuns = new Map<string, typeof allRuns[0]>();
    allRuns.forEach((run) => {
      const key = `${run.sessionId}-${run.eye}`;
      if (!sessionFirstRuns.has(key)) {
        sessionFirstRuns.set(key, run);
      }
    });

    const firstRuns = Array.from(sessionFirstRuns.values());
    const approvedFirstRuns = firstRuns.filter((run) => {
      try {
        const output = typeof run.outputJson === 'string' ? JSON.parse(run.outputJson) : run.outputJson;
        return output?.verdict === 'APPROVED';
      } catch {
        return false;
      }
    });

    const firstTryApprovals = {
      total: approvedFirstRuns.length,
      percentage: firstRuns.length > 0 ? (approvedFirstRuns.length / firstRuns.length) * 100 : 0,
    };

    // Calculate hallucinations caught
    const hallucinationRuns = allRuns.filter((run) => {
      try {
        const output = typeof run.outputJson === 'string' ? JSON.parse(run.outputJson) : run.outputJson;
        return (
          output?.code?.includes('REJECT_NO_EVIDENCE') ||
          output?.code?.includes('REJECT_INCONSISTENT') ||
          (run.eye === 'tenseigan' && output?.verdict === 'REJECTED') ||
          (run.eye === 'byakugan' && output?.verdict === 'REJECTED')
        );
      } catch {
        return false;
      }
    });

    const hallucinationsByEye: Record<string, number> = {};
    hallucinationRuns.forEach((run) => {
      hallucinationsByEye[run.eye] = (hallucinationsByEye[run.eye] || 0) + 1;
    });

    const hallucinationsCaught = {
      total: hallucinationRuns.length,
      byEye: hallucinationsByEye,
    };

    // Calculate average clarifications
    const clarificationRuns = allRuns.filter((run) => {
      try {
        const output = typeof run.outputJson === 'string' ? JSON.parse(run.outputJson) : run.outputJson;
        return output?.verdict === 'NEEDS_INPUT' || output?.code?.includes('NEED_');
      } catch {
        return false;
      }
    });

    const sessionsWithRuns = new Map<string, number>();
    allRuns.forEach((run) => {
      sessionsWithRuns.set(run.sessionId, (sessionsWithRuns.get(run.sessionId) || 0) + 1);
    });

    // Calculate trend: Compare last 7 days vs previous 7 days
    const currentWeekDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previousWeekDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    // Get runs for current and previous week
    const allRunsLast14Days = await db
      .select()
      .from(runs)
      .where(sql`${runs.createdAt} >= ${previousWeekDate.toISOString()}`)
      .all();

    const currentWeekRuns = allRunsLast14Days.filter((run) => {
      const runDate = new Date(run.createdAt);
      return runDate >= currentWeekDate;
    });

    const previousWeekRuns = allRunsLast14Days.filter((run) => {
      const runDate = new Date(run.createdAt);
      return runDate >= previousWeekDate && runDate < currentWeekDate;
    });

    const currentWeekClarifications = currentWeekRuns.filter((run) => {
      try {
        const output = typeof run.outputJson === 'string' ? JSON.parse(run.outputJson) : run.outputJson;
        return output?.verdict === 'NEEDS_INPUT' || output?.code?.includes('NEED_');
      } catch {
        return false;
      }
    }).length;

    const previousWeekClarifications = previousWeekRuns.filter((run) => {
      try {
        const output = typeof run.outputJson === 'string' ? JSON.parse(run.outputJson) : run.outputJson;
        return output?.verdict === 'NEEDS_INPUT' || output?.code?.includes('NEED_');
      } catch {
        return false;
      }
    }).length;

    const currentWeekSessions = new Set(currentWeekRuns.map(r => r.sessionId)).size;
    const previousWeekSessions = new Set(previousWeekRuns.map(r => r.sessionId)).size;

    const currentWeekAvg = currentWeekSessions > 0 ? currentWeekClarifications / currentWeekSessions : 0;
    const previousWeekAvg = previousWeekSessions > 0 ? previousWeekClarifications / previousWeekSessions : 0;

    // Calculate trend: ±5% threshold
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (previousWeekAvg > 0) {
      const changePercent = ((currentWeekAvg - previousWeekAvg) / previousWeekAvg) * 100;
      if (changePercent > 5) {
        trend = 'up';
      } else if (changePercent < -5) {
        trend = 'down';
      }
    }

    const avgClarifications = {
      average: sessionsWithRuns.size > 0 ? clarificationRuns.length / sessionsWithRuns.size : 0,
      trend,
    };

    // Calculate Eye performance
    const eyeStats = new Map<string, { approvals: number; total: number; totalLatency: number }>();

    allRuns.forEach((run) => {
      const stats = eyeStats.get(run.eye) || { approvals: 0, total: 0, totalLatency: 0 };
      stats.total++;
      stats.totalLatency += run.latencyMs || 0;

      try {
        const output = typeof run.outputJson === 'string' ? JSON.parse(run.outputJson) : run.outputJson;
        if (output?.verdict === 'APPROVED') {
          stats.approvals++;
        }
      } catch {
        // Ignore parse errors
      }

      eyeStats.set(run.eye, stats);
    });

    const eyePerformance = Array.from(eyeStats.entries()).map(([eye, stats]) => ({
      eye,
      approvalRate: stats.total > 0 ? stats.approvals / stats.total : 0,
      avgLatency: stats.total > 0 ? stats.totalLatency / stats.total : 0,
      totalRuns: stats.total,
    }));

    // Calculate Provider performance
    const providerStats = new Map<string, { total: number; totalLatency: number; errors: number }>();

    allRuns.forEach((run) => {
      const provider = run.provider || 'local';
      const stats = providerStats.get(provider) || { total: 0, totalLatency: 0, errors: 0 };
      stats.total++;
      stats.totalLatency += run.latencyMs || 0;

      try {
        const output = typeof run.outputJson === 'string' ? JSON.parse(run.outputJson) : run.outputJson;
        if (output?.code?.includes('ERROR') || output?.code?.includes('TIMEOUT')) {
          stats.errors++;
        }
      } catch {
        stats.errors++;
      }

      providerStats.set(provider, stats);
    });

    const providerPerformance = Array.from(providerStats.entries()).map(([provider, stats]) => ({
      provider,
      avgLatency: stats.total > 0 ? stats.totalLatency / stats.total : 0,
      totalRuns: stats.total,
      errorRate: stats.total > 0 ? (stats.errors / stats.total) * 100 : 0,
    }));

    return NextResponse.json({
      firstTryApprovals,
      hallucinationsCaught,
      avgClarifications,
      eyePerformance,
      providerPerformance,
    });
  } catch (error) {
    console.error('Failed to fetch leaderboard metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
