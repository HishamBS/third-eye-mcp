import { Hono } from "hono";
import { getDb } from "@third-eye/db";
import { sessions, runs } from "@third-eye/db";
import { count } from "drizzle-orm";
import {
  createSuccessResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler,
} from "../middleware/response";

/**
 * Metrics API Routes
 *
 * Provides aggregated metrics for the homepage and metrics page
 */
const app = new Hono();

app.use("*", requestIdMiddleware());
app.use("*", errorHandler());

/**
 * Server start time for uptime calculation
 */
const SERVER_START_TIME = Date.now();

/**
 * Latency histogram bucket boundaries (ms)
 */
const LATENCY_BUCKETS = [100, 250, 500, 1000] as const;

/**
 * Calculate latency bucket for a given latency value
 */
function getLatencyBucket(latencyMs: number): string {
  if (latencyMs <= LATENCY_BUCKETS[0]) return "0-100ms";
  if (latencyMs <= LATENCY_BUCKETS[1]) return "100-250ms";
  if (latencyMs <= LATENCY_BUCKETS[2]) return "250-500ms";
  if (latencyMs <= LATENCY_BUCKETS[3]) return "500-1000ms";
  return "1000ms+";
}

/**
 * GET /api/metrics - Get system-wide metrics
 * Returns: { totalSessions, totalRuns, totalCalls, approvalRate, avgLatency,
 *            totalTokens, uptime, tokensPerSession, latencyHistogram, providers }
 */
app.get("/", async (c) => {
  try {
    const { db } = getDb();

    // Get total sessions count
    const allSessions = await db.select().from(sessions).all();
    const totalSessions = allSessions.length;

    // Get total runs count
    const totalRuns = await db.select({ count: count() }).from(runs).get();

    // Get runs with latency, output, provider, and token data for calculations
    const runsWithData = await db
      .select({
        latencyMs: runs.latencyMs,
        outputJson: runs.outputJson,
        provider: runs.provider,
        tokensIn: runs.tokensIn,
        tokensOut: runs.tokensOut,
        sessionId: runs.sessionId,
      })
      .from(runs)
      .all();

    // Calculate total tokens
    const totalTokensIn = runsWithData.reduce(
      (sum, r) => sum + (r.tokensIn ?? 0),
      0,
    );
    const totalTokensOut = runsWithData.reduce(
      (sum, r) => sum + (r.tokensOut ?? 0),
      0,
    );
    const totalTokens = totalTokensIn + totalTokensOut;

    // Calculate tokens per session
    const tokensPerSession =
      totalSessions > 0 ? Math.round(totalTokens / totalSessions) : 0;

    // Calculate uptime in seconds
    const uptime = Math.floor((Date.now() - SERVER_START_TIME) / 1000);

    // Calculate average latency (only from runs with valid latency)
    const validRuns = runsWithData.filter(
      (r) => r.latencyMs != null && r.latencyMs > 0,
    );
    const avgLatency =
      validRuns.length > 0
        ? Math.round(
            validRuns.reduce((sum, r) => sum + (r.latencyMs || 0), 0) /
              validRuns.length,
          )
        : 0;

    // Calculate latency histogram
    const latencyHistogram: Record<string, number> = {
      "0-100ms": 0,
      "100-250ms": 0,
      "250-500ms": 0,
      "500-1000ms": 0,
      "1000ms+": 0,
    };
    for (const run of validRuns) {
      const bucket = getLatencyBucket(run.latencyMs ?? 0);
      latencyHistogram[bucket]++;
    }

    // Calculate approval rate (success rate)
    const successfulRuns = runsWithData.filter((r) => {
      try {
        const output =
          typeof r.outputJson === "string"
            ? JSON.parse(r.outputJson)
            : r.outputJson;
        return output?.ok === true || output?.code?.startsWith("OK_");
      } catch {
        return false;
      }
    });

    const totalRunsCount = totalRuns?.count ?? 0;
    const approvalRate =
      totalRunsCount > 0
        ? Math.round((successfulRuns.length / totalRunsCount) * 100)
        : 0;

    // Calculate provider metrics
    const providerGroups = runsWithData.reduce(
      (acc, run) => {
        const provider = run.provider || "unknown";
        if (!acc[provider]) {
          acc[provider] = [];
        }
        acc[provider].push(run);
        return acc;
      },
      {} as Record<string, typeof runsWithData>,
    );

    const providers = Object.entries(providerGroups).map(
      ([provider, providerRuns]) => {
        const providerValidRuns = providerRuns.filter(
          (r) => r.latencyMs != null && r.latencyMs > 0,
        );
        const providerSuccessful = providerRuns.filter((r) => {
          try {
            const output =
              typeof r.outputJson === "string"
                ? JSON.parse(r.outputJson)
                : r.outputJson;
            return output?.ok === true || output?.code?.startsWith("OK_");
          } catch {
            return false;
          }
        });

        const providerTokens = providerRuns.reduce(
          (sum, r) => sum + (r.tokensIn ?? 0) + (r.tokensOut ?? 0),
          0,
        );

        return {
          provider,
          totalCalls: providerRuns.length,
          successRate:
            providerRuns.length > 0
              ? Math.round(
                  (providerSuccessful.length / providerRuns.length) * 100,
                )
              : 0,
          avgLatency:
            providerValidRuns.length > 0
              ? Math.round(
                  providerValidRuns.reduce(
                    (sum, r) => sum + (r.latencyMs || 0),
                    0,
                  ) / providerValidRuns.length,
                )
              : 0,
          totalTokens: providerTokens,
        };
      },
    );

    return createSuccessResponse(c, {
      totalSessions,
      totalRuns: totalRuns?.count || 0,
      totalCalls: totalRuns?.count || 0, // Alias for totalRuns
      approvalRate, // Alias for successRate
      avgLatency,
      totalTokens,
      uptime,
      tokensPerSession,
      latencyHistogram,
      providers,
    });
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    return createInternalErrorResponse(c, "Failed to fetch metrics");
  }
});

export default app;
