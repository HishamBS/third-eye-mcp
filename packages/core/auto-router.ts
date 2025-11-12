/**
 * Auto-Router - Intelligent Pipeline Routing
 *
 * Analyzes freeform tasks and routes them through the optimal Eye sequence
 * Phase 5: Integrated with ConversationTracker for narrative monitoring
 */

import type { EyeName } from '@third-eye/types';
import type { BaseEnvelope } from '@third-eye/eyes';
import { isRejected } from '@third-eye/eyes';
import { EyeId, EyeStatusCode } from '@third-eye/constants';
import { EyeOrchestrator } from './orchestrator';
import { orderGuard } from './order-guard';
import { ConversationTracker } from './conversation-tracker';
import type { Constraint } from './routing/routing-modes';
import { z } from 'zod';

export interface AutoRouterOptions {
  strictness?: Record<string, unknown>;
  context?: Record<string, unknown>;
  // Phase 1-A2: Three Routing Modes
  routingMode?: 'fully_dynamic' | 'constrained' | 'fixed';
  policyId?: string; // For constrained mode
  templateId?: string; // For fixed mode
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
  paused?: boolean;        // REPAIR_PLAN A3: Pipeline paused for human input
  pauseReason?: string;    // REPAIR_PLAN A3: Reason for pause
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
  private _orchestrator: EyeOrchestrator | null = null;

  private get orchestrator(): EyeOrchestrator {
    if (!this._orchestrator) {
      this._orchestrator = new EyeOrchestrator();
    }
    return this._orchestrator;
  }

  /**
   * Analyze a freeform task and determine optimal routing
   * Phase 3: Supports three routing modes (fully_dynamic, constrained, fixed)
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

    // Mark session as auto-router controlled BEFORE calling Overseer
    // This ensures Overseer bypasses order guard validation when called by auto-router
    orderGuard.markAsAutoRouterSession(actualSessionId);

    // Phase 3: Routing Mode Selection
    const routingMode = options.routingMode || 'fully_dynamic';

    // ========================================================================
    // Mode 1: Fixed Template - Use predefined eye sequence
    // ========================================================================
    if (routingMode === 'fixed' && options.templateId) {
      const { TemplateExecutor } = await import('./routing/template-executor');
      const { getDb } = await import('@third-eye/db');
      const { sqlite } = getDb();
      const templateExecutor = new TemplateExecutor(sqlite);

      const executionPlan = await templateExecutor.executeTemplate(options.templateId);

      return {
        sessionId: actualSessionId,
        taskType: 'text', // Template doesn't analyze task type
        complexity: 'medium',
        recommendedFlow: executionPlan.eyeSequence as EyeName[],
        reasoning: executionPlan.reasoning,
        estimatedSteps: executionPlan.eyeSequence.length,
      };
    }

    // ========================================================================
    // Mode 2 & 3: Call Overseer for dynamic routing
    // ========================================================================
    const { getAllActiveEyes } = await import('@third-eye/db/utils/lookups');
    const activeEyes = await getAllActiveEyes();

    // Find Overseer by name (case-insensitive match)
    let overseerName: string | null = null;
    for (const eye of activeEyes) {
      if (eye.name.toLowerCase() === EyeId.OVERSEER) {
        overseerName = eye.name;
        break;
      }
    }

    if (!overseerName) {
      throw new Error('Overseer eye not found in database');
    }

    // Enrich Overseer input with policy constraints if constrained mode
    let overseerInput = enrichedInput;
    if (routingMode === 'constrained' && options.policyId) {
      const { getDb } = await import('@third-eye/db');
      const { sqlite } = getDb();
      const policyRow = sqlite
        .prepare(
          `SELECT id, name, description, mandatory_eyes, forbidden_eyes, min_validation_eyes, security_required, always_confirm_intent
           FROM routing_policies
           WHERE id = ? AND is_active = 1`
        )
        .get(options.policyId) as {
        id: string;
        name: string;
        description: string | null;
        mandatory_eyes: string;
        forbidden_eyes: string | null;
        min_validation_eyes: number | null;
        security_required: number;
        always_confirm_intent: number;
      } | undefined;

      if (policyRow) {
        const policyDirective = [
          '\n\nROUTING POLICY CONSTRAINTS:',
          `Policy: ${policyRow.name}`,
          policyRow.description ? `Description: ${policyRow.description}` : '',
          `Mandatory Eyes: ${policyRow.mandatory_eyes}`,
          policyRow.forbidden_eyes ? `Forbidden Eyes: ${policyRow.forbidden_eyes}` : '',
          policyRow.min_validation_eyes !== null ? `Minimum Validation Eyes: ${policyRow.min_validation_eyes}` : '',
          policyRow.security_required ? 'Security validation REQUIRED' : '',
          policyRow.always_confirm_intent ? 'Intent confirmation REQUIRED (include Jōgan)' : '',
          '\nYou MUST respect these constraints when selecting eyes.',
        ]
          .filter(Boolean)
          .join('\n');

        overseerInput = `${overseerInput}${policyDirective}`;
      }
    }

    const overseerResult = await this.orchestrator.runEye(overseerName, overseerInput, actualSessionId);

    if (!overseerResult.ok) {
      throw new Error(`Overseer failed: ${overseerResult.code} - ${overseerResult.md || 'No details'}`);
    }

    const pipelineRoute = overseerResult.data?.pipelineRoute;
    if (!Array.isArray(pipelineRoute) || pipelineRoute.length === 0) {
      console.error('[AutoRouter] Overseer returned invalid pipeline route:', overseerResult.data);
      throw new Error('Overseer did not provide a valid pipelineRoute array');
    }

    // ========================================================================
    // Mode 2: Constrained Dynamic - Validate against policy
    // ========================================================================
    if (routingMode === 'constrained' && options.policyId) {
      const { PolicyValidator } = await import('./routing/policy-validator');
      const { getDb } = await import('@third-eye/db');
      const { sqlite } = getDb();

      // Load policy from database
      const policyRow = sqlite
        .prepare(
          `SELECT id, name, description, mandatory_eyes, forbidden_eyes, min_validation_eyes, security_required, always_confirm_intent, custom_constraints
           FROM routing_policies
           WHERE id = ? AND is_active = 1`
        )
        .get(options.policyId) as {
        id: string;
        name: string;
        description: string | null;
        mandatory_eyes: string;
        forbidden_eyes: string | null;
        min_validation_eyes: number | null;
        security_required: number;
        always_confirm_intent: number;
        custom_constraints: string | null;
      } | undefined;

      if (policyRow) {
        const policy = {
          id: policyRow.id,
          name: policyRow.name,
          description: policyRow.description ?? undefined,
          mandatoryEyes: JSON.parse(policyRow.mandatory_eyes) as string[],
          forbiddenEyes: policyRow.forbidden_eyes ? (JSON.parse(policyRow.forbidden_eyes) as string[]) : undefined,
          minValidationEyes: policyRow.min_validation_eyes ?? undefined,
          securityRequired: policyRow.security_required === 1,
          alwaysConfirmIntent: policyRow.always_confirm_intent === 1,
          customConstraints: policyRow.custom_constraints
            ? (JSON.parse(policyRow.custom_constraints) as Constraint[])
            : undefined,
          isActive: true,
          createdAt: Date.now(),
        };

        const validator = new PolicyValidator();
        const validationResult = validator.validateSequence(pipelineRoute as string[], policy);

        if (!validationResult.valid) {
          throw new Error(
            `Policy validation failed: ${validationResult.errors.join(', ')}`
          );
        }

        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          console.warn('[AutoRouter] Policy validation warnings:', validationResult.warnings);
        }
      }
    }

    return {
      sessionId: actualSessionId,
      taskType: (overseerResult.data.contentDomain as 'code' | 'text' | 'analysis') || 'text',
      complexity: (overseerResult.data.complexity as 'simple' | 'medium' | 'complex') || 'medium',
      recommendedFlow: pipelineRoute as EyeName[],
      reasoning: (overseerResult.data.routingReasoning as string) || 'Overseer-determined',
      estimatedSteps: pipelineRoute.length
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
      // Note: analyzeTask already marks the session as auto-router before calling Overseer
      const decision = routing || await this.analyzeTask(input, undefined, providedSessionId, options);

      const results: BaseEnvelope[] = [];
      let currentInput = input;
      const strictnessDirective = formatStrictnessDirective(options.strictness);

      // Import WebSocket bridge for real-time updates
      const { getWebSocketBridge } = await import('./websocket-registry');
      const ws = getWebSocketBridge();

      // Phase 5: Initialize ConversationTracker for narrative monitoring
      const { getDb } = await import('@third-eye/db');
      const { sqlite } = getDb();
      const conversationTracker = new ConversationTracker(sqlite);

      // Log routing decision
      conversationTracker.logRoutingDecision(
        decision.sessionId,
        decision.recommendedFlow,
        decision.reasoning
      );

      // Log human's initial input
      conversationTracker.logHumanMessage(decision.sessionId, input);

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

        // Phase 5: Log agent message from eye
        conversationTracker.logAgentMessage(
          decision.sessionId,
          eyeName,
          result.md || 'Eye completed execution',
          {
            code: result.code,
            ok: result.ok,
            step: i + 1,
            totalSteps: decision.recommendedFlow.length,
          }
        );

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

        // REPAIR_PLAN A3: Check for pause codes - BEFORE rejection check
        if (result.code === EyeStatusCode.E_NEEDS_CLARIFICATION) {
          const { PauseResumeManager } = await import('./pause-resume-manager');
          const { getDb } = await import('@third-eye/db');
          const { sqlite } = getDb();
          const pauseManager = new PauseResumeManager(sqlite);

          await pauseManager.pausePipeline({
            sessionId: decision.sessionId,
            currentEye: eyeName,
            reason: 'clarification',
            pendingData: result.data,
            expiresInMs: 24 * 60 * 60 * 1000 // 24 hours
          });

          conversationTracker.logPause(
            decision.sessionId,
            'clarification',
            `Eye ${eyeName} requested clarification`
          );

          // Emit pause event via WebSocket
          if (ws) {
            ws.broadcastToSession(decision.sessionId, {
              type: 'pipeline_paused',
              reason: 'clarification',
              eye: eyeName,
              timestamp: Date.now()
            });
          }

          return {
            sessionId: decision.sessionId,
            results,
            completed: false,
            paused: true,
            pauseReason: 'clarification'
          };
        }

        if (result.code === EyeStatusCode.E_INTENT_UNCONFIRMED) {
          const { PauseResumeManager } = await import('./pause-resume-manager');
          const { getDb } = await import('@third-eye/db');
          const { sqlite } = getDb();
          const pauseManager = new PauseResumeManager(sqlite);

          await pauseManager.pausePipeline({
            sessionId: decision.sessionId,
            currentEye: eyeName,
            reason: 'confirmation',
            pendingData: result.data,
            expiresInMs: 24 * 60 * 60 * 1000
          });

          conversationTracker.logPause(
            decision.sessionId,
            'confirmation',
            `Eye ${eyeName} requested intent confirmation`
          );

          if (ws) {
            ws.broadcastToSession(decision.sessionId, {
              type: 'pipeline_paused',
              reason: 'confirmation',
              eye: eyeName,
              timestamp: Date.now()
            });
          }

          return {
            sessionId: decision.sessionId,
            results,
            completed: false,
            paused: true,
            pauseReason: 'confirmation'
          };
        }

        // Only check isRejected AFTER checking pause codes
        if (isRejected(result)) {
          // Phase 5: Log error
          conversationTracker.logError(
            decision.sessionId,
            eyeName,
            `Pipeline rejected with code: ${result.code}`,
            { code: result.code, message: result.md }
          );

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

      // Phase 5: Log error to conversation tracker
      if (routing?.sessionId) {
        try {
          const { getDb } = await import('@third-eye/db');
          const { sqlite } = getDb();
          const conversationTracker = new ConversationTracker(sqlite);
          conversationTracker.logError(
            routing.sessionId,
            'auto-router',
            error instanceof Error ? error.message : 'Unknown error occurred during pipeline execution'
          );
        } catch {
          // Silently fail if logging fails - don't break error handling
        }
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

  /**
   * Resume flow after clarification or intent confirmation
   */
  async resumeFlow(
    sessionId: string,
    input?: string,
    options: AutoRouterOptions = {}
  ): Promise<AutoRoutingResult> {
    try {
      const { getResolvedFacts } = await import('@third-eye/eyes');
      const { canResumeAfterConfirmation } = await import('@third-eye/eyes');
      const { getIntentConfirmationStatus } = await import('@third-eye/eyes');

      // Check if there's a pending intent confirmation
      const confirmation = await getIntentConfirmationStatus(sessionId);
      if (confirmation) {
        const resumeStatus = canResumeAfterConfirmation(confirmation);
        if (!resumeStatus.canResume) {
          return {
            sessionId,
            results: [],
            completed: false,
            error: `Awaiting confirmation: ${resumeStatus.statusCode}`
          };
        }
      }

      // Get resolved facts from clarifications
      const resolvedFacts = await getResolvedFacts(sessionId);
      const factsSummary = Object.entries(resolvedFacts)
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');

      // Get state to determine what Eyes still need to run
      const state = orderGuard.getState(sessionId);
      if (!state) {
        return {
          sessionId,
          results: [],
          completed: true,
          error: 'No state found to resume'
        };
      }

      // Determine which Eyes still need to run based on phase and completed eyes
      const nextEyes = orderGuard.getExpectedNext(sessionId);
      if (!nextEyes || nextEyes.length === 0) {
        return {
          sessionId,
          results: [],
          completed: true,
          error: 'No pending Eyes to resume'
        };
      }

      // Build enriched input with clarifications
      const enrichedInput = input
        ? `${input}\n\nResolved Context:\n${factsSummary}`
        : `Resuming pipeline with resolved context:\n${factsSummary}`;

      // Execute remaining Eyes
      const remainingEyes = nextEyes;
      const results: BaseEnvelope[] = [];

      // Mark as auto-router controlled
      orderGuard.markAsAutoRouterSession(sessionId);

      // Phase 5: Initialize ConversationTracker and log resume
      const { getDb } = await import('@third-eye/db');
      const { sqlite } = getDb();
      const conversationTracker = new ConversationTracker(sqlite);
      conversationTracker.logResume(
        sessionId,
        `Pipeline resumed with ${remainingEyes.length} remaining eyes: ${remainingEyes.join(', ')}`,
        { resolvedFacts, remainingEyes }
      );

      // Import WebSocket bridge for real-time updates
      const { getWebSocketBridge } = await import('./websocket-registry');
      const ws = getWebSocketBridge();

      for (let i = 0; i < remainingEyes.length; i++) {
        const eyeName = remainingEyes[i];

        // Emit eye_started event
        if (ws) {
          ws.broadcastToSession(sessionId, {
            type: 'eye_started',
            eye: eyeName,
            step: state.completedEyes.length + i + 1,
            totalSteps: state.completedEyes.length + remainingEyes.length,
            timestamp: Date.now(),
          });
        }

        const result = await this.orchestrator.runEye(eyeName, enrichedInput, sessionId);
        results.push(result);

        // Phase 5: Log agent message from eye
        conversationTracker.logAgentMessage(
          sessionId,
          eyeName,
          result.md || 'Eye completed execution',
          {
            code: result.code,
            ok: result.ok,
            step: state.completedEyes.length + i + 1,
            totalSteps: state.completedEyes.length + remainingEyes.length,
            resumed: true,
          }
        );

        // Emit eye_complete event
        if (ws) {
          ws.broadcastToSession(sessionId, {
            type: 'eye_complete',
            eye: eyeName,
            step: state.completedEyes.length + i + 1,
            totalSteps: state.completedEyes.length + remainingEyes.length,
            result: {
              ok: result.ok,
              code: result.code,
              md: result.md?.substring(0, 200),
            },
            timestamp: Date.now(),
          });
        }

        if (isRejected(result)) {
          orderGuard.unmarkAsAutoRouterSession(sessionId);
          return {
            sessionId,
            results,
            completed: false,
            error: `Pipeline stopped: ${eyeName} rejected with ${result.code}`
          };
        }
      }

      // Unmark session after completion
      orderGuard.unmarkAsAutoRouterSession(sessionId);

      return {
        sessionId,
        results,
        completed: true
      };

    } catch (error) {
      return {
        sessionId,
        results: [],
        completed: false,
        error: `Resume failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

// Export singleton instance
export const autoRouter = new AutoRouter();
