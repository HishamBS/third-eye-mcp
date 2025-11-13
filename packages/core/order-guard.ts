/**
 * Order Guard - Pipeline Order Enforcement
 *
 * Enforces proper Eye execution order as specified in prompt.md
 * Returns E_PIPELINE_ORDER when illegal calls are made
 */

import type { EyeName } from "@third-eye/types";
import { EyeId } from "@third-eye/constants";

export interface PipelineState {
  sessionId: string;
  currentPhase:
    | "initialization"
    | "clarification"
    | "planning"
    | "implementation"
    | "review"
    | "completion";
  completedEyes: EyeName[];
  lastEye?: EyeName;
  isCodeRelated: boolean;
  createdAt: Date;
}

export interface OrderViolation {
  code: "E_PIPELINE_ORDER";
  violation: string; // INTERNAL ONLY - not exposed to agents
  expectedNext: string[]; // INTERNAL ONLY - not exposed to agents
  fixInstructions: string; // INTERNAL ONLY - not exposed to agents
  examplePayload?: {
    // INTERNAL ONLY - not exposed to agents
    eye: string;
    input: Record<string, any>;
    description: string;
  };
}

/**
 * Proper pipeline order according to prompt.md:
 *
 * For freeform tasks:
 * 1. Sharingan (ambiguity + is_code_related + questions)
 * 2. Kyuubi (with clarifications)
 * 3. Jōgan (intent confirm)
 * 4a. For CODE: Rinnegan plan → Rinnegan review loop → Mangekyō phases → Rinnegan final
 * 4b. For TEXT: Rinnegan plan (optional) → Tenseigan → Byakugan → Rinnegan final
 *
 * GOLDEN RULE #1: Violation messages are INTERNAL ONLY and NEVER exposed to agents.
 * Orchestrator wraps them in generic agent-friendly messages.
 */
export class OrderGuard {
  private sessions = new Map<string, PipelineState>();
  private autoRouterSessions = new Set<string>();

  /**
   * Mark session as being orchestrated by auto-router
   * Auto-router already knows the correct order, so bypass validation
   */
  markAsAutoRouterSession(sessionId: string): void {
    this.autoRouterSessions.add(sessionId);
  }

  /**
   * Remove auto-router flag (for direct Eye calls after auto-routing completes)
   */
  unmarkAsAutoRouterSession(sessionId: string): void {
    this.autoRouterSessions.delete(sessionId);
  }

  /**
   * Check if session is being orchestrated by auto-router
   */
  isAutoRouterSession(sessionId: string): boolean {
    return this.autoRouterSessions.has(sessionId);
  }

  /**
   * Check if calling an Eye is allowed in current pipeline state
   */
  validateOrder(sessionId: string, eyeName: EyeName): OrderViolation | null {
    let state = this.sessions.get(sessionId);

    // Initialize session if it doesn't exist (even for auto-router sessions)
    if (!state) {
      state = {
        sessionId,
        currentPhase: "initialization",
        completedEyes: [],
        isCodeRelated: false,
        createdAt: new Date(),
      };
      this.sessions.set(sessionId, state);
    }

    // Auto-router sessions bypass validation - auto-router knows the correct order
    // But we still initialize state above so recordEyeCompletion works
    if (this.isAutoRouterSession(sessionId)) {
      return null;
    }

    // Overseer can always be called (navigation entry point)
    // Case-insensitive check: database stores "Overseer" but constant is "overseer"
    if (eyeName.toLowerCase() === EyeId.OVERSEER.toLowerCase()) {
      return null;
    }

    // Check initialization phase
    if (state.currentPhase === "initialization") {
      if (eyeName !== EyeId.SHARINGAN) {
        return {
          code: "E_PIPELINE_ORDER",
          violation: `Cannot call ${eyeName} in initialization phase`,
          expectedNext: [EyeId.SHARINGAN],
          fixInstructions:
            "Call Sharingan first to detect ambiguity and determine if task is code-related",
        };
      }
      return null;
    }

    // Check clarification phase
    if (state.currentPhase === "clarification") {
      if (!state.completedEyes.includes(EyeId.SHARINGAN as EyeName)) {
        return {
          code: "E_PIPELINE_ORDER",
          violation: `${eyeName} called before Sharingan completed`,
          expectedNext: [EyeId.SHARINGAN as EyeName],
          fixInstructions:
            "Complete Sharingan analysis first to detect ambiguity",
        };
      }

      if (eyeName === EyeId.KYUUBI) {
        return null; // Always allowed after Sharingan
      }

      if (
        eyeName === EyeId.JOGAN &&
        state.completedEyes.includes(EyeId.KYUUBI as EyeName)
      ) {
        return null; // Allowed after Kyuubi
      }

      if (
        eyeName === EyeId.JOGAN &&
        !state.completedEyes.includes(EyeId.KYUUBI as EyeName)
      ) {
        return {
          code: "E_PIPELINE_ORDER",
          violation: "Jōgan called before Kyuubi",
          expectedNext: [EyeId.KYUUBI as EyeName],
          fixInstructions:
            "Use Kyuubi to optimize clarity before intent confirmation",
          examplePayload: {
            eye: EyeId.KYUUBI,
            input: {
              ambiguous_prompt: "make it better",
              clarifying_questions: [
                "What specifically needs improvement?",
                "What are your success criteria?",
              ],
            },
            description:
              "Restructure ambiguous prompt into ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT format",
          },
        };
      }

      return {
        code: "E_PIPELINE_ORDER",
        violation: `${eyeName} not allowed in clarification phase`,
        expectedNext: state.completedEyes.includes(EyeId.KYUUBI as EyeName)
          ? [EyeId.JOGAN as EyeName]
          : [EyeId.KYUUBI as EyeName],
        fixInstructions:
          "Follow clarification sequence: Sharingan → Kyuubi → Jōgan",
      };
    }

    // Check planning/implementation phase
    if (
      state.currentPhase === "planning" ||
      state.currentPhase === "implementation"
    ) {
      const requiredPrereqs: EyeName[] = [
        EyeId.SHARINGAN as EyeName,
        EyeId.JOGAN as EyeName,
      ];
      const missingPrereqs = requiredPrereqs.filter(
        (eye) => !state.completedEyes.includes(eye),
      );

      if (missingPrereqs.length > 0) {
        return {
          code: "E_PIPELINE_ORDER",
          violation: `${eyeName} called before completing prerequisites: ${missingPrereqs.join(", ")}`,
          expectedNext: missingPrereqs,
          fixInstructions: `Complete clarification phase first: ${missingPrereqs.join(" → ")}`,
        };
      }

      // Code branch logic
      if (state.isCodeRelated) {
        if (eyeName === EyeId.RINNEGAN) {
          return null; // Always allowed for planning/review
        }

        if (
          eyeName === EyeId.MANGEKYO &&
          state.completedEyes.includes(EyeId.RINNEGAN as EyeName)
        ) {
          return null; // Implementation phases after planning
        }

        if (
          eyeName === EyeId.MANGEKYO &&
          !state.completedEyes.includes(EyeId.RINNEGAN as EyeName)
        ) {
          return {
            code: "E_PIPELINE_ORDER",
            violation: "Mangekyō called before Rinnegan planning",
            expectedNext: [EyeId.RINNEGAN as EyeName],
            fixInstructions:
              "Create implementation plan with Rinnegan before starting Mangekyō phases",
            examplePayload: {
              eye: EyeId.RINNEGAN,
              input: {
                task: "Build a REST API for user authentication",
                requirements: [
                  "JWT tokens",
                  "bcrypt hashing",
                  "email verification",
                ],
              },
              description:
                "Generate strategic plan with file impact table and implementation steps",
            },
          };
        }

        // Tenseigan/Byakugan not allowed in code branch
        if (eyeName === EyeId.TENSEIGAN || eyeName === EyeId.BYAKUGAN) {
          return {
            code: "E_PIPELINE_ORDER",
            violation: `${eyeName} not allowed in code branch`,
            expectedNext: [
              EyeId.RINNEGAN as EyeName,
              EyeId.MANGEKYO as EyeName,
            ],
            fixInstructions:
              "For code tasks, use Rinnegan → Mangekyō sequence. Tenseigan/Byakugan are for text analysis.",
            examplePayload: {
              eye: EyeId.RINNEGAN,
              input: {
                task: "Implement user authentication",
                phase: "planning",
              },
              description:
                "Rinnegan handles code planning; Tenseigan/Byakugan are for text validation",
            },
          };
        }
      } else {
        // Text branch logic
        if (eyeName === EyeId.TENSEIGAN || eyeName === EyeId.BYAKUGAN) {
          return null; // Allowed for text analysis
        }

        if (eyeName === EyeId.RINNEGAN) {
          return null; // Optional planning for text
        }

        if (eyeName === EyeId.MANGEKYO) {
          return {
            code: "E_PIPELINE_ORDER",
            violation: "Mangekyō not allowed in text branch",
            expectedNext: [
              EyeId.TENSEIGAN as EyeName,
              EyeId.BYAKUGAN as EyeName,
            ],
            fixInstructions:
              "For text tasks, use Tenseigan → Byakugan sequence. Mangekyō is for code implementation.",
            examplePayload: {
              eye: EyeId.TENSEIGAN,
              input: {
                draft_md: "Your text content with claims [citations]",
                mode: "validate_claims",
              },
              description:
                "Tenseigan validates factual claims; Mangekyō is for code review",
            },
          };
        }
      }
    }

    // Check completion phase
    if (state.currentPhase === "completion") {
      if (eyeName !== EyeId.RINNEGAN) {
        return {
          code: "E_PIPELINE_ORDER",
          violation: `Only Rinnegan final approval allowed in completion phase, not ${eyeName}`,
          expectedNext: [EyeId.RINNEGAN as EyeName],
          fixInstructions:
            "Use Rinnegan for final approval once all gates return ok=true",
        };
      }
      return null;
    }

    return null;
  }

  /**
   * Update pipeline state after successful Eye execution
   */
  recordEyeCompletion(
    sessionId: string,
    eyeName: EyeName,
    result: { code: string; metadata?: Record<string, unknown> },
  ): void {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    // Add to completed eyes
    if (!state.completedEyes.includes(eyeName)) {
      state.completedEyes.push(eyeName);
    }
    state.lastEye = eyeName;

    // Update phase based on completion
    if (eyeName === EyeId.SHARINGAN) {
      state.currentPhase = "clarification";

      const metadata = result.metadata;
      if (metadata && "isCodeRelated" in metadata) {
        const value = metadata.isCodeRelated;
        if (typeof value === "boolean") {
          state.isCodeRelated = value;
        }
      }
    }

    if (eyeName === EyeId.JOGAN) {
      state.currentPhase = "planning";
    }

    if (eyeName === EyeId.RINNEGAN && state.completedEyes.length > 3) {
      state.currentPhase = "completion";
    }

    if (
      (eyeName === EyeId.MANGEKYO && state.isCodeRelated) ||
      ((eyeName === EyeId.TENSEIGAN || eyeName === EyeId.BYAKUGAN) &&
        !state.isCodeRelated)
    ) {
      state.currentPhase = "implementation";
    }
  }

  /**
   * Get current pipeline state for a session
   */
  getState(sessionId: string): PipelineState | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Get expected next Eyes for a session
   */
  getExpectedNext(sessionId: string): EyeName[] {
    const state = this.sessions.get(sessionId);
    if (!state) {
      return [EyeId.OVERSEER as EyeName, EyeId.SHARINGAN as EyeName];
    }

    switch (state.currentPhase) {
      case "initialization":
        return [EyeId.SHARINGAN as EyeName];

      case "clarification":
        if (!state.completedEyes.includes(EyeId.KYUUBI as EyeName)) {
          return [EyeId.KYUUBI as EyeName];
        }
        if (!state.completedEyes.includes(EyeId.JOGAN as EyeName)) {
          return [EyeId.JOGAN as EyeName];
        }
        return [EyeId.RINNEGAN as EyeName];

      case "planning":
        return [EyeId.RINNEGAN as EyeName];

      case "implementation":
        if (state.isCodeRelated) {
          return [EyeId.MANGEKYO as EyeName, EyeId.RINNEGAN as EyeName];
        } else {
          return [
            EyeId.TENSEIGAN as EyeName,
            EyeId.BYAKUGAN as EyeName,
            EyeId.RINNEGAN as EyeName,
          ];
        }

      case "completion":
        return [EyeId.RINNEGAN as EyeName];

      default:
        return [];
    }
  }

  /**
   * Clear session state (for testing or reset)
   */
  clearSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    this.autoRouterSessions.delete(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): PipelineState[] {
    return Array.from(this.sessions.values());
  }
}

// Export singleton instance
export const orderGuard = new OrderGuard();
