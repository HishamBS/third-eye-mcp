import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@third-eye/db';
import { runs, sessions } from '@third-eye/db';
import { sql, desc, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { db } = getDb();

    // Get all runs for metrics
    const allRuns = await db.select().from(runs).all();

    // Calculate provider metrics
    const providerStats = new Map<string, {
      calls: number;
      tokens: number;
      latency: number;
      errors: number;
    }>();

    let totalCalls = 0;
    let totalTokens = 0;
    let totalLatency = 0;

    allRuns.forEach((run) => {
      const provider = run.provider || 'unknown';
      const stats = providerStats.get(provider) || {
        calls: 0,
        tokens: 0,
        latency: 0,
        errors: 0
      };

      stats.calls++;
      stats.tokens += (run.tokensIn || 0) + (run.tokensOut || 0);
      stats.latency += run.latencyMs || 0;

      // Check for errors in output
      try {
        const output = typeof run.outputJson === 'string'
          ? JSON.parse(run.outputJson)
          : run.outputJson;
        if (output?.code?.includes('ERROR') || output?.code?.includes('TIMEOUT')) {
          stats.errors++;
        }
      } catch {
        stats.errors++;
      }

      providerStats.set(provider, stats);

      totalCalls++;
      totalTokens += (run.tokensIn || 0) + (run.tokensOut || 0);
      totalLatency += run.latencyMs || 0;
    });

    // Transform to metrics format
    const providers = Array.from(providerStats.entries()).map(([provider, stats]) => ({
      name: provider,
      calls: stats.calls,
      tokens: stats.tokens,
      avgLatency: stats.calls > 0 ? Math.round(stats.latency / stats.calls) : 0,
      errorRate: stats.calls > 0 ? (stats.errors / stats.calls) * 100 : 0,
    }));

    // Calculate uptime (time since first session)
    const firstSession = await db
      .select()
      .from(sessions)
      .orderBy(sessions.createdAt)
      .limit(1)
      .get();

    const uptime = firstSession
      ? Math.floor((Date.now() - new Date(firstSession.createdAt).getTime()) / 1000)
      : 0;

    return NextResponse.json({
      providers,
      totalCalls,
      totalTokens,
      avgLatency: totalCalls > 0 ? Math.round(totalLatency / totalCalls) : 0,
      uptime,
    });
  } catch (error) {
    console.error('Failed to fetch metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch metrics' },
      { status: 500 }
    );
  }
}
