/**
 * Eye Node Handler - Executes Eye nodes by invoking the EyeOrchestrator
 *
 * Handles Eye node execution with:
 * - Provider override support
 * - Strictness override
 * - Retry logic via EyeOrchestrator
 * - WebSocket event emission
 */

import type { PipelineDagNode } from "@third-eye/types";
import type { ProviderType } from "@third-eye/providers";
import type {
  NodeHandler,
  ExecutionContext,
  NodeExecutionResult,
} from "./base-handler";
import { EyeOrchestrator } from "../orchestrator";

export class EyeNodeHandler implements NodeHandler {
  private orchestrator: EyeOrchestrator;

  constructor() {
    this.orchestrator = new EyeOrchestrator();
  }

  canHandle(node: PipelineDagNode): boolean {
    return node.type === "Eye";
  }

  async execute(
    node: PipelineDagNode,
    context: ExecutionContext,
  ): Promise<NodeExecutionResult> {
    if (node.type !== "Eye") {
      throw new Error(`EyeNodeHandler cannot handle node type: ${node.type}`);
    }

    const startTime = Date.now();

    try {
      // Build input from context
      const inputData = this.buildInput(context);
      const inputMd =
        typeof inputData === "string" ? inputData : JSON.stringify(inputData);

      // Execute Eye via EyeOrchestrator
      if (!node.eyeId) {
        throw new Error("Eye node must have an eyeId property");
      }
      const providerOverride = node.providerOverride
        ? {
            provider: node.providerOverride.provider as ProviderType,
            model: node.providerOverride.model,
          }
        : undefined;
      const result = await this.orchestrator.runEye(
        node.eyeId,
        inputMd,
        context.sessionId,
        {
          providerOverride,
          // TODO: Map strictnessOverride to options when supported
        },
      );

      const latencyMs = Date.now() - startTime;

      // Determine verdict from Eye response
      const verdict = this.extractVerdict(result);

      return {
        nodeId: node.id,
        status: "success",
        verdict,
        output: result,
        latencyMs,
        metadata: {
          eyeId: node.eyeId,
          responseCode: result.code,
          responseOk: result.ok,
        },
      };
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      return {
        nodeId: node.id,
        status: "error",
        error: error instanceof Error ? error.message : String(error),
        latencyMs,
        metadata: {
          eyeId: node.eyeId,
        },
      };
    }
  }

  /**
   * Build input for Eye from execution context
   * Uses previous results if available, otherwise uses pipeline input
   */
  private buildInput(context: ExecutionContext): unknown {
    // If we have previous results, use the last one's output
    if (context.previousResults.size > 0) {
      const lastResult = Array.from(context.previousResults.values()).pop();
      return lastResult?.output ?? context.input;
    }

    return context.input;
  }

  /**
   * Extract verdict from Eye execution result
   * Maps Eye response to standardized verdict codes
   */
  private extractVerdict(result: unknown): string {
    // Type guard for Eye result structure
    if (
      typeof result === "object" &&
      result !== null &&
      "verdict" in result &&
      typeof (result as { verdict: unknown }).verdict === "string"
    ) {
      return (result as { verdict: string }).verdict;
    }

    // Check for ok/approved status
    if (
      typeof result === "object" &&
      result !== null &&
      "ok" in result &&
      (result as { ok: unknown }).ok === true
    ) {
      return "APPROVED";
    }

    // Check for response.ok pattern
    if (
      typeof result === "object" &&
      result !== null &&
      "response" in result &&
      typeof (result as { response: unknown }).response === "object" &&
      (result as { response: { ok?: boolean } }).response?.ok === true
    ) {
      return "APPROVED";
    }

    // Default to OK for successful execution
    return "OK";
  }
}
