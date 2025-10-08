import { Hono } from 'hono';
import { getDb } from '@third-eye/db';
import { runs } from '@third-eye/db';
import { sql, eq, and, gt, desc } from 'drizzle-orm';
import {
  validateBodyWithEnvelope,
  createSuccessResponse,
  createErrorResponse,
  createInternalErrorResponse,
  requestIdMiddleware,
  errorHandler
} from '../middleware/response';
import { z } from 'zod';

/**
 * Leaderboards API Routes
 *
 * Rankings of models by performance metrics
 */

const app = new Hono();

app.use('*', requestIdMiddleware());
app.use('*', errorHandler());

type LeaderboardCategory = 'fastest' | 'cheapest' | 'reliable' | 'popular' | 'quality';

interface LeaderboardEntry {
  rank: number;
  provider: string;
  model: string;
  score: number;
  totalRuns: number;
  avgLatency?: number;
  avgCost?: number;
  successRate?: number;
  avgTokens?: number;
}

// Get leaderboard rankings by category
app.get('/:category', async (c) => {
  try {
    const category = c.req.param('category') as LeaderboardCategory;
    const eye = c.req.query('eye'); // Optional filter by Eye
    const days = parseInt(c.req.query('days') || '30'); // Default 30 days
    const limit = parseInt(c.req.query('limit') || '10'); // Top 10 by default

    const { db } = getDb();

    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);

    // Build base query conditions
    const conditions = [gt(runs.createdAt, dateThreshold)];
    if (eye) {
      conditions.push(eq(runs.eye, eye));
    }

    // Fetch all runs in time range
    const allRuns = await db
      .select()
      .from(runs)
      .where(and(...conditions))
      .all();

    if (allRuns.length === 0) {
      return createSuccessResponse(c, {
        category,
        eye: eye || 'all',
        timeRange: days,
        rankings: [],
        message: 'No data available for the selected time range',
      });
    }

    // Group by provider + model
    const grouped = allRuns.reduce((acc, run) => {
      const key = `${run.provider}|${run.model}`;
      if (!acc[key]) {
        acc[key] = {
          provider: run.provider,
          model: run.model,
          runs: [],
        };
      }
      acc[key].runs.push(run);
      return acc;
    }, {} as Record<string, { provider: string; model: string; runs: typeof allRuns }>);

    // Calculate metrics for each provider/model combo
    const entries: LeaderboardEntry[] = Object.values(grouped).map((group) => {
      const totalRuns = group.runs.length;
      const latencies = group.runs.map((r) => r.latencyMs || 0);
      const tokens = group.runs.map((r) => (r.tokensIn || 0) + (r.tokensOut || 0));
      const costs = group.runs.map((r) => {
        const totalTokens = (r.tokensIn || 0) + (r.tokensOut || 0);
        // Rough cost estimate: $0.001 per 1K tokens (adjust per provider)
        return (totalTokens / 1000) * 0.001;
      });

      const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length;
      const avgTokens = tokens.reduce((a, b) => a + b, 0) / tokens.length;
      const avgCost = costs.reduce((a, b) => a + b, 0) / costs.length;

      // Success rate: assume success if latencyMs exists
      const successCount = group.runs.filter((r) => r.latencyMs !== null).length;
      const successRate = successCount / totalRuns;

      return {
        rank: 0, // Will be assigned after sorting
        provider: group.provider,
        model: group.model,
        score: 0, // Will be calculated based on category
        totalRuns,
        avgLatency,
        avgCost,
        successRate,
        avgTokens,
      };
    });

    // Calculate score and sort based on category
    let sorted: LeaderboardEntry[];

    switch (category) {
      case 'fastest':
        // Lower latency = better
        sorted = entries
          .map((e) => ({
            ...e,
            score: e.avgLatency || Infinity,
          }))
          .sort((a, b) => a.score - b.score);
        break;

      case 'cheapest':
        // Lower cost = better
        sorted = entries
          .map((e) => ({
            ...e,
            score: e.avgCost || Infinity,
          }))
          .sort((a, b) => a.score - b.score);
        break;

      case 'reliable':
        // Higher success rate = better
        sorted = entries
          .map((e) => ({
            ...e,
            score: (e.successRate || 0) * 100,
          }))
          .sort((a, b) => b.score - a.score);
        break;

      case 'popular':
        // More runs = better
        sorted = entries
          .map((e) => ({
            ...e,
            score: e.totalRuns,
          }))
          .sort((a, b) => b.score - a.score);
        break;

      case 'quality':
        // Composite score: reliability + speed + cost
        sorted = entries
          .map((e) => {
            const reliabilityScore = (e.successRate || 0) * 100;
            const speedScore = 100 - Math.min((e.avgLatency || 0) / 100, 100);
            const costScore = 100 - Math.min((e.avgCost || 0) * 10000, 100);
            const compositeScore = (reliabilityScore + speedScore + costScore) / 3;
            return {
              ...e,
              score: compositeScore,
            };
          })
          .sort((a, b) => b.score - a.score);
        break;

      default:
        return createErrorResponse(c, { title: 'Invalid Category', status: 400, detail: 'Supported categories: fastest, cheapest, reliable, popular, quality' });
    }

    // Assign ranks and limit to top N
    const rankings = sorted.slice(0, limit).map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

    return createSuccessResponse(c, {
      category,
      eye: eye || 'all',
      timeRange: days,
      total: entries.length,
      rankings,
    });
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return createInternalErrorResponse(c, 'Failed to fetch leaderboard');
  }
});

// Get all categories summary
app.get('/', async (c) => {
  try {
    const days = parseInt(c.req.query('days') || '30');

    const categories: LeaderboardCategory[] = ['fastest', 'cheapest', 'reliable', 'popular', 'quality'];
    const summaries = [];

    for (const category of categories) {
      // Fetch top 3 for each category
      const response = await fetch(
        `http://localhost:7070/api/leaderboards/${category}?days=${days}&limit=3`
      );
      const data = await response.json();

      summaries.push({
        category,
        topThree: data.rankings || [],
      });
    }

    return createSuccessResponse(c, {
      timeRange: days,
      categories: summaries,
    });
  } catch (error) {
    console.error('Failed to fetch leaderboard summary:', error);
    return createInternalErrorResponse(c, 'Failed to fetch leaderboard summary');
  }
});

// Get trending models (biggest changes in rankings)
app.get('/trending/models', async (c) => {
  try {
    const { db } = getDb();

    // Get runs from last 7 days vs previous 7 days
    const now = new Date();
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const previous7Days = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

    const recentRuns = await db
      .select()
      .from(runs)
      .where(gt(runs.createdAt, last7Days))
      .all();

    const previousRuns = await db
      .select()
      .from(runs)
      .where(and(
        gt(runs.createdAt, previous7Days),
        sql`${runs.createdAt} <= ${last7Days}`
      ))
      .all();

    // Calculate usage change
    const recentCounts = recentRuns.reduce((acc, run) => {
      const key = `${run.provider}|${run.model}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const previousCounts = previousRuns.reduce((acc, run) => {
      const key = `${run.provider}|${run.model}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const trending = Object.keys({ ...recentCounts, ...previousCounts }).map((key) => {
      const [provider, model] = key.split('|');
      const recent = recentCounts[key] || 0;
      const previous = previousCounts[key] || 0;
      const change = previous === 0 ? 100 : ((recent - previous) / previous) * 100;

      return {
        provider,
        model,
        recentRuns: recent,
        previousRuns: previous,
        changePercent: Math.round(change),
        trend: change > 5 ? 'up' : change < -5 ? 'down' : 'stable',
      };
    });

    // Sort by absolute change
    const sorted = trending.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));

    return createSuccessResponse(c, {
      trending: sorted.slice(0, 10),
    });
  } catch (error) {
    console.error('Failed to fetch trending models:', error);
    return createInternalErrorResponse(c, 'Failed to fetch trending models');
  }
});

export default app;
