/**
 * Auto-Router - Intelligent Pipeline Routing
 *
 * Analyzes freeform tasks and routes them through the optimal Eye sequence
 */

import type { EyeName, BaseEnvelope } from '@third-eye/eyes';
import { isRejected } from '@third-eye/eyes';
import { EyeOrchestrator } from './orchestrator';
import { orderGuard } from './order-guard';
import { z } from 'zod';

export interface AutoRouterOptions {
  strictness?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

const STRICTNESS_HEADER = 'STRICTNESS CONTROLS (from UI):';

const STRICTNESS_LABELS: Record<string, string> = {
  ambiguityThreshold: 'Ambiguity Threshold (0-100, lower = stricter)',
  citationCutoff: 'Citation Confidence Cutoff (0-100%)',
  consistencyTolerance: 'Consistency Tolerance (0-100, lower = stricter)',
  mangekyoStrictness: 'Mangekyō Code Review Minimum (%)',
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatStrictnessDirective(strictness?: Record<string, unknown>): string | null {
  if (!strictness || !isPlainObject(strictness)) {
    return null;
  }

  const lines: string[] = [];

  for (const [key, label] of Object.entries(STRICTNESS_LABELS)) {
    const value = strictness[key];
    if (typeof value === 'number') {
      const formatted = key === 'citationCutoff' ? `${value}%` : value;
      lines.push(`- ${label}: ${formatted}`);
    }
  }

  for (const [key, value] of Object.entries(strictness)) {
    if (key in STRICTNESS_LABELS) continue;
    if (typeof value === 'number' || typeof value === 'string') {
      lines.push(`- ${key}: ${value}`);
    } else if (value !== undefined) {
      lines.push(`- ${key}: ${JSON.stringify(value)}`);
    }
  }

  if (lines.length === 0) {
    return null;
  }

  return [
    STRICTNESS_HEADER,
    ...lines,
    'Apply these thresholds when selecting eyes, requesting clarifications, and validating outputs.',
  ].join('\n');
}

function formatContextDirective(context?: Record<string, unknown>): string | null {
  if (!context || !isPlainObject(context) || Object.keys(context).length === 0) {
    return null;
  }

  try {
    return `SESSION CONTEXT (JSON):\n${JSON.stringify(context, null, 2)}`;
  } catch (error) {
    console.warn('[AutoRouter] Failed to serialize session context for prompt enrichment:', error);
    return null;
  }
}

export interface RoutingDecision {
  sessionId: string;
  taskType: 'code' | 'text' | 'analysis';
  complexity: 'simple' | 'medium' | 'complex';
  recommendedFlow: EyeName[];
  reasoning: string;
  estimatedSteps: number;
}

export interface AutoRoutingResult {
  sessionId: string;
  results: BaseEnvelope[];
  completed: boolean;
  error?: string;
}

const SharinganAnalysisSchema = z.object({
  data: z
    .object({
      isCodeRelated: z.boolean().optional(),
      complexity: z.enum(['simple', 'medium', 'complex']).optional(),
      outputForNext: z.string().optional(),
    })
    .partial()
    .optional(),
});

const NextInputSchema = z.object({
  outputForNext: z.string().optional(),
});

/**
 * Intelligent router that analyzes tasks and executes optimal Eye pipelines
 */
export class AutoRouter {
  private orchestrator: EyeOrchestrator;

  constructor() {
    this.orchestrator = new EyeOrchestrator();
  }

  /**
   * Analyze a freeform task and determine optimal routing
   */
  async analyzeTask(
    input: string,
    sessionId?: string,
    providedSessionId?: string,
    options: AutoRouterOptions = {}
  ): Promise<RoutingDecision> {
    const strictnessDirective = formatStrictnessDirective(options.strictness);
    const contextDirective = formatContextDirective(options.context);
    const enrichedInput = [input, strictnessDirective, contextDirective]
      .filter(Boolean)
      .join('\n\n');

    let actualSessionId = sessionId || providedSessionId;

    if (!actualSessionId) {
      const bootstrapConfig: Record<string, unknown> = {
        agentName: 'Auto-Router',
        displayName: 'Auto-Router Session',
      };

      if (options.strictness && isPlainObject(options.strictness)) {
        bootstrapConfig.strictness = options.strictness;
      }

      if (options.context && isPlainObject(options.context)) {
        bootstrapConfig.context = options.context;
      }

      const session = await this.orchestrator.createSession(bootstrapConfig);
      actualSessionId = session.sessionId;
    }

    // Call Overseer Eye to get dynamic pipeline routing
    const overseerResult = await this.orchestrator.runEye('overseer', enrichedInput, actualSessionId);

    if (!overseerResult.ok) {
      throw new Error(`Overseer failed: ${overseerResult.code} - ${overseerResult.md || 'No details'}`);
    }

    const pipelineRoute = overseerResult.data?.pipelineRoute;
    if (!Array.isArray(pipelineRoute) || pipelineRoute.length === 0) {
      console.error('[AutoRouter] Overseer returned invalid pipeline route:', overseerResult.data);
      throw new Error('Overseer did not provide a valid pipelineRoute array');
    }

    return {
      sessionId: actualSessionId,
      taskType: (overseerResult.data.contentDomain as 'code' | 'text' | 'analysis') || 'text',
      complexity: (overseerResult.data.complexity as 'simple' | 'medium' | 'complex') || 'medium',
      recommendedFlow: pipelineRoute as EyeName[],
      reasoning: (overseerResult.data.routingReasoning as string) || 'Overseer-determined',
      estimatedSteps: (pipelineRoute as any[]).length
    };
  }

  /**
   * Execute complete pipeline based on routing decision
   */
  async executeFlow(
    input: string,
    routing?: RoutingDecision,
    providedSessionId?: string,
    options: AutoRouterOptions = {}
  ): Promise<AutoRoutingResult> {
    try {
      // NOTE: We DO NOT reject generation requests
      // Instead, we route through Sharingan → asks clarifying questions
      // Then through the full pipeline to GUIDE the agent step-by-step

      // Analyze task if no routing provided
      const decision = routing || await this.analyzeTask(input, undefined, providedSessionId, options);

      // Mark session as auto-router controlled to bypass order guard validation
      // Auto-router already knows the correct Eye sequence
      orderGuard.markAsAutoRouterSession(decision.sessionId);

      const results: BaseEnvelope[] = [];
      let currentInput = input;
      const strictnessDirective = formatStrictnessDirective(options.strictness);

      // Import WebSocket bridge for real-time updates
      const { getWebSocketBridge } = await import('./websocket-registry');
      const ws = getWebSocketBridge();

      // Execute each Eye in the recommended flow
      for (let i = 0; i < decision.recommendedFlow.length; i++) {
        const eyeName = decision.recommendedFlow[i];

        // Emit eye_started event
        if (ws) {
          ws.broadcastToSession(decision.sessionId, {
            type: 'eye_started',
            eye: eyeName,
            step: i + 1,
            totalSteps: decision.recommendedFlow.length,
            timestamp: Date.now(),
          });
        }

        const runInput = strictnessDirective && !currentInput.includes(STRICTNESS_HEADER)
          ? `${currentInput}\n\n${strictnessDirective}`
          : currentInput;

        const result = await this.orchestrator.runEye(eyeName, runInput, decision.sessionId);
        results.push(result);

        // Emit eye_complete event
        if (ws) {
          ws.broadcastToSession(decision.sessionId, {
            type: 'eye_complete',
            eye: eyeName,
            step: i + 1,
            totalSteps: decision.recommendedFlow.length,
            result: {
              ok: result.ok,
              code: result.code,
              md: result.md?.substring(0, 200), // Truncate for WebSocket
            },
            timestamp: Date.now(),
          });
        }

        if (isRejected(result)) {
          return {
            sessionId: decision.sessionId,
            results,
            completed: false,
            error: `Pipeline stopped: ${eyeName} rejected with ${result.code}`
          };
        }

        const nextInput = NextInputSchema.safeParse(result.data);
        if (nextInput.success && nextInput.data.outputForNext) {
          currentInput = nextInput.data.outputForNext;
        }
      }

      // Unmark session after successful completion
      // Future direct Eye calls should be validated
      orderGuard.unmarkAsAutoRouterSession(decision.sessionId);

      return {
        sessionId: decision.sessionId,
        results,
        completed: true
      };

    } catch (error) {
      // Unmark session on error too
      if (routing?.sessionId) {
        orderGuard.unmarkAsAutoRouterSession(routing.sessionId);
      }

      return {
        sessionId: routing?.sessionId || 'unknown',
        results: [],
        completed: false,
        error: `Auto-routing failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }


  /**
   * Get current pipeline state for session
   */
  getSessionState(sessionId: string) {
    return orderGuard.getState(sessionId);
  }

  /**
   * Get expected next Eyes for session
   */
  getExpectedNext(sessionId: string): EyeName[] {
    return orderGuard.getExpectedNext(sessionId);
  }
}

// Export singleton instance
export const autoRouter = new AutoRouter();
