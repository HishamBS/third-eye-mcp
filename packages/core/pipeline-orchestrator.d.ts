/**
 * Intelligent Pipeline Orchestrator
 *
 * Smart orchestration system that can handle any pipeline design:
 * - Default pipelines for common scenarios
 * - Custom user-defined pipelines
 * - Dynamic branching based on Eye responses
 * - Auto-routing with context awareness
 */
import type { EyeName, BaseEnvelope } from '@third-eye/eyes';
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
export interface PipelineExecutionResult {
    runId: string;
    sessionId: string;
    pipelineId?: string;
    status: 'running' | 'completed' | 'failed' | 'paused';
    currentStep: number;
    totalSteps: number;
    results: BaseEnvelope[];
    nextSuggestions?: EyeName[];
    error?: string;
}
export declare class PipelineOrchestrator {
    private static instance;
    private db;
    private eyeOrchestrator;
    constructor();
    static getInstance(): PipelineOrchestrator;
    /**
     * Execute a complete pipeline with intelligent routing
     */
    executePipeline(input: string, context: PipelineExecutionContext): Promise<PipelineExecutionResult>;
    /**
     * Get intelligent next step suggestions based on current state
     */
    getNextSuggestions(sessionId: string): Promise<{
        suggested: EyeName[];
        reasoning: string;
        canAutoRoute: boolean;
    }>;
    /**
     * Auto-detect task type from input content
     */
    detectTaskType(input: string): 'code' | 'text' | 'general';
    /**
     * Create custom pipeline definition
     */
    createCustomPipeline(definition: Omit<PipelineDefinition, 'id'>): Promise<string>;
    /**
     * Get available pipelines for a task type
     */
    getAvailablePipelines(taskType: 'code' | 'text' | 'general'): Promise<PipelineDefinition[]>;
    private resolvePipeline;
    private shouldExecuteStep;
    private determineNextSteps;
    private createDynamicSteps;
    private getIntelligentSuggestions;
    private enhanceInputWithSuggestions;
    private createPipelineRun;
    private updatePipelineRun;
    private completePipelineRun;
}
export declare const pipelineOrchestrator: PipelineOrchestrator;
//# sourceMappingURL=pipeline-orchestrator.d.ts.map