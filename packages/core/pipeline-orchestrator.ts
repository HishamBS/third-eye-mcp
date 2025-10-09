/**
 * Intelligent Pipeline Orchestrator
 *
 * Smart orchestration system that can handle any pipeline design:
 * - Default pipelines for common scenarios
 * - Custom user-defined pipelines
 * - Dynamic branching based on Eye responses
 * - Auto-routing with context awareness
 */

import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { pipelines, pipelineRuns, sessions, runs } from '@third-eye/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { EyeOrchestrator } from './orchestrator';
import type { EyeName, EyeResponse, BaseEnvelope } from '@third-eye/eyes';

export interface PipelineStep {
  eye: EyeName;
  condition?: 'always' | 'if_approved' | 'if_rejected' | 'if_needs_input';
  branches?: {
    approved?: EyeName[];
    rejected?: EyeName[];
    needs_input?: EyeName[];
  };
  metadata?: Record<string, any>;
}

export interface PipelineDefinition {
  id: string;
  name: string;
  description: string;
  steps: PipelineStep[];
  taskTypes: ('code' | 'text' | 'general')[];
  isDefault: boolean;
  version: number;
}

export interface PipelineExecutionContext {
  sessionId: string;
  pipelineId?: string;
  taskType?: 'code' | 'text' | 'general';
  autoRoute?: boolean;
  customSteps?: PipelineStep[];
}

function responseVerdict(response: EyeResponse): 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT' {
  if (response.ok) {
    return 'APPROVED';
  }
  if (response.code.startsWith('NEED_')) {
    return 'NEEDS_INPUT';
  }
  return 'REJECTED';
}

function responseSuggestions(response: EyeResponse): string[] {
  for (const [key, value] of Object.entries(response.data)) {
    if (key === 'suggestions' && Array.isArray(value) && value.every(item => typeof item === 'string')) {
      return value;
    }
  }
  return [];
}

function responseSummary(response: EyeResponse): string {
  for (const [key, value] of Object.entries(response.data)) {
    if (key === 'summary' && typeof value === 'string') {
      return value;
    }
    if (key === 'summary_md' && typeof value === 'string') {
      return value;
    }
  }
  const firstLine = response.md.split('\n')[0]?.trim();
  return firstLine?.length ? firstLine : response.md;
}

function isNeedsInput(response: EyeResponse): boolean {
  return responseVerdict(response) === 'NEEDS_INPUT';
}

function isRejected(response: EyeResponse): boolean {
  return responseVerdict(response) === 'REJECTED';
}

export interface PipelineExecutionResult {
  runId: string;
  sessionId: string;
  pipelineId?: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  currentStep: number;
  totalSteps: number;
  results: EyeResponse[];
  nextSuggestions?: EyeName[];
  error?: string;
}

// Default pipeline definitions
const DEFAULT_PIPELINES: PipelineDefinition[] = [
  {
    id: 'default-code',
    name: 'Code Review Pipeline',
    description: 'Complete code review workflow with all gates',
    taskTypes: ['code'],
    isDefault: true,
    version: 1,
    steps: [
      { eye: 'overseer', condition: 'always' },
      {
        eye: 'sharingan',
        condition: 'always',
        branches: {
          approved: ['jogan'],
          rejected: ['prompt-helper'],
          needs_input: ['prompt-helper']
        }
      },
      { eye: 'prompt-helper', condition: 'if_rejected' },
      { eye: 'jogan', condition: 'always' },
      { eye: 'rinnegan', condition: 'if_approved' },
      { eye: 'mangekyo', condition: 'if_approved' },
      { eye: 'rinnegan', condition: 'if_approved' } // Final approval
    ]
  },
  {
    id: 'default-text',
    name: 'Text Validation Pipeline',
    description: 'Evidence and consistency validation for text content',
    taskTypes: ['text'],
    isDefault: true,
    version: 1,
    steps: [
      { eye: 'overseer', condition: 'always' },
      {
        eye: 'sharingan',
        condition: 'always',
        branches: {
          approved: ['jogan'],
          rejected: ['prompt-helper']
        }
      },
      { eye: 'prompt-helper', condition: 'if_rejected' },
      { eye: 'jogan', condition: 'always' },
      { eye: 'rinnegan', condition: 'if_approved' },
      { eye: 'tenseigan', condition: 'if_approved' },
      { eye: 'byakugan', condition: 'if_approved' },
      { eye: 'rinnegan', condition: 'if_approved' } // Final approval
    ]
  },
  {
    id: 'quick-review',
    name: 'Quick Review',
    description: 'Fast-track pipeline for simple tasks',
    taskTypes: ['general'],
    isDefault: false,
    version: 1,
    steps: [
      { eye: 'overseer', condition: 'always' },
      { eye: 'sharingan', condition: 'always' },
      { eye: 'jogan', condition: 'if_approved' },
      { eye: 'rinnegan', condition: 'if_approved' }
    ]
  }
];

export class PipelineOrchestrator {
  private static instance: PipelineOrchestrator | null = null;
  private db;
  private eyeOrchestrator: EyeOrchestrator;

  constructor() {
    const { db } = getDb();
    this.db = db;
    this.eyeOrchestrator = new EyeOrchestrator();
  }

  static getInstance(): PipelineOrchestrator {
    if (!PipelineOrchestrator.instance) {
      PipelineOrchestrator.instance = new PipelineOrchestrator();
    }
    return PipelineOrchestrator.instance;
  }

  /**
   * Execute a complete pipeline with intelligent routing
   */
  async executePipeline(
    input: string,
    context: PipelineExecutionContext
  ): Promise<PipelineExecutionResult> {
    const runId = nanoid();
    const startTime = Date.now();

    try {
      // Determine pipeline to use
      const pipeline = await this.resolvePipeline(context);

      // Create pipeline run record
      await this.createPipelineRun(runId, context.sessionId, pipeline.id);

      const results: EyeResponse[] = [];
      let currentStepIndex = 0;
      let currentInput = input;

      // Execute pipeline steps
      for (let i = 0; i < pipeline.steps.length; i++) {
        const step = pipeline.steps[i];
        currentStepIndex = i;

        // Check if step should be executed
        if (!this.shouldExecuteStep(step, results)) {
          continue;
        }

        // Execute Eye
        const result = await this.eyeOrchestrator.runEye(
          step.eye,
          currentInput,
          context.sessionId
        );

        results.push(result);

        // Update pipeline run
        await this.updatePipelineRun(runId, {
          currentStep: currentStepIndex,
          stateJson: { results, currentInput }
        });

        // Determine next step based on result
        const nextSteps = this.determineNextSteps(step, result, pipeline.steps, i);

        // If branching is needed, modify the pipeline steps
        if (nextSteps.length > 0 && nextSteps[0] !== pipeline.steps[i + 1]?.eye) {
          // Dynamic pipeline modification based on Eye response
          const remainingSteps = this.createDynamicSteps(nextSteps, pipeline.steps.slice(i + 1));
          pipeline.steps = [...pipeline.steps.slice(0, i + 1), ...remainingSteps];
        }

        // Update input for next step (could be enhanced with result processing)
        const suggestions = responseSuggestions(result);
        if (isNeedsInput(result) && suggestions.length > 0) {
          currentInput = this.enhanceInputWithSuggestions(currentInput, suggestions);
        }

        // Early termination conditions
        if (isRejected(result) && !step.branches?.rejected) {
          const summary = responseSummary(result);
          await this.completePipelineRun(runId, 'failed', `Pipeline failed at ${step.eye}: ${summary}`);

          return {
            runId,
            sessionId: context.sessionId,
            pipelineId: pipeline.id,
            status: 'failed',
            currentStep: currentStepIndex,
            totalSteps: pipeline.steps.length,
            results,
            error: `Pipeline failed at ${step.eye}: ${summary}`
          };
        }
      }

      // Pipeline completed successfully
      await this.completePipelineRun(runId, 'completed');

      return {
        runId,
        sessionId: context.sessionId,
        pipelineId: pipeline.id,
        status: 'completed',
        currentStep: pipeline.steps.length,
        totalSteps: pipeline.steps.length,
        results
      };

    } catch (error) {
      await this.completePipelineRun(runId, 'failed', error instanceof Error ? error.message : 'Unknown error');

      return {
        runId,
        sessionId: context.sessionId,
        status: 'failed',
        currentStep: 0,
        totalSteps: 0,
        results: [],
        error: error instanceof Error ? error.message : 'Pipeline execution failed'
      };
    }
  }

  /**
   * Get intelligent next step suggestions based on current state
   */
  async getNextSuggestions(sessionId: string): Promise<{
    suggested: EyeName[];
    reasoning: string;
    canAutoRoute: boolean;
  }> {
    // Get recent pipeline execution
    const recentRuns = await this.db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(desc(runs.createdAt))
      .limit(5);

    if (recentRuns.length === 0) {
      return {
        suggested: ['overseer'],
        reasoning: 'No previous executions. Start with overseer to initialize session.',
        canAutoRoute: true
      };
    }

    const lastRun = recentRuns[0];
    const lastEye = lastRun.eye as EyeName;
    const lastResult = lastRun.outputJson as BaseEnvelope;

    // Intelligent suggestions based on last Eye result
    const suggestions = this.getIntelligentSuggestions(lastEye, lastResult, recentRuns);

    return {
      suggested: suggestions.eyes,
      reasoning: suggestions.reasoning,
      canAutoRoute: suggestions.canAutoRoute
    };
  }

  /**
   * Auto-detect task type from input content
   */
  detectTaskType(input: string): 'code' | 'text' | 'general' {
    const codeIndicators = [
      'function', 'class', 'import', 'export', 'const', 'let', 'var',
      'if', 'else', 'for', 'while', 'return', 'async', 'await',
      '```', 'def ', 'public ', 'private ', 'package ', '@Override',
      '{', '}', ';', '//', '/*', '*/', '<script>', '<html>',
      'console.log', 'print(', 'System.out', 'std::cout'
    ];

    const textIndicators = [
      'research', 'study', 'analysis', 'report', 'evidence', 'claims',
      'facts', 'sources', 'references', 'citations', 'data', 'statistics',
      'findings', 'conclusion', 'methodology', 'hypothesis'
    ];

    const lowerInput = input.toLowerCase();

    const codeScore = codeIndicators.filter(indicator => lowerInput.includes(indicator)).length;
    const textScore = textIndicators.filter(indicator => lowerInput.includes(indicator)).length;

    if (codeScore > textScore && codeScore >= 2) {
      return 'code';
    } else if (textScore > codeScore && textScore >= 2) {
      return 'text';
    } else {
      return 'general';
    }
  }

  /**
   * Create custom pipeline definition
   */
  async createCustomPipeline(definition: Omit<PipelineDefinition, 'id'>): Promise<string> {
    const id = nanoid();
    const pipelineData = {
      id,
      name: definition.name,
      version: definition.version,
      description: definition.description,
      workflowJson: {
        steps: definition.steps,
        taskTypes: definition.taskTypes,
        isDefault: definition.isDefault
      },
      category: 'custom',
      active: true,
      createdAt: new Date()
    };

    await this.db.insert(pipelines).values(pipelineData);
    return id;
  }

  /**
   * Get available pipelines for a task type
   */
  async getAvailablePipelines(taskType: 'code' | 'text' | 'general'): Promise<PipelineDefinition[]> {
    // Get custom pipelines from database
    const customPipelines = await this.db
      .select()
      .from(pipelines)
      .where(eq(pipelines.active, true));

    const dbPipelines: PipelineDefinition[] = customPipelines
      .map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        steps: (p.workflowJson as any)?.steps || [],
        taskTypes: (p.workflowJson as any)?.taskTypes || [],
        isDefault: (p.workflowJson as any)?.isDefault || false,
        version: p.version
      }))
      .filter(p => p.taskTypes.includes(taskType));

    // Combine with default pipelines
    const defaultPipelines = DEFAULT_PIPELINES.filter(p => p.taskTypes.includes(taskType));

    return [...defaultPipelines, ...dbPipelines];
  }

  // Private helper methods

  private async resolvePipeline(context: PipelineExecutionContext): Promise<PipelineDefinition> {
    // Use custom steps if provided
    if (context.customSteps) {
      return {
        id: 'custom-adhoc',
        name: 'Ad-hoc Pipeline',
        description: 'Custom pipeline for this execution',
        steps: context.customSteps,
        taskTypes: ['general'],
        isDefault: false,
        version: 1
      };
    }

    // Use specified pipeline ID
    if (context.pipelineId) {
      const dbPipeline = await this.db
        .select()
        .from(pipelines)
        .where(eq(pipelines.id, context.pipelineId))
        .limit(1);

      if (dbPipeline.length > 0) {
        const p = dbPipeline[0];
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          steps: (p.workflowJson as any)?.steps || [],
          taskTypes: (p.workflowJson as any)?.taskTypes || [],
          isDefault: false,
          version: p.version
        };
      }
    }

    // Auto-select based on task type
    const taskType = context.taskType || 'general';
    const availablePipelines = await this.getAvailablePipelines(taskType);
    const defaultPipeline = availablePipelines.find(p => p.isDefault);

    return defaultPipeline || availablePipelines[0] || DEFAULT_PIPELINES[2]; // Fallback to quick-review
  }

  private shouldExecuteStep(step: PipelineStep, previousResults: EyeResponse[]): boolean {
    if (step.condition === 'always' || !step.condition) return true;
    if (previousResults.length === 0) return true;

    const lastResult = previousResults[previousResults.length - 1];

    switch (step.condition) {
      case 'if_approved':
        return responseVerdict(lastResult) === 'APPROVED';
      case 'if_rejected':
        return responseVerdict(lastResult) === 'REJECTED';
      case 'if_needs_input':
        return responseVerdict(lastResult) === 'NEEDS_INPUT';
      default:
        return true;
    }
  }

  private determineNextSteps(
    currentStep: PipelineStep,
    result: EyeResponse,
    allSteps: PipelineStep[],
    currentIndex: number
  ): EyeName[] {
    // Check if current step has branching rules
    if (currentStep.branches) {
      const verdict = responseVerdict(result);
      switch (verdict) {
        case 'APPROVED':
          return currentStep.branches.approved || [];
        case 'REJECTED':
          return currentStep.branches.rejected || [];
        case 'NEEDS_INPUT':
          return currentStep.branches.needs_input || [];
      }
    }

    // Default: continue to next step
    const nextStep = allSteps[currentIndex + 1];
    return nextStep ? [nextStep.eye] : [];
  }

  private createDynamicSteps(nextEyes: EyeName[], remainingSteps: PipelineStep[]): PipelineStep[] {
    const dynamicSteps: PipelineStep[] = nextEyes.map(eye => ({
      eye,
      condition: 'always'
    }));

    // Add back remaining steps that aren't duplicated
    const usedEyes = new Set(nextEyes);
    const filteredRemaining = remainingSteps.filter(step => !usedEyes.has(step.eye));

    return [...dynamicSteps, ...filteredRemaining];
  }

  private getIntelligentSuggestions(
    lastEye: EyeName,
    lastResult: BaseEnvelope,
    history: any[]
  ): { eyes: EyeName[]; reasoning: string; canAutoRoute: boolean } {
    // Smart suggestions based on Eye responses and context
    switch (lastEye) {
      case 'overseer':
        return {
          eyes: ['sharingan'],
          reasoning: 'Overseer completed initialization. Check for ambiguity next.',
          canAutoRoute: true
        };

      case 'sharingan': {
        if (responseVerdict(lastResult) === 'REJECTED') {
          return {
            eyes: ['prompt-helper'],
            reasoning: 'Sharingan detected ambiguity. Use prompt-helper to clarify.',
            canAutoRoute: true
          };
        }
        return {
          eyes: ['jogan'],
          reasoning: 'Sharingan approved clarity. Confirm intent with Jōgan.',
          canAutoRoute: true
        };
      }

      case 'prompt-helper':
        return {
          eyes: ['jogan', 'sharingan'],
          reasoning: 'Prompt optimized. Confirm intent or re-check ambiguity.',
          canAutoRoute: false
        };

      case 'jogan':
        return {
          eyes: ['rinnegan'],
          reasoning: 'Intent confirmed. Move to planning phase.',
          canAutoRoute: true
        };

      case 'rinnegan':
        // Determine if code or text path
        const hasCodeContext = history.some(r =>
          r.inputMd?.toLowerCase().includes('code') ||
          r.inputMd?.toLowerCase().includes('function')
        );

        if (hasCodeContext) {
          return {
            eyes: ['mangekyo'],
            reasoning: 'Code context detected. Route to Mangekyō review gates.',
            canAutoRoute: true
          };
        } else {
          return {
            eyes: ['tenseigan', 'byakugan'],
            reasoning: 'Text context. Route to evidence validation.',
            canAutoRoute: false
          };
        }

      default:
        return {
          eyes: ['rinnegan'],
          reasoning: 'Return to Rinnegan for final review or approval.',
          canAutoRoute: false
        };
    }
  }

  private enhanceInputWithSuggestions(originalInput: string, suggestions: string[]): string {
    const enhancement = suggestions.slice(0, 3).join(' ');
    return `${originalInput}\n\nAdditional context: ${enhancement}`;
  }

  private async createPipelineRun(runId: string, sessionId: string, pipelineId: string) {
    await this.db.insert(pipelineRuns).values({
      id: runId,
      pipelineId,
      sessionId,
      status: 'running',
      currentStep: 0,
      stateJson: {},
      createdAt: new Date()
    });
  }

  private async updatePipelineRun(runId: string, updates: Partial<any>) {
    await this.db
      .update(pipelineRuns)
      .set(updates)
      .where(eq(pipelineRuns.id, runId));
  }

  private async completePipelineRun(runId: string, status: 'completed' | 'failed', errorMessage?: string) {
    await this.db
      .update(pipelineRuns)
      .set({
        status,
        errorMessage,
        completedAt: new Date()
      })
      .where(eq(pipelineRuns.id, runId));
  }
}

// Export singleton instance
export const pipelineOrchestrator = PipelineOrchestrator.getInstance();
