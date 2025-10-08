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
  async analyzeTask(input: string, sessionId?: string, providedSessionId?: string): Promise<RoutingDecision> {
    const actualSessionId = sessionId || providedSessionId || (await this.orchestrator.createSession({ agentName: 'Auto-Router', displayName: 'Auto-Router Session' })).sessionId;

    // Use Sharingan to analyze task characteristics
    const analysis = await this.orchestrator.runEye('sharingan', input, actualSessionId);

    // Determine task type and complexity from Sharingan response
    const isCodeRelated = this.detectCodeTask(input, analysis);
    const complexity = this.assessComplexity(input, analysis);

    // Build recommended flow based on analysis
    const recommendedFlow = this.buildOptimalFlow(isCodeRelated, complexity, analysis);

    return {
      sessionId: actualSessionId,
      taskType: isCodeRelated ? 'code' : (this.isAnalysisTask(input) ? 'analysis' : 'text'),
      complexity,
      recommendedFlow,
      reasoning: this.explainRouting(isCodeRelated, complexity, analysis),
      estimatedSteps: recommendedFlow.length
    };
  }

  /**
   * Execute complete pipeline based on routing decision
   */
  async executeFlow(input: string, routing?: RoutingDecision, providedSessionId?: string): Promise<AutoRoutingResult> {
    try {
      // NOTE: We DO NOT reject generation requests
      // Instead, we route through Sharingan → asks clarifying questions
      // Then through the full pipeline to GUIDE the agent step-by-step

      // Analyze task if no routing provided
      const decision = routing || await this.analyzeTask(input, undefined, providedSessionId);

      // Mark session as auto-router controlled to bypass order guard validation
      // Auto-router already knows the correct Eye sequence
      orderGuard.markAsAutoRouterSession(decision.sessionId);

      const results: BaseEnvelope[] = [];
      let currentInput = input;

      // Execute each Eye in the recommended flow
      for (const eyeName of decision.recommendedFlow) {
        const result = await this.orchestrator.runEye(eyeName, currentInput, decision.sessionId);
        results.push(result);

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
   * Detect if task is code-related
   */
  private detectCodeTask(input: string, analysis: BaseEnvelope): boolean {
    const parsed = SharinganAnalysisSchema.safeParse(analysis);
    const isCodeRelated = parsed.success ? parsed.data.data?.isCodeRelated : undefined;
    if (typeof isCodeRelated === 'boolean') {
      return isCodeRelated;
    }

    // Fallback keyword detection
    const codeKeywords = [
      'implement', 'code', 'function', 'class', 'API', 'database',
      'component', 'service', 'endpoint', 'test', 'debug', 'fix',
      'refactor', 'optimize', 'deploy', 'build', 'compile'
    ];

    const lowerInput = input.toLowerCase();
    return codeKeywords.some(keyword => lowerInput.includes(keyword));
  }

  /**
   * Assess task complexity
   */
  private assessComplexity(input: string, analysis: BaseEnvelope): 'simple' | 'medium' | 'complex' {
    const parsed = SharinganAnalysisSchema.safeParse(analysis);
    const providedComplexity = parsed.success ? parsed.data.data?.complexity : undefined;
    if (providedComplexity) {
      return providedComplexity;
    }

    // Heuristic complexity assessment
    const wordCount = input.split(/\s+/).length;
    const hasMultipleSteps = /\b(and|then|also|additionally|furthermore)\b/i.test(input);
    const hasSpecificRequirements = input.includes('requirements') || input.includes('must');

    if (wordCount > 50 || hasMultipleSteps || hasSpecificRequirements) {
      return 'complex';
    } else if (wordCount > 20 || input.includes('with') || input.includes('using')) {
      return 'medium';
    } else {
      return 'simple';
    }
  }

  /**
   * Check if task is analysis/review focused
   */
  private isAnalysisTask(input: string): boolean {
    const analysisKeywords = [
      'analyze', 'review', 'check', 'validate', 'verify', 'audit',
      'examine', 'assess', 'evaluate', 'investigate'
    ];

    const lowerInput = input.toLowerCase();
    return analysisKeywords.some(keyword => lowerInput.includes(keyword));
  }

  /**
   * Build optimal Eye flow based on task characteristics
   */
  private buildOptimalFlow(isCodeRelated: boolean, complexity: string, analysis: any): EyeName[] {
    const flow: EyeName[] = [];

    // NOTE: Sharingan was already executed in analyzeTask(), so we DON'T include it here

    // Add prompt optimization for complex tasks
    if (complexity === 'complex' || analysis.confidence < 80) {
      flow.push('prompt-helper');
    }

    // Intent confirmation
    flow.push('jogan');

    // Branch based on task type
    if (isCodeRelated) {
      // Code branch: planning -> implementation -> review
      flow.push('rinnegan');  // Plan requirements

      if (complexity !== 'simple') {
        flow.push('mangekyo');  // Implementation phases
        flow.push('rinnegan');  // Review and approval
      }
    } else {
      // Text branch: optional planning -> analysis -> consistency check
      if (complexity === 'complex') {
        flow.push('rinnegan');  // Optional planning for complex text
      }

      flow.push('tenseigan');  // Evidence validation
      flow.push('byakugan');   // Consistency check
    }

    // Final approval for complex tasks
    if (complexity === 'complex') {
      flow.push('rinnegan');  // Final approval
    }

    return flow;
  }

  /**
   * Explain routing decision
   */
  private explainRouting(isCodeRelated: boolean, complexity: string, analysis: any): string {
    const taskType = isCodeRelated ? 'code implementation' : 'text analysis';
    const complexityNote = complexity === 'complex' ? 'complex' : complexity === 'medium' ? 'moderate' : 'simple';

    return `Detected ${complexityNote} ${taskType} task. ` +
           `Following ${isCodeRelated ? 'code branch' : 'text branch'} pipeline. ` +
           `Confidence: ${analysis.confidence || 'unknown'}%`;
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
