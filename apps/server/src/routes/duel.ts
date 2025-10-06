import { Hono } from 'hono';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { sessions, runs, pipelineEvents, duels } from '@third-eye/db';
import { EyeOrchestrator } from '@third-eye/core';
import { ProviderFactory } from '@third-eye/providers';
import { getConfig } from '@third-eye/config';
import { eq } from 'drizzle-orm';
import type { ProviderId } from '@third-eye/types';
import { validateBody, schemas, rateLimit } from '../middleware/validation';

/**
 * Duel Mode API
 *
 * Run identical prompts through multiple provider/model combinations
 * for side-by-side comparison
 */

const app = new Hono();

// Apply rate limiting
app.use('*', rateLimit({ maxRequests: 50 })); // Lower limit for expensive duels

interface DuelConfig {
  providers: Array<{
    provider: ProviderId;
    model: string;
    label?: string;
  }>;
}

interface DuelResult {
  duelId: string;
  sessionId: string;
  runs: Array<{
    runId: string;
    provider: ProviderId;
    model: string;
    label: string;
  }>;
}

/**
 * POST /api/duel - Launch a duel between multiple provider/model combos
 */
app.post('/', async (c) => {
  try {
    const body = await c.req.json();
    const { eye, prompt, configs } = body as {
      eye: string;
      prompt: string;
      configs: DuelConfig['providers'];
    };

    if (!eye || !prompt || !configs || configs.length < 2) {
      return c.json(
        {
          error: 'Missing required fields: eye, prompt, configs (minimum 2)',
        },
        400
      );
    }

    if (configs.length > 4) {
      return c.json({ error: 'Maximum 4 provider/model combinations allowed' }, 400);
    }

    const { db } = getDb();
    const duelId = nanoid();
    const sessionId = `duel-${duelId}`;

    // Create session for this duel
    await db
      .insert(sessions)
      .values({
        id: sessionId,
        createdAt: new Date(),
        status: 'running',
        configJson: {
          type: 'duel',
          duelId,
          eye,
          prompt,
          configs,
        },
      })
      .run();

    // Create duel start event
    await db
      .insert(pipelineEvents)
      .values({
        id: nanoid(),
        sessionId,
        eye,
        type: 'duel_start',
        code: 'DUEL_STARTED',
        md: `Duel started with ${configs.length} competitors`,
        dataJson: { duelId, configs },
        nextAction: 'running',
        createdAt: new Date(),
      })
      .run();

    const orchestrator = new EyeOrchestrator();
    const runResults: DuelResult['runs'] = [];

    // Run each configuration in parallel
    const runPromises = configs.map(async (config, index) => {
      const runId = `${duelId}-${index}`;
      const label = config.label || `${config.provider}/${config.model}`;

      try {
        const startTime = Date.now();

        // Execute the Eye with this specific provider/model
        const appConfig = getConfig();
        const providerConfig = appConfig.providers[config.provider];

        if (!providerConfig) {
          throw new Error(`Provider ${config.provider} not configured`);
        }

        const provider = ProviderFactory.create(config.provider, providerConfig);

        // Call the Eye through orchestrator
        const result = await orchestrator.executeEye(eye, {
          prompt,
          provider: config.provider,
          model: config.model,
        });

        const latencyMs = Date.now() - startTime;

        // Store run result
        await db
          .insert(runs)
          .values({
            id: runId,
            sessionId,
            eye,
            provider: config.provider,
            model: config.model,
            inputMd: prompt,
            outputJson: result,
            tokensIn: result.tokensIn || null,
            tokensOut: result.tokensOut || null,
            latencyMs,
            createdAt: new Date(),
          })
          .run();

        // Create event for this run
        await db
          .insert(pipelineEvents)
          .values({
            id: nanoid(),
            sessionId,
            eye,
            type: 'eye_call',
            code: result.code || 'OK',
            md: result.md || `${label} completed`,
            dataJson: {
              duelId,
              runId,
              provider: config.provider,
              model: config.model,
              label,
              agent: label,
              latencyMs,
              tokensIn: result.tokensIn,
              tokensOut: result.tokensOut,
            },
            nextAction: 'completed',
            createdAt: new Date(),
          })
          .run();

        runResults.push({
          runId,
          provider: config.provider,
          model: config.model,
          label,
        });
      } catch (error) {
        console.error(`Duel run ${runId} failed:`, error);

        // Store failed run
        await db
          .insert(runs)
          .values({
            id: runId,
            sessionId,
            eye,
            provider: config.provider,
            model: config.model,
            inputMd: prompt,
            outputJson: {
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            tokensIn: null,
            tokensOut: null,
            latencyMs: null,
            createdAt: new Date(),
          })
          .run();

        // Create error event
        await db
          .insert(pipelineEvents)
          .values({
            id: nanoid(),
            sessionId,
            eye,
            type: 'eye_call',
            code: 'ERROR',
            md: `${label} failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            dataJson: {
              duelId,
              runId,
              provider: config.provider,
              model: config.model,
              label,
              agent: label,
              error: error instanceof Error ? error.message : 'Unknown error',
            },
            nextAction: 'failed',
            createdAt: new Date(),
          })
          .run();
      }
    });

    await Promise.all(runPromises);

    // Update session status
    await db
      .update(sessions)
      .set({ status: 'completed' })
      .where(eq(sessions.id, sessionId))
      .run();

    // Create duel complete event
    await db
      .insert(pipelineEvents)
      .values({
        id: nanoid(),
        sessionId,
        eye,
        type: 'duel_complete',
        code: 'DUEL_COMPLETED',
        md: `Duel completed with ${runResults.length} successful runs`,
        dataJson: { duelId, runs: runResults },
        nextAction: 'completed',
        createdAt: new Date(),
      })
      .run();

    // Broadcast via WebSocket
    try {
      const { wsManager } = await import('../websocket');
      wsManager.broadcast({
        type: 'duel_complete',
        sessionId,
        duelId,
        runs: runResults,
      });
    } catch (e) {
      console.debug('WebSocket broadcast skipped:', e);
    }

    return c.json({
      success: true,
      duelId,
      sessionId,
      runs: runResults,
    });
  } catch (error) {
    console.error('Duel failed:', error);
    return c.json(
      {
        error: `Failed to launch duel: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * GET /api/duel/:duelId - Get duel results
 */
app.get('/:duelId', async (c) => {
  try {
    const duelId = c.req.param('duelId');
    const sessionId = `duel-${duelId}`;

    const { db } = getDb();

    // Get session
    const session = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, sessionId))
      .limit(1)
      .all();

    if (session.length === 0) {
      return c.json({ error: 'Duel not found' }, 404);
    }

    // Get all runs for this duel
    const duelRuns = await db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .all();

    // Get all events for this duel
    const events = await db
      .select()
      .from(pipelineEvents)
      .where(eq(pipelineEvents.sessionId, sessionId))
      .all();

    return c.json({
      duelId,
      sessionId,
      session: session[0],
      runs: duelRuns,
      events,
    });
  } catch (error) {
    console.error('Failed to get duel results:', error);
    return c.json(
      {
        error: `Failed to get duel results: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * GET /api/duel - List all duels
 */
app.get('/', async (c) => {
  try {
    const { db } = getDb();

    const allSessions = await db
      .select()
      .from(sessions)
      .where(eq(sessions.id, 'duel-%'))
      .all();

    const duels = allSessions
      .filter((s) => s.id.startsWith('duel-'))
      .map((s) => ({
        duelId: s.id.replace('duel-', ''),
        sessionId: s.id,
        status: s.status,
        createdAt: s.createdAt,
        config: s.configJson,
      }));

    return c.json({ duels });
  } catch (error) {
    console.error('Failed to list duels:', error);
    return c.json(
      {
        error: `Failed to list duels: ${error instanceof Error ? error.message : 'Unknown error'}`,
      },
      500
    );
  }
});

/**
 * POST /api/duel/v2 - Start a new model comparison duel
 * Matches PRODUCTION_IMPLEMENTATION_CHECKLIST spec
 */
app.post('/v2', validateBody(schemas.duelCreate), async (c) => {
  try {
    const body = await c.req.json();
    const { eyeName, modelA, modelB, input, iterations = 5 } = body;

    if (!eyeName || !modelA || !modelB || !input) {
      return c.json({
        error: 'Missing required fields',
        required: ['eyeName', 'modelA', 'modelB', 'input'],
        optional: ['iterations'],
      }, 400);
    }

    const duelId = nanoid();
    const { db } = getDb();

    // Create duel record
    await db
      .insert(duels)
      .values({
        id: duelId,
        eyeName,
        modelA,
        modelB,
        input,
        iterations,
        status: 'pending',
        createdAt: new Date(),
      })
      .run();

    // Start duel execution in background
    executeDuel(duelId, eyeName, modelA, modelB, input, iterations).catch((error) => {
      console.error(`Duel ${duelId} failed:`, error);
    });

    return c.json({
      duelId,
      status: 'pending',
      message: 'Duel started',
    });
  } catch (error) {
    console.error('Failed to start duel:', error);
    return c.json({
      error: `Failed to start duel: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, 500);
  }
});

/**
 * GET /api/duel/:id/status - Get duel progress and status
 */
app.get('/:id/status', async (c) => {
  try {
    const duelId = c.req.param('id');
    const { db } = getDb();

    const duel = await db
      .select()
      .from(duels)
      .where(eq(duels.id, duelId))
      .get();

    if (!duel) {
      return c.json({ error: 'Duel not found' }, 404);
    }

    return c.json({
      duelId: duel.id,
      status: duel.status,
      eyeName: duel.eyeName,
      modelA: duel.modelA,
      modelB: duel.modelB,
      iterations: duel.iterations,
      createdAt: duel.createdAt,
      completedAt: duel.completedAt,
      winner: duel.winner,
      results: duel.results,
    });
  } catch (error) {
    console.error('Failed to get duel status:', error);
    return c.json({
      error: `Failed to get duel status: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, 500);
  }
});

/**
 * GET /api/duel/:id/results - Get final comparison matrix
 */
app.get('/:id/results', async (c) => {
  try {
    const duelId = c.req.param('id');
    const { db } = getDb();

    const duel = await db
      .select()
      .from(duels)
      .where(eq(duels.id, duelId))
      .get();

    if (!duel) {
      return c.json({ error: 'Duel not found' }, 404);
    }

    if (duel.status !== 'completed') {
      return c.json({
        error: 'Duel not yet completed',
        status: duel.status,
      }, 400);
    }

    return c.json({
      duelId: duel.id,
      winner: duel.winner,
      results: duel.results,
      eyeName: duel.eyeName,
      modelA: duel.modelA,
      modelB: duel.modelB,
      iterations: duel.iterations,
      createdAt: duel.createdAt,
      completedAt: duel.completedAt,
    });
  } catch (error) {
    console.error('Failed to get duel results:', error);
    return c.json({
      error: `Failed to get duel results: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }, 500);
  }
});

/**
 * Execute duel in background
 */
async function executeDuel(
  duelId: string,
  eyeName: string,
  modelA: string,
  modelB: string,
  input: string,
  iterations: number
) {
  const { db } = getDb();

  try {
    // Update status to running
    await db
      .update(duels)
      .set({ status: 'running' })
      .where(eq(duels.id, duelId))
      .run();

    const orchestrator = new EyeOrchestrator();
    const resultsA: any[] = [];
    const resultsB: any[] = [];

    // Run iterations
    for (let i = 0; i < iterations; i++) {
      try {
        // Run model A
        const resultA = await orchestrator.runEye(eyeName, { prompt: input, model: modelA });
        resultsA.push(resultA);

        // Run model B
        const resultB = await orchestrator.runEye(eyeName, { prompt: input, model: modelB });
        resultsB.push(resultB);
      } catch (error) {
        console.error(`Duel iteration ${i + 1} failed:`, error);
      }
    }

    // Calculate winner based on approval rates
    const approvalsA = resultsA.filter((r) => r.verdict === 'APPROVED').length;
    const approvalsB = resultsB.filter((r) => r.verdict === 'APPROVED').length;

    const avgLatencyA = resultsA.reduce((sum, r) => sum + (r.latencyMs || 0), 0) / resultsA.length;
    const avgLatencyB = resultsB.reduce((sum, r) => sum + (r.latencyMs || 0), 0) / resultsB.length;

    let winner: 'modelA' | 'modelB' | 'tie';
    if (approvalsA > approvalsB) {
      winner = 'modelA';
    } else if (approvalsB > approvalsA) {
      winner = 'modelB';
    } else {
      // Tie on approvals, use latency as tiebreaker
      winner = avgLatencyA < avgLatencyB ? 'modelA' : 'modelB';
    }

    const comparisonMatrix = {
      modelA: {
        approvals: approvalsA,
        avgLatency: Math.round(avgLatencyA),
        results: resultsA,
      },
      modelB: {
        approvals: approvalsB,
        avgLatency: Math.round(avgLatencyB),
        results: resultsB,
      },
    };

    // Update duel with results
    await db
      .update(duels)
      .set({
        status: 'completed',
        results: comparisonMatrix,
        winner,
        completedAt: new Date(),
      })
      .where(eq(duels.id, duelId))
      .run();

    console.log(`✅ Duel ${duelId} completed. Winner: ${winner}`);
  } catch (error) {
    console.error(`Duel ${duelId} execution failed:`, error);

    await db
      .update(duels)
      .set({ status: 'failed' })
      .where(eq(duels.id, duelId))
      .run();
  }
}

export default app;
