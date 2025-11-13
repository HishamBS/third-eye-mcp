/**
 * Terminal Node Handler - Handles terminal nodes that finalize pipeline execution
 *
 * Terminal nodes mark the end of a pipeline and set the final verdict
 */

import type { PipelineDagNode } from "@third-eye/types";
import type {
  NodeHandler,
  ExecutionContext,
  NodeExecutionResult,
} from "./base-handler";

export class TerminalNodeHandler implements NodeHandler {
  canHandle(node: PipelineDagNode): boolean {
    return node.type === "terminal";
  }

  async execute(
    node: PipelineDagNode,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    if (node.type !== "terminal") {
      throw new Error(
        `TerminalNodeHandler cannot handle node type: ${node.type}`,
      );
    }

    // Terminal nodes execute instantly and return their verdict
    const verdict = node.verdict || "END";
    return {
      nodeId: node.id,
      status: "success",
      verdict,
      output: {
        type: "terminal",
        verdict,
        message: this.getVerdictMessage(verdict),
      },
      latencyMs: 0,
      metadata: {
        terminal: true,
        finalVerdict: verdict,
      },
    };
  }

  /**
   * Get human-readable message for verdict
   */
  private getVerdictMessage(verdict: string | undefined): string {
    if (!verdict) {
      return "Pipeline execution ended";
    }
    const messages: Record<string, string> = {
      OK: "Pipeline completed successfully",
      APPROVED: "Pipeline approved",
      NEEDS_CLARIFICATION: "Pipeline requires clarification",
      NEEDS_REVISION: "Pipeline requires revision",
      AWAIT_CONFIRMATION: "Awaiting confirmation",
      AWAIT_INPUT: "Awaiting user input",
      AWAIT_AGENT_PLAN: "Awaiting agent plan",
      FINAL_REVIEW_FAILED: "Final review failed",
      END: "Pipeline execution ended",
    };

    return messages[verdict] || `Pipeline completed with verdict: ${verdict}`;
  }
}
