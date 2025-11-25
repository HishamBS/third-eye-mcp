import { EyeOrchestrator } from "@third-eye/core";
import type { BaseEnvelope } from "@third-eye/eyes";

/**
 * Pipeline Executor
 *
 * Executes custom workflows with branching logic and error handling
 */

export interface PipelineStep {
  eye: string;
  config?: Record<string, unknown>;
  conditions?: {
    skipIf?: {
      previousEye?: string;
      field?: string;
      operator?: "eq" | "neq" | "gt" | "lt" | "gte" | "lte";
      value?: unknown;
    };
    continueOnFailure?: boolean;
  };
}

export interface PipelineDefinition {
  id: string;
  name: string;
  description?: string;
  steps: PipelineStep[];
}

export interface PipelineCombinedOutput {
  pipeline: string;
  steps: number;
  success: boolean;
  outputs: Record<string, BaseEnvelope | { error: string }>;
}

export interface PipelineResult {
  pipelineId: string;
  success: boolean;
  steps: Array<{
    eye: string;
    skipped: boolean;
    error?: string;
    result?: BaseEnvelope;
    latencyMs?: number;
  }>;
  totalLatency: number;
  combinedOutput: PipelineCombinedOutput;
}

export class PipelineExecutor {
  private orchestrator: EyeOrchestrator;

  constructor() {
    this.orchestrator = new EyeOrchestrator();
  }

  /**
   * Execute pipeline with given input
   * R07 Compliance: Typed input as Record<string, unknown> instead of unknown for spread safety
   */
  async execute(
    pipeline: PipelineDefinition,
    input: Record<string, unknown>,
    sessionId?: string,
  ): Promise<PipelineResult> {
    const startTime = Date.now();
    const stepResults: PipelineResult["steps"] = [];
    const outputs: Record<string, BaseEnvelope | { error: string }> = {};

    for (const step of pipeline.steps) {
      const stepStartTime = Date.now();

      // Evaluate conditions
      if (step.conditions?.skipIf) {
        const shouldSkip = this.evaluateCondition(
          step.conditions.skipIf,
          outputs,
        );

        if (shouldSkip) {
          stepResults.push({
            eye: step.eye,
            skipped: true,
          });
          continue;
        }
      }

      try {
        // Execute Eye
        const eyeInput = JSON.stringify({ ...input, ...step.config });
        const result = await this.orchestrator.runEye(
          step.eye,
          eyeInput,
          sessionId,
        );

        const stepLatency = Date.now() - stepStartTime;

        stepResults.push({
          eye: step.eye,
          skipped: false,
          result,
          latencyMs: stepLatency,
        });

        outputs[step.eye] = result;

        // Check if step failed (use BaseEnvelope properties: ok and code)
        if (
          !result.ok ||
          result.code?.startsWith("REJECT_") ||
          result.code?.startsWith("E_")
        ) {
          if (!step.conditions?.continueOnFailure) {
            // Stop pipeline execution on failure
            break;
          }
        }
      } catch (error) {
        const stepLatency = Date.now() - stepStartTime;
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        stepResults.push({
          eye: step.eye,
          skipped: false,
          error: errorMessage,
          latencyMs: stepLatency,
        });

        outputs[step.eye] = { error: errorMessage };

        if (!step.conditions?.continueOnFailure) {
          break;
        }
      }
    }

    const totalLatency = Date.now() - startTime;

    // Determine overall success
    const success = stepResults.every((step) => !step.error || step.skipped);

    // Combine outputs
    const combinedOutput = {
      pipeline: pipeline.name,
      steps: stepResults.length,
      success,
      outputs,
    };

    return {
      pipelineId: pipeline.id,
      success,
      steps: stepResults,
      totalLatency,
      combinedOutput,
    };
  }

  /**
   * Evaluate conditional logic
   */
  private evaluateCondition(
    condition: NonNullable<PipelineStep["conditions"]>["skipIf"],
    outputs: Record<string, BaseEnvelope | { error: string }>,
  ): boolean {
    if (!condition) return false;

    const { previousEye, field, operator = "eq", value } = condition;

    if (!previousEye || !field) return false;

    const previousOutput = outputs[previousEye];
    if (!previousOutput) return false;

    // Get field value (supports dot notation)
    const fieldValue = this.getFieldValue(previousOutput, field);

    // Evaluate operator
    switch (operator) {
      case "eq":
        return fieldValue === value;
      case "neq":
        return fieldValue !== value;
      case "gt":
        return Number(fieldValue) > Number(value);
      case "lt":
        return Number(fieldValue) < Number(value);
      case "gte":
        return Number(fieldValue) >= Number(value);
      case "lte":
        return Number(fieldValue) <= Number(value);
      default:
        return false;
    }
  }

  /**
   * Get field value from object (supports dot notation)
   */
  private getFieldValue(obj: unknown, field: string): unknown {
    const parts = field.split(".");
    let value: unknown = obj;

    for (const part of parts) {
      if (
        value &&
        typeof value === "object" &&
        value !== null &&
        part in value
      ) {
        value = (value as Record<string, unknown>)[part];
      } else {
        return undefined;
      }
    }

    return value;
  }

  /**
   * Validate pipeline definition
   */
  validatePipeline(pipeline: PipelineDefinition): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!pipeline.id) {
      errors.push("Pipeline must have an id");
    }

    if (!pipeline.name) {
      errors.push("Pipeline must have a name");
    }

    if (!pipeline.steps || pipeline.steps.length === 0) {
      errors.push("Pipeline must have at least one step");
    }

    if (pipeline.steps) {
      pipeline.steps.forEach((step, index) => {
        if (!step.eye) {
          errors.push(`Step ${index + 1} must specify an eye`);
        }

        // Validate condition references
        if (step.conditions?.skipIf?.previousEye) {
          const previousEyeExists = pipeline.steps
            .slice(0, index)
            .some((s) => s.eye === step.conditions?.skipIf?.previousEye);

          if (!previousEyeExists) {
            errors.push(
              `Step ${index + 1} references non-existent previous eye: ${step.conditions.skipIf.previousEye}`,
            );
          }
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

/**
 * Example pipeline definitions
 *
 * NOTE: These are test-only examples with hardcoded eye names.
 * For production, all pipelines should be loaded from the database (SSOT).
 * These examples are kept for documentation/testing purposes only.
 */
export const examplePipelines: PipelineDefinition[] = [
  {
    id: "clarification-workflow",
    name: "Clarification Workflow",
    description: "Detect ambiguity, refine prompt, confirm intent",
    steps: [
      { eye: "sharingan" },
      {
        eye: "kyuubi",
        conditions: {
          skipIf: {
            previousEye: "sharingan",
            field: "metadata.ambiguityScore",
            operator: "lt",
            value: 30,
          },
        },
      },
      { eye: "jogan" },
    ],
  },
  {
    id: "full-implementation",
    name: "Full Implementation Pipeline",
    description: "Complete software development lifecycle",
    steps: [
      { eye: "sharingan" },
      { eye: "kyuubi" },
      { eye: "jogan" },
      { eye: "rinnegan", config: { mode: "requirements" } },
      { eye: "rinnegan", config: { mode: "review" } },
      { eye: "mangekyo", config: { gate: "scaffold" } },
      { eye: "mangekyo", config: { gate: "impl" } },
      { eye: "mangekyo", config: { gate: "tests" } },
      { eye: "mangekyo", config: { gate: "docs" } },
      { eye: "rinnegan", config: { mode: "approval" } },
    ],
  },
  {
    id: "fact-checking",
    name: "Fact Checking Pipeline",
    description: "Validate evidence and check consistency",
    steps: [{ eye: "tenseigan" }, { eye: "byakugan" }],
  },
];
