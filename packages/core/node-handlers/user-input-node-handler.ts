/**
 * User Input Node Handler - Handles nodes that require user input
 *
 * Pauses pipeline execution and waits for user to provide input via API
 */

import type { PipelineDagNode } from '../../types/dist/pipeline';
import type { NodeHandler, ExecutionContext, NodeExecutionResult } from './base-handler';

export class UserInputNodeHandler implements NodeHandler {
  canHandle(node: PipelineDagNode): boolean {
    return node.type === 'UserInput';
  }

  async execute(node: PipelineDagNode, context: ExecutionContext): Promise<NodeExecutionResult> {
    if (node.type !== 'UserInput') {
      throw new Error(`UserInputNodeHandler cannot handle node type: ${node.type}`);
    }

    // User input nodes pause execution immediately
    // The execution engine will emit a WebSocket event and wait for resume
    return {
      nodeId: node.id,
      status: 'awaiting_input',
      verdict: 'AWAIT_INPUT',
      output: {
        type: 'user_input',
        promptKey: node.promptKey,
        message: 'Awaiting user input',
      },
      latencyMs: 0,
      metadata: {
        promptKey: node.promptKey,
        requiresUserInput: true,
      },
    };
  }
}
