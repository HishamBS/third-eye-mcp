/**
 * Loop Node Handler - Iteration with batch support and max limits
 *
 * Processes items in batches with configurable iteration limits.
 * Used for N8N-style loop workflows.
 *
 * Per R01: Centralized loop logic in SSOT
 * Per R07: Strict typing throughout
 * Per R13: No magic numbers - all limits from config
 */

import type { PipelineDagNode } from '@third-eye/types';
import type { NodeHandler, ExecutionContext, NodeExecutionResult } from './base-handler';

/**
 * Loop state for tracking iteration progress
 */
interface LoopState {
  /** Current iteration index */
  index: number;
  /** Current batch of items */
  currentBatch: unknown[];
  /** Total number of items */
  total: number;
  /** Whether more iterations are needed */
  hasMore: boolean;
}

export class LoopNodeHandler implements NodeHandler {
  canHandle(node: PipelineDagNode): boolean {
    return node.type === 'loop_over_items';
  }

  async execute(node: PipelineDagNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (node.type !== 'loop_over_items') {
      throw new Error(`LoopNodeHandler cannot handle node type: ${node.type}`);
    }

    const startTime = Date.now();

    try {
      // Validate loop configuration
      const loopConfig = node.loopConfig;
      if (!loopConfig) {
        throw new Error('Loop node must have loopConfig property');
      }

      // Get items to iterate from previous node output
      const items = this.extractItemsFromContext(context);

      // Get current loop state from metadata or initialize
      const loopState = this.getOrInitializeLoopState(context, items, loopConfig);

      // Validate max iterations
      if (loopState.index >= loopConfig.maxIterations) {
        return {
          nodeId: node.id,
          status: 'success',
          verdict: 'MAX_ITERATIONS_REACHED',
          output: {
            type: 'loop',
            completed: true,
            totalIterations: loopState.index,
            reason: 'max_iterations_reached',
          },
          latencyMs: Date.now() - startTime,
          metadata: {
            loopCompleted: true,
            loopIndex: loopState.index,
            loopTotal: loopState.total,
          },
        };
      }

      // Check if loop is complete
      if (!loopState.hasMore) {
        return {
          nodeId: node.id,
          status: 'success',
          verdict: 'LOOP_COMPLETE',
          output: {
            type: 'loop',
            completed: true,
            totalIterations: loopState.index,
            processedItems: loopState.total,
          },
          latencyMs: Date.now() - startTime,
          metadata: {
            loopCompleted: true,
            loopIndex: loopState.index,
            loopTotal: loopState.total,
          },
        };
      }

      // Return current batch for processing
      return {
        nodeId: node.id,
        status: 'success',
        verdict: 'LOOP_CONTINUE',
        output: {
          type: 'loop',
          completed: false,
          currentBatch: loopState.currentBatch,
          batchIndex: loopState.index,
          batchSize: loopState.currentBatch.length,
          totalItems: loopState.total,
          remainingIterations: loopConfig.maxIterations - loopState.index,
        },
        latencyMs: Date.now() - startTime,
        metadata: {
          loopCompleted: false,
          loopIndex: loopState.index,
          loopTotal: loopState.total,
          loopItem: loopState.currentBatch[0], // First item for expression context
          loopBatch: loopState.currentBatch,
        },
      };
    } catch (error) {
      return {
        nodeId: node.id,
        status: 'error',
        error: `Loop execution failed: ${error instanceof Error ? error.message : String(error)}`,
        latencyMs: Date.now() - startTime,
      };
    }
  }

  /**
   * Extract items array from previous node output
   */
  private extractItemsFromContext(context: ExecutionContext): unknown[] {
    // Get last node result
    const lastResult = Array.from(context.previousResults.values()).pop();

    if (!lastResult) {
      throw new Error('No previous results available for loop iteration');
    }

    // Try to extract items from output
    const output = lastResult.output;

    // Check if output is array
    if (Array.isArray(output)) {
      return output;
    }

    // Check if output has items property
    if (output && typeof output === 'object' && 'items' in output) {
      const items = (output as { items: unknown }).items;
      if (Array.isArray(items)) {
        return items;
      }
    }

    // Check if output has data property
    if (output && typeof output === 'object' && 'data' in output) {
      const data = (output as { data: unknown }).data;
      if (Array.isArray(data)) {
        return data;
      }
    }

    throw new Error('Previous node output does not contain iterable items array');
  }

  /**
   * Get existing loop state from metadata or initialize new state
   */
  private getOrInitializeLoopState(
    context: ExecutionContext,
    items: unknown[],
    config: NonNullable<PipelineDagNode['loopConfig']>
  ): LoopState {
    // Check if we have existing loop state from previous iteration
    const lastResult = Array.from(context.previousResults.values()).pop();
    const existingLoopIndex = lastResult?.metadata?.loopIndex as number | undefined;

    if (existingLoopIndex !== undefined && typeof existingLoopIndex === 'number') {
      // Continue existing loop
      const nextIndex = existingLoopIndex + 1;
      const batchSize = config.batchSize ?? 1;
      const startIdx = nextIndex * batchSize;
      const endIdx = Math.min(startIdx + batchSize, items.length);
      const currentBatch = items.slice(startIdx, endIdx);

      return {
        index: nextIndex,
        currentBatch,
        total: items.length,
        hasMore: endIdx < items.length && nextIndex < config.maxIterations,
      };
    }

    // Initialize new loop
    const batchSize = config.batchSize ?? 1;
    const currentBatch = items.slice(0, Math.min(batchSize, items.length));

    return {
      index: 0,
      currentBatch,
      total: items.length,
      hasMore: items.length > batchSize,
    };
  }
}
