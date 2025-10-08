import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Proxy to the server API which has database access
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:7070';

    // Fetch sessions data with stats
    const sessionsResponse = await fetch(`${API_URL}/api/session/active`);
    if (!sessionsResponse.ok) {
      throw new Error(`Server returned ${sessionsResponse.status}`);
    }
    const sessionsData = await sessionsResponse.json();

    // Calculate real metrics from sessions
    const sessions = sessionsData.data?.sessions || [];
    const totalSessions = sessions.length;

    // Fetch runs for each session and aggregate metrics
    let allRuns: any[] = [];
    const providerStats = new Map<string, { totalCalls: number; totalLatency: number; successCount: number; totalTokens: number }>();

    for (const session of sessions) {
      try {
        const runsResponse = await fetch(`${API_URL}/api/session/${session.sessionId || session.id}/runs`);
        if (runsResponse.ok) {
          const runsData = await runsResponse.json();
          const runs = runsData.data?.runs || [];
          allRuns = allRuns.concat(runs);

          // Aggregate provider stats
          for (const run of runs) {
            const provider = run.provider || 'unknown';
            if (!providerStats.has(provider)) {
              providerStats.set(provider, { totalCalls: 0, totalLatency: 0, successCount: 0, totalTokens: 0 });
            }
            const stats = providerStats.get(provider)!;
            stats.totalCalls++;
            stats.totalLatency += run.latencyMs || 0;
            stats.totalTokens += (run.tokensIn || 0) + (run.tokensOut || 0);

            // Check if run was successful
            try {
              const output = typeof run.outputJson === 'string' ? JSON.parse(run.outputJson) : run.outputJson;
              if (output?.ok === true || output?.code?.startsWith('OK_')) {
                stats.successCount++;
              }
            } catch {
              // Failed to parse output, don't count as success
            }
          }
        }
      } catch (err) {
        console.error(`Failed to fetch runs for session ${session.sessionId || session.id}:`, err);
      }
    }

    // Calculate aggregate metrics
    const totalRuns = allRuns.length;
    const totalTokens = allRuns.reduce((sum, run) => sum + (run.tokensIn || 0) + (run.tokensOut || 0), 0);

    // Calculate average latency from runs with valid latency
    const runsWithLatency = allRuns.filter(r => r.latencyMs != null && r.latencyMs > 0);
    const avgLatency = runsWithLatency.length > 0
      ? Math.round(runsWithLatency.reduce((sum, r) => sum + r.latencyMs, 0) / runsWithLatency.length)
      : 0;

    // Calculate approval rate
    const successfulRuns = allRuns.filter(r => {
      try {
        const output = typeof r.outputJson === 'string' ? JSON.parse(r.outputJson) : r.outputJson;
        return output?.ok === true || output?.code?.startsWith('OK_');
      } catch {
        return false;
      }
    });
    const approvalRate = totalRuns > 0 ? Math.round((successfulRuns.length / totalRuns) * 100) : 0;

    // Calculate latency histogram
    const latencyHistogram = {
      '0-100ms': 0,
      '100-500ms': 0,
      '500-1000ms': 0,
      '1000-2000ms': 0,
      '2000ms+': 0,
    };

    for (const run of runsWithLatency) {
      const latency = run.latencyMs;
      if (latency <= 100) latencyHistogram['0-100ms']++;
      else if (latency <= 500) latencyHistogram['100-500ms']++;
      else if (latency <= 1000) latencyHistogram['500-1000ms']++;
      else if (latency <= 2000) latencyHistogram['1000-2000ms']++;
      else latencyHistogram['2000ms+']++;
    }

    // Calculate tokens per session
    const tokensPerSession = totalSessions > 0 ? Math.round(totalTokens / totalSessions) : 0;

    // Build provider metrics
    const providers = Array.from(providerStats.entries()).map(([provider, stats]) => ({
      provider,
      totalCalls: stats.totalCalls,
      successRate: stats.totalCalls > 0 ? Math.round((stats.successCount / stats.totalCalls) * 100) : 0,
      avgLatency: stats.totalCalls > 0 ? Math.round(stats.totalLatency / stats.totalCalls) : 0,
      totalTokens: stats.totalTokens,
    }));

    const metrics = {
      providers,
      totalCalls: totalRuns,
      totalTokens,
      avgLatency,
      uptime: 0, // TODO: Calculate actual uptime if needed
      latencyHistogram,
      tokensPerSession,
      approvalRate,
      totalSessions,
      totalRuns,
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Metrics API error:', error);
    // Return empty metrics instead of error to prevent infinite loop
    return NextResponse.json({
      providers: [],
      totalCalls: 0,
      totalTokens: 0,
      avgLatency: 0,
      uptime: 0,
      latencyHistogram: {
        '0-100ms': 0,
        '100-500ms': 0,
        '500-1000ms': 0,
        '1000-2000ms': 0,
        '2000ms+': 0,
      },
      tokensPerSession: 0,
      approvalRate: 0,
    });
  }
}
