/**
 * Auto-Router - Intelligent Pipeline Routing
 *
 * Analyzes freeform tasks and routes them through the optimal Eye sequence
 * Phase 5: Integrated with ConversationTracker for narrative monitoring
 */

import type { EyeName } from "@third-eye/types";
import type { BaseEnvelope } from "@third-eye/eyes";
import { isRejected } from "@third-eye/eyes";
import { EyeId, EyeStatusCode } from "@third-eye/constants";
import { EyeOrchestrator } from "./orchestrator";
import { orderGuard } from "./order-guard";
import { ConversationTracker } from "./conversation-tracker";
import type { Constraint } from "./routing/routing-modes";
import { z } from "zod";

export interface AutoRouterOptions {
  strictness?: Record<string, unknown>;
  context?: Record<string, unknown>;
  // Phase 1-A2: Three Routing Modes
  routingMode?: "fully_dynamic" | "constrained" | "fixed";
  policyId?: string; // For constrained mode
  templateId?: string; // For fixed mode
}

const STRICTNESS_HEADER = "STRICTNESS CONTROLS (from UI):";
const CLARITY_VALIDATED_HEADER = "CLARITY_VALIDATED:";

/**
 * Dangerous operation keywords that should trigger immediate confirmation
 * These bypass Sharingan clarification and go straight to human confirmation
 */
const DANGEROUS_KEYWORDS = {
  // Database destructive operations
  database: [
    /\bdrop\s+(table|database|index|schema)/i,
    /\btruncate\s+table/i,
    /\bdelete\s+from\b.*\bwhere\s+1\s*=\s*1/i,
    /\bdelete\s+all\b/i,
    /\balter\s+table\b.*\bdrop\b/i,
  ],
  // Production environment indicators
  production: [
    /\bproduction\b/i,
    /\bprod\s+(database|server|environment|db)/i,
    /\blive\s+(environment|server|database)/i,
  ],
  // Mass operations
  mass: [
    /\breset\s+all\b/i,
    /\bdelete\s+all\b/i,
    /\bremove\s+all\b/i,
    /\bclear\s+all\b/i,
    /\bwipe\b/i,
    /\bpurge\b/i,
    /\ball\s+(users?|passwords?|accounts?|data)\b/i,
  ],
  // Privileged operations
  privileged: [/\bsudo\b/i, /\broot\b/i, /\bforce\b/i, /\b--force\b/i],
};

interface RiskAssessment {
  isRisky: boolean;
  riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  detectedPatterns: string[];
  categories: string[];
}

/**
 * Pre-screen input for dangerous operations before routing to any eye
 * This ensures risky operations trigger confirmation, not clarification
 */
function assessRisk(input: string): RiskAssessment {
  const detectedPatterns: string[] = [];
  const categories: string[] = [];

  for (const [category, patterns] of Object.entries(DANGEROUS_KEYWORDS)) {
    for (const pattern of patterns) {
      const match = input.match(pattern);
      if (match) {
        detectedPatterns.push(match[0]);
        if (!categories.includes(category)) {
          categories.push(category);
        }
      }
    }
  }

  const isRisky = detectedPatterns.length > 0;

  // Determine risk level based on category combinations
  let riskLevel: RiskAssessment["riskLevel"] = "LOW";
  if (isRisky) {
    if (categories.includes("database") && categories.includes("production")) {
      riskLevel = "CRITICAL";
    } else if (
      categories.includes("production") ||
      categories.includes("database")
    ) {
      riskLevel = "HIGH";
    } else if (categories.includes("mass")) {
      riskLevel = "HIGH";
    } else {
      riskLevel = "MEDIUM";
    }
  }

  return { isRisky, riskLevel, detectedPatterns, categories };
}

// Codes that indicate clarity has been validated (no need for guidance questions)
const CLARITY_VALIDATED_CODES = new Set([
  EyeStatusCode.OK,
  EyeStatusCode.OK_WITH_NOTES,
  EyeStatusCode.OK_NO_CLARIFICATION_NEEDED,
]);

// Eyes that are part of guidance phase (need to re-run after clarification)
const GUIDANCE_EYES = new Set([EyeId.SHARINGAN, EyeId.KYUUBI]);

// Codes that indicate guidance is complete and ready for draft
const GUIDANCE_COMPLETE_CODES = new Set([
  EyeStatusCode.OK_GUIDE,
  EyeStatusCode.OK_PROMPT_READY,
  EyeStatusCode.GUIDANCE_COMPLETE,
]);

const STRICTNESS_LABELS: Record<string, string> = {
  ambiguityThreshold: "Ambiguity Threshold (0-100, lower = stricter)",
  citationCutoff: "Citation Confidence Cutoff (0-100%)",
  consistencyTolerance: "Consistency Tolerance (0-100, lower = stricter)",
  mangekyoStrictness: "Mangekyō Code Review Minimum (%)",
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Extract a meaningful title from user task input
 * Used for session naming to make sessions identifiable
 */
function extractTaskTitle(input: string, maxLength: number = 50): string {
  if (!input || typeof input !== "string") {
    return "Auto-Router Session";
  }

  // Clean up the input
  let title = input.trim();

  // Remove common prefixes
  title = title.replace(
    /^(please\s+|can\s+you\s+|i\s+want\s+to\s+|i\s+need\s+to\s+|help\s+me\s+)/i,
    "",
  );

  // Get first line only (task might be multi-line)
  const firstLine = title.split(/[\n\r]/)[0]?.trim() || title;

  // Truncate to max length
  if (firstLine.length <= maxLength) {
    return firstLine || "Auto-Router Session";
  }

  // Find a good break point (word boundary)
  const truncated = firstLine.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");

  if (lastSpace > maxLength * 0.6) {
    // Break at word boundary if it's not too far back
    return truncated.substring(0, lastSpace) + "...";
  }

  return truncated + "...";
}

function formatStrictnessDirective(
  strictness?: Record<string, unknown>,
): string | null {
  if (!strictness || !isPlainObject(strictness)) {
    return null;
  }

  const lines: string[] = [];

  for (const [key, label] of Object.entries(STRICTNESS_LABELS)) {
    const value = strictness[key];
    if (typeof value === "number") {
      const formatted = key === "citationCutoff" ? `${value}%` : value;
      lines.push(`- ${label}: ${formatted}`);
    }
  }

  for (const [key, value] of Object.entries(strictness)) {
    if (key in STRICTNESS_LABELS) continue;
    if (typeof value === "number" || typeof value === "string") {
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
    "Apply these thresholds when selecting eyes, requesting clarifications, and validating outputs.",
  ].join("\n");
}

function formatContextDirective(
  context?: Record<string, unknown>,
): string | null {
  if (
    !context ||
    !isPlainObject(context) ||
    Object.keys(context).length === 0
  ) {
    return null;
  }

  try {
    return `SESSION CONTEXT (JSON):\n${JSON.stringify(context, null, 2)}`;
  } catch (error) {
    console.warn(
      "[AutoRouter] Failed to serialize session context for prompt enrichment:",
      error,
    );
    return null;
  }
}

export interface RoutingDecision {
  sessionId: string;
  taskType: "code" | "text" | "analysis";
  complexity: "simple" | "medium" | "complex";
  recommendedFlow: EyeName[];
  reasoning: string;
  estimatedSteps: number;
}

export interface AutoRoutingResult {
  sessionId: string;
  results: BaseEnvelope[];
  completed: boolean;
  paused?: boolean; // REPAIR_PLAN A3: Pipeline paused for human input
  pauseReason?: "clarification" | "confirmation" | "draft_submission"; // Reason for pause
  error?: string;
  data?: {
    brief?: string;
    requirements?: string[];
    checkpoints?: string[];
    questions?: Array<{ field: string; question: string }>;
    [key: string]: unknown;
  };
}

const SharinganAnalysisSchema = z.object({
  data: z
    .object({
      isCodeRelated: z.boolean().optional(),
      complexity: z.enum(["simple", "medium", "complex"]).optional(),
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
    options: AutoRouterOptions = {},
  ): Promise<RoutingDecision> {
    const strictnessDirective = formatStrictnessDirective(options.strictness);
    const contextDirective = formatContextDirective(options.context);
    const enrichedInput = [input, strictnessDirective, contextDirective]
      .filter(Boolean)
      .join("\n\n");

    let actualSessionId = sessionId || providedSessionId;

    if (!actualSessionId) {
      const bootstrapConfig: Record<string, unknown> = {
        agentName: "Auto-Router",
        displayName: extractTaskTitle(enrichedInput),
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
    const routingMode = options.routingMode || "fully_dynamic";

    // ========================================================================
    // Mode 1: Fixed Template - Use predefined eye sequence
    // ========================================================================
    if (routingMode === "fixed" && options.templateId) {
      const { TemplateExecutor } = await import("./routing/template-executor");
      const { getDb } = await import("@third-eye/db");
      const { sqlite } = getDb();
      const templateExecutor = new TemplateExecutor(sqlite);

      const executionPlan = await templateExecutor.executeTemplate(
        options.templateId,
      );

      return {
        sessionId: actualSessionId,
        taskType: "text", // Template doesn't analyze task type
        complexity: "medium",
        recommendedFlow: executionPlan.eyeSequence as EyeName[],
        reasoning: executionPlan.reasoning,
        estimatedSteps: executionPlan.eyeSequence.length,
      };
    }

    // ========================================================================
    // Mode 2 & 3: Call Overseer for dynamic routing
    // ========================================================================
    const { getAllActiveEyes } = await import("@third-eye/db/utils/lookups");
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
      throw new Error("Overseer eye not found in database");
    }

    // Enrich Overseer input with policy constraints if constrained mode
    let overseerInput = enrichedInput;
    if (routingMode === "constrained" && options.policyId) {
      const { getDb } = await import("@third-eye/db");
      const { sqlite } = getDb();
      const policyRow = sqlite
        .prepare(
          `SELECT id, name, description, mandatory_eyes, forbidden_eyes, min_validation_eyes, security_required, always_confirm_intent
           FROM routing_policies
           WHERE id = ? AND is_active = 1`,
        )
        .get(options.policyId) as
        | {
            id: string;
            name: string;
            description: string | null;
            mandatory_eyes: string;
            forbidden_eyes: string | null;
            min_validation_eyes: number | null;
            security_required: number;
            always_confirm_intent: number;
          }
        | undefined;

      if (policyRow) {
        const policyDirective = [
          "\n\nROUTING POLICY CONSTRAINTS:",
          `Policy: ${policyRow.name}`,
          policyRow.description ? `Description: ${policyRow.description}` : "",
          `Mandatory Eyes: ${policyRow.mandatory_eyes}`,
          policyRow.forbidden_eyes
            ? `Forbidden Eyes: ${policyRow.forbidden_eyes}`
            : "",
          policyRow.min_validation_eyes !== null
            ? `Minimum Validation Eyes: ${policyRow.min_validation_eyes}`
            : "",
          policyRow.security_required ? "Security validation REQUIRED" : "",
          policyRow.always_confirm_intent
            ? "Intent confirmation REQUIRED (include Jōgan)"
            : "",
          "\nYou MUST respect these constraints when selecting eyes.",
        ]
          .filter(Boolean)
          .join("\n");

        overseerInput = `${overseerInput}${policyDirective}`;
      }
    }

    const overseerResult = await this.orchestrator.runEye(
      overseerName,
      overseerInput,
      actualSessionId,
    );

    if (!overseerResult.ok) {
      throw new Error(
        `Overseer failed: ${overseerResult.code} - ${overseerResult.md || "No details"}`,
      );
    }

    const pipelineRoute = overseerResult.data?.pipelineRoute;
    if (!Array.isArray(pipelineRoute) || pipelineRoute.length === 0) {
      // Graceful fallback: Route to Sharingan for clarification instead of throwing
      console.warn(
        "[AutoRouter] Overseer returned empty/invalid pipeline route. Falling back to Sharingan for clarification.",
        overseerResult.data,
      );

      // Return a minimal routing decision that asks for clarification
      return {
        sessionId: actualSessionId,
        taskType: "text" as const,
        complexity: "simple" as const,
        recommendedFlow: ["sharingan"] as EyeName[],
        reasoning:
          "Overseer could not determine a specific pipeline. Routing to Sharingan for clarification.",
        estimatedSteps: 1,
      };
    }

    // ========================================================================
    // Mode 2: Constrained Dynamic - Validate against policy
    // ========================================================================
    if (routingMode === "constrained" && options.policyId) {
      const { PolicyValidator } = await import("./routing/policy-validator");
      const { getDb } = await import("@third-eye/db");
      const { sqlite } = getDb();

      // Load policy from database
      const policyRow = sqlite
        .prepare(
          `SELECT id, name, description, mandatory_eyes, forbidden_eyes, min_validation_eyes, security_required, always_confirm_intent, custom_constraints
           FROM routing_policies
           WHERE id = ? AND is_active = 1`,
        )
        .get(options.policyId) as
        | {
            id: string;
            name: string;
            description: string | null;
            mandatory_eyes: string;
            forbidden_eyes: string | null;
            min_validation_eyes: number | null;
            security_required: number;
            always_confirm_intent: number;
            custom_constraints: string | null;
          }
        | undefined;

      if (policyRow) {
        const policy = {
          id: policyRow.id,
          name: policyRow.name,
          description: policyRow.description ?? undefined,
          mandatoryEyes: JSON.parse(policyRow.mandatory_eyes) as string[],
          forbiddenEyes: policyRow.forbidden_eyes
            ? (JSON.parse(policyRow.forbidden_eyes) as string[])
            : undefined,
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
        const validationResult = validator.validateSequence(
          pipelineRoute as string[],
          policy,
        );

        if (!validationResult.valid) {
          throw new Error(
            `Policy validation failed: ${validationResult.errors.join(", ")}`,
          );
        }

        // Log warnings if any
        if (validationResult.warnings.length > 0) {
          console.warn(
            "[AutoRouter] Policy validation warnings:",
            validationResult.warnings,
          );
        }
      }
    }

    const routingDecision = {
      sessionId: actualSessionId,
      taskType:
        (overseerResult.data.contentDomain as "code" | "text" | "analysis") ||
        "text",
      complexity:
        (overseerResult.data.complexity as "simple" | "medium" | "complex") ||
        "medium",
      recommendedFlow: pipelineRoute as EyeName[],
      reasoning:
        (overseerResult.data.routingReasoning as string) ||
        "Overseer-determined",
      estimatedSteps: pipelineRoute.length,
    };

    // FIX 5: Persist routing decision to database for LiveRoutingPanel
    try {
      const { getDb } = await import("@third-eye/db");
      const { routingDecisions } = await import("@third-eye/db/schema");
      const { generateId } = await import("@third-eye/db/utils/uuid");
      const { db } = getDb();

      await db.insert(routingDecisions).values({
        id: generateId(),
        sessionId: actualSessionId,
        requestAnalysis: JSON.stringify({
          requestType: routingDecision.taskType,
          complexity: routingDecision.complexity,
          originalInput: input.substring(0, 500), // Store truncated input for context
        }),
        selectedEyes: JSON.stringify(routingDecision.recommendedFlow),
        reasoning: routingDecision.reasoning,
        executionMode: "sequential",
        createdAt: new Date(),
      });
    } catch (persistError) {
      // Log but don't fail - routing decision persistence is not critical
      console.warn(
        "[AutoRouter] Failed to persist routing decision:",
        persistError instanceof Error
          ? persistError.message
          : String(persistError),
      );
    }

    return routingDecision;
  }

  /**
   * Execute complete pipeline based on routing decision
   */
  async executeFlow(
    input: string,
    routing?: RoutingDecision,
    providedSessionId?: string,
    options: AutoRouterOptions = {},
  ): Promise<AutoRoutingResult> {
    try {
      // ========================================================================
      // RISK PRE-SCREENING: Detect dangerous operations BEFORE routing to eyes
      // This ensures risky operations trigger confirmation, not clarification
      // ========================================================================
      const riskAssessment = assessRisk(input);

      if (riskAssessment.isRisky) {
        // Create a session for the dangerous operation
        const bootstrapConfig: Record<string, unknown> = {
          agentName: "Risk-Detector",
          displayName: `⚠️ ${extractTaskTitle(input, 40)}`,
        };
        const session = await this.orchestrator.createSession(bootstrapConfig);
        const sessionId = session.sessionId;

        // Mark as auto-router controlled
        orderGuard.markAsAutoRouterSession(sessionId);

        // Initialize tracking
        const { getDb } = await import("@third-eye/db");
        const { sqlite } = getDb();
        const conversationTracker = new ConversationTracker(sqlite);

        // Log the dangerous operation detection
        conversationTracker.logHumanMessage(sessionId, input);
        conversationTracker.logAgentMessage(
          sessionId,
          "risk-detector",
          `**DANGEROUS OPERATION DETECTED**\n\nRisk Level: ${riskAssessment.riskLevel}\nCategories: ${riskAssessment.categories.join(", ")}\nDetected Patterns: ${riskAssessment.detectedPatterns.join(", ")}\n\nThis operation requires explicit human confirmation before proceeding.`,
          {
            type: "risk_detection",
            riskLevel: riskAssessment.riskLevel,
            categories: riskAssessment.categories,
            patterns: riskAssessment.detectedPatterns,
          },
        );

        // Pause for confirmation
        const { PauseResumeManager } = await import("./pause-resume-manager");
        const pauseManager = new PauseResumeManager(sqlite);
        await pauseManager.pausePipeline({
          sessionId,
          currentEye: "risk-detector",
          reason: "confirmation",
          pendingData: {
            riskAssessment,
            confirmationPrompt: `⚠️ DANGEROUS OPERATION DETECTED\n\nRisk Level: ${riskAssessment.riskLevel}\nCategories: ${riskAssessment.categories.join(", ")}\nPatterns Found: ${riskAssessment.detectedPatterns.join(", ")}\n\nThis operation may cause irreversible changes. Please confirm you want to proceed.`,
          },
          expiresInMs: 24 * 60 * 60 * 1000,
        });

        conversationTracker.logPause(
          sessionId,
          "confirmation",
          `Dangerous operation requires confirmation: ${riskAssessment.riskLevel} risk`,
        );

        // Emit WebSocket event
        const { getWebSocketBridge } = await import("./websocket-registry");
        const ws = getWebSocketBridge();
        if (ws) {
          ws.broadcastToSession(sessionId, {
            type: "pipeline_paused",
            reason: "confirmation",
            eye: "risk-detector",
            riskLevel: riskAssessment.riskLevel,
            timestamp: Date.now(),
          });
        }

        return {
          sessionId,
          results: [],
          completed: false,
          paused: true,
          pauseReason: "confirmation",
        };
      }

      // ========================================================================
      // NORMAL FLOW: Route through eyes for non-dangerous operations
      // ========================================================================

      // Analyze task if no routing provided
      // Note: analyzeTask already marks the session as auto-router before calling Overseer
      const decision =
        routing ||
        (await this.analyzeTask(input, undefined, providedSessionId, options));

      const results: BaseEnvelope[] = [];
      let currentInput = input;
      const strictnessDirective = formatStrictnessDirective(options.strictness);

      // Import WebSocket bridge for real-time updates
      const { getWebSocketBridge } = await import("./websocket-registry");
      const ws = getWebSocketBridge();

      // Phase 5: Initialize ConversationTracker for narrative monitoring
      const { getDb } = await import("@third-eye/db");
      const { sqlite } = getDb();
      const conversationTracker = new ConversationTracker(sqlite);

      // Log routing decision
      conversationTracker.logRoutingDecision(
        decision.sessionId,
        decision.recommendedFlow,
        decision.reasoning,
      );

      // Log human's initial input
      conversationTracker.logHumanMessage(decision.sessionId, input);

      // Execute each Eye in the recommended flow
      for (let i = 0; i < decision.recommendedFlow.length; i++) {
        const eyeName = decision.recommendedFlow[i];

        // Emit eye_started event
        if (ws) {
          ws.broadcastToSession(decision.sessionId, {
            type: "eye_started",
            eye: eyeName,
            step: i + 1,
            totalSteps: decision.recommendedFlow.length,
            timestamp: Date.now(),
          });
        }

        const runInput =
          strictnessDirective && !currentInput.includes(STRICTNESS_HEADER)
            ? `${currentInput}\n\n${strictnessDirective}`
            : currentInput;

        const result = await this.orchestrator.runEye(
          eyeName,
          runInput,
          decision.sessionId,
        );
        results.push(result);

        // Phase 5: Log agent message from eye
        conversationTracker.logAgentMessage(
          decision.sessionId,
          eyeName,
          result.md || "Eye completed execution",
          {
            code: result.code,
            ok: result.ok,
            step: i + 1,
            totalSteps: decision.recommendedFlow.length,
          },
        );

        // Emit eye_complete event
        if (ws) {
          ws.broadcastToSession(decision.sessionId, {
            type: "eye_complete",
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
        // FIX: Check CONFIRMATION FIRST (highest priority - catches risky ops)
        // This ensures dangerous operations get confirmation before any clarification
        if (
          result.code === EyeStatusCode.AWAIT_CONFIRMATION ||
          result.code === EyeStatusCode.E_INTENT_UNCONFIRMED
        ) {
          const { PauseResumeManager } = await import("./pause-resume-manager");
          const { getDb } = await import("@third-eye/db");
          const { sqlite } = getDb();
          const pauseManager = new PauseResumeManager(sqlite);

          await pauseManager.pausePipeline({
            sessionId: decision.sessionId,
            currentEye: eyeName,
            reason: "confirmation",
            pendingData: result.data,
            expiresInMs: 24 * 60 * 60 * 1000,
          });

          // Log the intent confirmation request to conversation timeline
          const confirmationPrompt =
            (result.data?.confirmationPrompt as string) ||
            (result.data?.intentAnalysis as string) ||
            "Intent requires confirmation";
          conversationTracker.logAgentMessage(
            decision.sessionId,
            eyeName,
            `**Intent Confirmation Required:**\n\n${confirmationPrompt}`,
            {
              type: "intent_confirmation_request",
              intentAnalysis: result.data?.intentAnalysis,
              confirmationPrompt: result.data?.confirmationPrompt,
              riskLevel: result.data?.riskLevel,
            },
          );

          conversationTracker.logPause(
            decision.sessionId,
            "confirmation",
            `Eye ${eyeName} requested intent confirmation`,
          );

          if (ws) {
            ws.broadcastToSession(decision.sessionId, {
              type: "pipeline_paused",
              reason: "confirmation",
              eye: eyeName,
              timestamp: Date.now(),
            });
          }

          return {
            sessionId: decision.sessionId,
            results,
            completed: false,
            paused: true,
            pauseReason: "confirmation",
          };
        }

        // FIX: Check CLARIFICATION SECOND (lower priority than confirmation)
        // Only ask for clarification if not a risky operation requiring confirmation
        if (
          result.code === EyeStatusCode.NEED_CLARIFICATION ||
          result.code === EyeStatusCode.E_NEEDS_CLARIFICATION
        ) {
          const { PauseResumeManager } = await import("./pause-resume-manager");
          const { getDb } = await import("@third-eye/db");
          const { sqlite } = getDb();
          const pauseManager = new PauseResumeManager(sqlite);

          await pauseManager.pausePipeline({
            sessionId: decision.sessionId,
            currentEye: eyeName,
            reason: "clarification",
            pendingData: result.data,
            expiresInMs: 24 * 60 * 60 * 1000, // 24 hours
          });

          // Log the clarification questions to conversation timeline
          const questions = result.data?.questions as
            | Array<
                | {
                    id?: string;
                    text?: string;
                    field?: string;
                    question?: string;
                  }
                | string
              >
            | undefined;
          if (questions && Array.isArray(questions)) {
            // Store clarification questions in database for polling
            const { addClarificationRequest } = await import("@third-eye/eyes");
            const mappedQuestions = questions.map((q) => {
              if (typeof q === "string") {
                return { field: "question", question: q };
              }
              return {
                field: q.field || q.id || "unknown",
                question: q.question || q.text || "No question provided",
              };
            });
            await addClarificationRequest(decision.sessionId, mappedQuestions);

            const questionTexts = questions
              .map((q, idx) => {
                const text =
                  typeof q === "string"
                    ? q
                    : q.text || q.question || q.id || "";
                return `${idx + 1}. ${text}`;
              })
              .join("\n");
            conversationTracker.logAgentMessage(
              decision.sessionId,
              eyeName,
              `**Clarification Questions:**\n\n${questionTexts}`,
              {
                type: "clarification_request",
                questions: questions,
              },
            );
          }

          conversationTracker.logPause(
            decision.sessionId,
            "clarification",
            `Eye ${eyeName} requested clarification`,
          );

          // Emit pause event via WebSocket
          if (ws) {
            ws.broadcastToSession(decision.sessionId, {
              type: "pipeline_paused",
              reason: "clarification",
              eye: eyeName,
              timestamp: Date.now(),
            });
          }

          return {
            sessionId: decision.sessionId,
            results,
            completed: false,
            paused: true,
            pauseReason: "clarification",
          };
        }

        // Only check isRejected AFTER checking pause codes (confirmation & clarification)
        if (isRejected(result)) {
          // Phase 5: Log error
          conversationTracker.logError(
            decision.sessionId,
            eyeName,
            `Pipeline rejected with code: ${result.code}`,
            { code: result.code, message: result.md },
          );

          return {
            sessionId: decision.sessionId,
            results,
            completed: false,
            error: `Pipeline stopped: ${eyeName} rejected with ${result.code}`,
          };
        }

        const nextInput = NextInputSchema.safeParse(result.data);
        if (nextInput.success && nextInput.data.outputForNext) {
          currentInput = nextInput.data.outputForNext;
        }

        // Propagate clarity signal when an eye validates clarity
        // This tells subsequent eyes to skip guidance questions and proceed to validation
        if (
          CLARITY_VALIDATED_CODES.has(result.code) &&
          !currentInput.includes(CLARITY_VALIDATED_HEADER)
        ) {
          const ambiguityScore =
            typeof result.data?.ambiguityScore === "number"
              ? result.data.ambiguityScore
              : null;

          // Only propagate if eye explicitly validated clarity (low ambiguity)
          // or if it's a clear approval from Sharingan
          if (
            eyeName.toLowerCase() === EyeId.SHARINGAN ||
            (ambiguityScore !== null && ambiguityScore < 30)
          ) {
            currentInput = `${currentInput}\n\n${CLARITY_VALIDATED_HEADER}
Task clarity has been validated by ${eyeName}${ambiguityScore !== null ? ` (ambiguity: ${ambiguityScore}/100)` : ""}.
Skip guidance-phase questions and proceed directly to validation/analysis.
Do NOT ask clarifying questions - the task requirements are already clear.`;
          }
        }
      }

      // Unmark session after successful completion
      // Future direct Eye calls should be validated
      orderGuard.unmarkAsAutoRouterSession(decision.sessionId);

      return {
        sessionId: decision.sessionId,
        results,
        completed: true,
      };
    } catch (error) {
      // Unmark session on error too
      if (routing?.sessionId) {
        orderGuard.unmarkAsAutoRouterSession(routing.sessionId);
      }

      // Phase 5: Log error to conversation tracker
      if (routing?.sessionId) {
        try {
          const { getDb } = await import("@third-eye/db");
          const { sqlite } = getDb();
          const conversationTracker = new ConversationTracker(sqlite);
          conversationTracker.logError(
            routing.sessionId,
            "auto-router",
            error instanceof Error
              ? error.message
              : "Unknown error occurred during pipeline execution",
          );
        } catch {
          // Silently fail if logging fails - don't break error handling
        }
      }

      return {
        sessionId: routing?.sessionId || "unknown",
        results: [],
        completed: false,
        error: `Auto-routing failed: ${error instanceof Error ? error.message : "Unknown error"}`,
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
   *
   * CRITICAL FIX: After clarification, we MUST re-run guidance phase (Sharingan validates
   * clarity, Kyuubi produces refined brief) before proceeding to validation.
   * This follows VISION.md philosophy: "Guidance removes ambiguity; validation confirms alignment."
   */
  async resumeFlow(
    sessionId: string,
    input?: string,
    options: AutoRouterOptions = {},
  ): Promise<AutoRoutingResult> {
    try {
      const { getResolvedFacts } = await import("@third-eye/eyes");
      const { canResumeAfterConfirmation } = await import("@third-eye/eyes");
      const { getIntentConfirmationStatus } = await import("@third-eye/eyes");

      // Check if there's a pending intent confirmation
      const confirmation = await getIntentConfirmationStatus(sessionId);
      if (confirmation) {
        const resumeStatus = canResumeAfterConfirmation(confirmation);
        if (!resumeStatus.canResume) {
          return {
            sessionId,
            results: [],
            completed: false,
            error: `Awaiting confirmation: ${resumeStatus.statusCode}`,
          };
        }
      }

      // Get resolved facts from clarifications
      const resolvedFacts = await getResolvedFacts(sessionId);
      const factsSummary = Object.entries(resolvedFacts)
        .map(([key, value]) => `${key}: ${value}`)
        .join("\n");

      // Get state to determine what Eyes still need to run
      const state = orderGuard.getState(sessionId);
      if (!state) {
        return {
          sessionId,
          results: [],
          completed: true,
          error: "No state found to resume",
        };
      }

      // Get pipeline state to check pause reason
      const { PauseResumeManager } = await import("./pause-resume-manager");
      const { getDb } = await import("@third-eye/db");
      const { sqlite } = getDb();
      const pauseManager = new PauseResumeManager(sqlite);
      const pipelineState = await pauseManager.getPipelineState(sessionId);

      // Build enriched input with clarifications AND clarity signal
      const claritySignal = `${CLARITY_VALIDATED_HEADER}
Task clarity has been validated through human clarification.
Resolved facts:
${factsSummary}
Skip guidance-phase questions and proceed with the validated requirements.`;

      const enrichedInput = input
        ? `${input}\n\n${claritySignal}`
        : `Resuming pipeline with clarified context:\n\n${claritySignal}`;

      const results: BaseEnvelope[] = [];

      // Mark as auto-router controlled
      orderGuard.markAsAutoRouterSession(sessionId);

      // Phase 5: Initialize ConversationTracker and log resume
      const conversationTracker = new ConversationTracker(sqlite);

      // Import WebSocket bridge for real-time updates
      const { getWebSocketBridge } = await import("./websocket-registry");
      const ws = getWebSocketBridge();

      // CRITICAL FIX: If resuming from clarification, re-run guidance phase
      // Sharingan validates clarity is achieved, Kyuubi produces refined brief
      if (pipelineState?.pauseReason === "clarification") {
        conversationTracker.logResume(
          sessionId,
          "Pipeline resuming after clarification - re-running guidance phase",
          { resolvedFacts, phase: "re-guidance" },
        );

        // Broadcast pipeline_resumed event
        if (ws) {
          ws.broadcastToSession(sessionId, {
            type: "pipeline_resumed",
            sessionId,
            data: {
              phase: "re-guidance",
              resolvedFacts,
              completedEyes: state.completedEyes,
            },
            timestamp: Date.now(),
          });
        }

        // Re-run guidance eyes with clarified facts
        const guidanceEyes: EyeName[] = [
          EyeId.SHARINGAN as EyeName,
          EyeId.KYUUBI as EyeName,
        ];

        for (let i = 0; i < guidanceEyes.length; i++) {
          const eyeName = guidanceEyes[i];

          // Emit eye_started event
          if (ws) {
            ws.broadcastToSession(sessionId, {
              type: "eye_started",
              eye: eyeName,
              step: i + 1,
              totalSteps: guidanceEyes.length,
              phase: "re-guidance",
              timestamp: Date.now(),
            });
          }

          const result = await this.orchestrator.runEye(
            eyeName,
            enrichedInput,
            sessionId,
          );
          results.push(result);

          // Log agent message
          conversationTracker.logAgentMessage(
            sessionId,
            eyeName,
            result.md || "Eye completed execution",
            {
              code: result.code,
              ok: result.ok,
              step: i + 1,
              phase: "re-guidance",
            },
          );

          // Emit eye_complete event
          if (ws) {
            ws.broadcastToSession(sessionId, {
              type: "eye_complete",
              eye: eyeName,
              step: i + 1,
              totalSteps: guidanceEyes.length,
              phase: "re-guidance",
              result: {
                ok: result.ok,
                code: result.code,
                md: result.md?.substring(0, 200),
              },
              timestamp: Date.now(),
            });
          }

          // FIX 12: Check for NEW pauses during resume
          if (
            result.code === EyeStatusCode.NEED_CLARIFICATION ||
            result.code === EyeStatusCode.E_NEEDS_CLARIFICATION
          ) {
            // New clarification needed - pause again
            await pauseManager.pausePipeline({
              sessionId,
              currentEye: eyeName,
              reason: "clarification",
              pendingData: result.data,
              expiresInMs: 24 * 60 * 60 * 1000,
            });

            conversationTracker.logPause(
              sessionId,
              "clarification",
              `Eye ${eyeName} requested additional clarification during resume`,
            );

            if (ws) {
              ws.broadcastToSession(sessionId, {
                type: "pipeline_paused",
                reason: "clarification",
                eye: eyeName,
                timestamp: Date.now(),
              });
            }

            orderGuard.unmarkAsAutoRouterSession(sessionId);
            return {
              sessionId,
              results,
              completed: false,
              paused: true,
              pauseReason: "clarification",
              data: {
                questions: result.data?.questions as Array<{
                  field: string;
                  question: string;
                }>,
              },
            };
          }

          // Check for guidance complete - ready for draft
          if (
            GUIDANCE_COMPLETE_CODES.has(result.code) ||
            eyeName.toLowerCase() === EyeId.KYUUBI
          ) {
            // Kyuubi has produced a brief - pause for draft submission
            const brief =
              result.data?.brief || result.data?.structuredPrompt || result.md;
            const requirements = result.data?.requirements as
              | string[]
              | undefined;
            const checkpoints = result.data?.checkpoints as
              | string[]
              | undefined;

            await pauseManager.pausePipeline({
              sessionId,
              currentEye: eyeName,
              reason: "clarification", // We'll add draft_submission to the DB later
              pendingData: {
                brief,
                requirements,
                checkpoints,
                awaitingDraft: true,
              },
              expiresInMs: 24 * 60 * 60 * 1000,
            });

            conversationTracker.logAgentMessage(
              sessionId,
              eyeName,
              `**Guidance Complete - Awaiting Draft**\n\n${typeof brief === "string" ? brief : JSON.stringify(brief)}`,
              {
                type: "guidance_complete",
                awaitingDraft: true,
                requirements,
                checkpoints,
              },
            );

            conversationTracker.logPause(
              sessionId,
              "clarification", // Will be draft_submission once DB updated
              "Guidance phase complete - awaiting agent draft submission",
            );

            if (ws) {
              ws.broadcastToSession(sessionId, {
                type: "pipeline_paused",
                reason: "draft_submission",
                eye: eyeName,
                data: { brief, requirements, checkpoints },
                timestamp: Date.now(),
              });
            }

            orderGuard.unmarkAsAutoRouterSession(sessionId);
            return {
              sessionId,
              results,
              completed: false,
              paused: true,
              pauseReason: "draft_submission",
              data: {
                brief:
                  typeof brief === "string" ? brief : JSON.stringify(brief),
                requirements,
                checkpoints,
              },
            };
          }

          if (isRejected(result)) {
            orderGuard.unmarkAsAutoRouterSession(sessionId);
            return {
              sessionId,
              results,
              completed: false,
              error: `Pipeline stopped: ${eyeName} rejected with ${result.code}`,
            };
          }
        }
      }

      // Continue with remaining validation eyes
      const nextEyes = orderGuard.getExpectedNext(sessionId);
      if (!nextEyes || nextEyes.length === 0) {
        orderGuard.unmarkAsAutoRouterSession(sessionId);
        return {
          sessionId,
          results,
          completed: true,
        };
      }

      conversationTracker.logResume(
        sessionId,
        `Continuing with ${nextEyes.length} remaining eyes: ${nextEyes.join(", ")}`,
        { resolvedFacts, remainingEyes: nextEyes },
      );

      // Broadcast continuation
      if (ws) {
        ws.broadcastToSession(sessionId, {
          type: "pipeline_resumed",
          sessionId,
          data: {
            phase: "validation",
            remainingEyes: nextEyes,
            resolvedFacts,
            completedEyes: state.completedEyes,
          },
          timestamp: Date.now(),
        });
      }

      const remainingEyes = nextEyes;

      for (let i = 0; i < remainingEyes.length; i++) {
        const eyeName = remainingEyes[i];

        // Emit eye_started event
        if (ws) {
          ws.broadcastToSession(sessionId, {
            type: "eye_started",
            eye: eyeName,
            step: state.completedEyes.length + i + 1,
            totalSteps: state.completedEyes.length + remainingEyes.length,
            timestamp: Date.now(),
          });
        }

        const result = await this.orchestrator.runEye(
          eyeName,
          enrichedInput,
          sessionId,
        );
        results.push(result);

        // Phase 5: Log agent message from eye
        conversationTracker.logAgentMessage(
          sessionId,
          eyeName,
          result.md || "Eye completed execution",
          {
            code: result.code,
            ok: result.ok,
            step: state.completedEyes.length + i + 1,
            totalSteps: state.completedEyes.length + remainingEyes.length,
            resumed: true,
          },
        );

        // Emit eye_complete event
        if (ws) {
          ws.broadcastToSession(sessionId, {
            type: "eye_complete",
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

        // FIX 12: Check for NEW pauses during resume loop
        if (
          result.code === EyeStatusCode.AWAIT_CONFIRMATION ||
          result.code === EyeStatusCode.E_INTENT_UNCONFIRMED
        ) {
          await pauseManager.pausePipeline({
            sessionId,
            currentEye: eyeName,
            reason: "confirmation",
            pendingData: result.data,
            expiresInMs: 24 * 60 * 60 * 1000,
          });

          conversationTracker.logPause(
            sessionId,
            "confirmation",
            `Eye ${eyeName} requested confirmation during validation`,
          );

          if (ws) {
            ws.broadcastToSession(sessionId, {
              type: "pipeline_paused",
              reason: "confirmation",
              eye: eyeName,
              timestamp: Date.now(),
            });
          }

          orderGuard.unmarkAsAutoRouterSession(sessionId);
          return {
            sessionId,
            results,
            completed: false,
            paused: true,
            pauseReason: "confirmation",
          };
        }

        if (
          result.code === EyeStatusCode.NEED_CLARIFICATION ||
          result.code === EyeStatusCode.E_NEEDS_CLARIFICATION
        ) {
          await pauseManager.pausePipeline({
            sessionId,
            currentEye: eyeName,
            reason: "clarification",
            pendingData: result.data,
            expiresInMs: 24 * 60 * 60 * 1000,
          });

          conversationTracker.logPause(
            sessionId,
            "clarification",
            `Eye ${eyeName} requested clarification during validation`,
          );

          if (ws) {
            ws.broadcastToSession(sessionId, {
              type: "pipeline_paused",
              reason: "clarification",
              eye: eyeName,
              timestamp: Date.now(),
            });
          }

          orderGuard.unmarkAsAutoRouterSession(sessionId);
          return {
            sessionId,
            results,
            completed: false,
            paused: true,
            pauseReason: "clarification",
            data: {
              questions: result.data?.questions as Array<{
                field: string;
                question: string;
              }>,
            },
          };
        }

        if (isRejected(result)) {
          orderGuard.unmarkAsAutoRouterSession(sessionId);
          return {
            sessionId,
            results,
            completed: false,
            error: `Pipeline stopped: ${eyeName} rejected with ${result.code}`,
          };
        }
      }

      // Unmark session after completion
      orderGuard.unmarkAsAutoRouterSession(sessionId);

      return {
        sessionId,
        results,
        completed: true,
      };
    } catch (error) {
      return {
        sessionId,
        results: [],
        completed: false,
        error: `Resume failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  /**
   * Resume pipeline with a draft submission (after guidance phase)
   * This runs the validation eyes (Mangekyō, Tenseigan, Byakugan) on the submitted draft.
   */
  async resumeWithDraft(
    sessionId: string,
    draft: string,
    options: AutoRouterOptions = {},
  ): Promise<AutoRoutingResult> {
    try {
      const { getDb } = await import("@third-eye/db");
      const { sqlite } = getDb();

      // Get pipeline state to verify we're awaiting draft
      const { PauseResumeManager } = await import("./pause-resume-manager");
      const pauseManager = new PauseResumeManager(sqlite);
      const pipelineState = await pauseManager.getPipelineState(sessionId);

      if (!pipelineState) {
        return {
          sessionId,
          results: [],
          completed: false,
          error: "No pipeline state found - cannot submit draft",
        };
      }

      // Verify we're in draft submission state
      if (!pipelineState.pendingData?.awaitingDraft) {
        return {
          sessionId,
          results: [],
          completed: false,
          error: "Pipeline is not awaiting draft submission",
        };
      }

      // Mark as auto-router controlled
      orderGuard.markAsAutoRouterSession(sessionId);

      // Initialize trackers
      const conversationTracker = new ConversationTracker(sqlite);
      const { getWebSocketBridge } = await import("./websocket-registry");
      const ws = getWebSocketBridge();

      // Log draft submission
      conversationTracker.logHumanMessage(
        sessionId,
        `**Draft Submitted for Validation:**\n\n${draft.substring(0, 500)}${draft.length > 500 ? "..." : ""}`,
      );

      // Build validation input with the draft and original guidance
      const brief = pipelineState.pendingData?.brief;
      const requirements = pipelineState.pendingData?.requirements as
        | string[]
        | undefined;

      const validationInput = `${CLARITY_VALIDATED_HEADER}
Task clarity has been validated. Proceeding to validation phase.

Original Guidance Brief:
${typeof brief === "string" ? brief : JSON.stringify(brief)}

${requirements ? `Requirements:\n${requirements.map((r, i) => `${i + 1}. ${r}`).join("\n")}` : ""}

---

DRAFT SUBMITTED FOR VALIDATION:

${draft}

---

Validate this draft against the guidance brief and requirements above.`;

      // Get remaining validation eyes
      const state = orderGuard.getState(sessionId);
      const validationEyes = orderGuard.getExpectedNext(sessionId);

      if (!validationEyes || validationEyes.length === 0) {
        // Fallback to standard validation eyes
        const { getAllActiveEyes } =
          await import("@third-eye/db/utils/lookups");
        const activeEyes = await getAllActiveEyes();
        const eyeNames = activeEyes.map((e) => e.name.toLowerCase());

        // Use Mangekyō for code, Tenseigan for text, Byakugan for consistency
        const defaultValidation = [
          EyeId.TENSEIGAN,
          EyeId.BYAKUGAN,
        ] as EyeName[];
        validationEyes.push(
          ...defaultValidation.filter((e) => eyeNames.includes(e)),
        );
      }

      conversationTracker.logResume(
        sessionId,
        `Validating draft with ${validationEyes.length} eyes: ${validationEyes.join(", ")}`,
        { phase: "validation", validationEyes },
      );

      // Broadcast draft received
      if (ws) {
        ws.broadcastToSession(sessionId, {
          type: "draft_submitted",
          sessionId,
          data: {
            draftLength: draft.length,
            validationEyes,
          },
          timestamp: Date.now(),
        });
      }

      const results: BaseEnvelope[] = [];
      const baseStep = state?.completedEyes.length || 0;

      for (let i = 0; i < validationEyes.length; i++) {
        const eyeName = validationEyes[i];

        // Emit eye_started event
        if (ws) {
          ws.broadcastToSession(sessionId, {
            type: "eye_started",
            eye: eyeName,
            step: baseStep + i + 1,
            totalSteps: baseStep + validationEyes.length,
            phase: "validation",
            timestamp: Date.now(),
          });
        }

        const result = await this.orchestrator.runEye(
          eyeName,
          validationInput,
          sessionId,
        );
        results.push(result);

        // Log agent message
        conversationTracker.logAgentMessage(
          sessionId,
          eyeName,
          result.md || "Validation complete",
          {
            code: result.code,
            ok: result.ok,
            step: baseStep + i + 1,
            phase: "validation",
          },
        );

        // Emit eye_complete event
        if (ws) {
          ws.broadcastToSession(sessionId, {
            type: "eye_complete",
            eye: eyeName,
            step: baseStep + i + 1,
            totalSteps: baseStep + validationEyes.length,
            phase: "validation",
            result: {
              ok: result.ok,
              code: result.code,
              md: result.md?.substring(0, 200),
            },
            timestamp: Date.now(),
          });
        }

        // Check for issues requiring revision
        if (isRejected(result)) {
          orderGuard.unmarkAsAutoRouterSession(sessionId);

          // Mark pipeline as needing revision, not failed
          return {
            sessionId,
            results,
            completed: false,
            error: `Validation failed: ${eyeName} - ${result.code}. Please revise and resubmit.`,
          };
        }
      }

      // Complete the pipeline
      await pauseManager.completePipeline(sessionId);
      orderGuard.unmarkAsAutoRouterSession(sessionId);

      // Broadcast completion
      if (ws) {
        ws.broadcastToSession(sessionId, {
          type: "pipeline_complete",
          sessionId,
          data: {
            totalSteps: baseStep + validationEyes.length,
            verdict: "APPROVED",
          },
          timestamp: Date.now(),
        });
      }

      return {
        sessionId,
        results,
        completed: true,
      };
    } catch (error) {
      return {
        sessionId,
        results: [],
        completed: false,
        error: `Draft validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }
}

// Export singleton instance
export const autoRouter = new AutoRouter();
