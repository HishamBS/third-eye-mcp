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
 * GET /api/metrics - Get system-wide metrics
 * Returns: { totalSessions, totalRuns, approvalRate, avgLatency }
 */
app.get("/", async (c) => {
  try {
    const { db } = getDb();

    // Get total sessions count
    const allSessions = await db.select().from(sessions).all();

    // Get total runs count
    const totalRuns = await db.select({ count: count() }).from(runs).get();

    // Get runs with latency and output data for calculations
    const runsWithLatency = await db
      .select({
        latencyMs: runs.latencyMs,
        outputJson: runs.outputJson,
      })
      .from(runs)
      .all();

    // Calculate average latency (only from runs with valid latency)
    const validRuns = runsWithLatency.filter(
      (r) => r.latencyMs != null && r.latencyMs > 0,
    );
    const avgLatency =
      validRuns.length > 0
        ? Math.round(
            validRuns.reduce((sum, r) => sum + (r.latencyMs || 0), 0) /
              validRuns.length,
          )
        : 0;

    // Calculate approval rate (success rate)
    const successfulRuns = runsWithLatency.filter((r) => {
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

    const approvalRate =
      totalRuns?.count > 0
        ? Math.round((successfulRuns.length / totalRuns.count) * 100)
        : 0;

    return createSuccessResponse(c, {
      totalSessions: allSessions.length,
      totalRuns: totalRuns?.count || 0,
      totalCalls: totalRuns?.count || 0, // Alias for totalRuns
      approvalRate, // Alias for successRate
      avgLatency,
    });
  } catch (error) {
    console.error("Failed to fetch metrics:", error);
    return createInternalErrorResponse(c, "Failed to fetch metrics");
  }
});

export default app;
