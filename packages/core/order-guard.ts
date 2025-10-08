/**
 * Order Guard - Pipeline Order Enforcement
 *
 * Enforces proper Eye execution order as specified in prompt.md
 * Returns E_PIPELINE_ORDER when illegal calls are made
 */

import type { EyeName } from '@third-eye/eyes';

export interface PipelineState {
  sessionId: string;
  currentPhase: 'initialization' | 'clarification' | 'planning' | 'implementation' | 'review' | 'completion';
  completedEyes: EyeName[];
  lastEye?: EyeName;
  isCodeRelated: boolean;
  createdAt: Date;
}

export interface OrderViolation {
  code: 'E_PIPELINE_ORDER';
  violation: string; // INTERNAL ONLY - not exposed to agents
  expectedNext: string[]; // INTERNAL ONLY - not exposed to agents
  fixInstructions: string; // INTERNAL ONLY - not exposed to agents
  examplePayload?: { // INTERNAL ONLY - not exposed to agents
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
 * 2. Prompt Helper (with clarifications)
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
        currentPhase: 'initialization',
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
    if (eyeName === 'overseer') {
      return null;
    }

    // Check initialization phase
    if (state.currentPhase === 'initialization') {
      if (eyeName !== 'sharingan') {
        return {
          code: 'E_PIPELINE_ORDER',
          violation: `Cannot call ${eyeName} in initialization phase`,
          expectedNext: ['sharingan'],
          fixInstructions: 'Call Sharingan first to detect ambiguity and determine if task is code-related',
        };
      }
      return null;
    }

    // Check clarification phase
    if (state.currentPhase === 'clarification') {
      if (!state.completedEyes.includes('sharingan')) {
        return {
          code: 'E_PIPELINE_ORDER',
          violation: `${eyeName} called before Sharingan completed`,
          expectedNext: ['sharingan'],
          fixInstructions: 'Complete Sharingan analysis first to detect ambiguity',
        };
      }

      if (eyeName === 'prompt-helper') {
        return null; // Always allowed after Sharingan
      }

      if (eyeName === 'jogan' && state.completedEyes.includes('prompt-helper')) {
        return null; // Allowed after Prompt Helper
      }

      if (eyeName === 'jogan' && !state.completedEyes.includes('prompt-helper')) {
        return {
          code: 'E_PIPELINE_ORDER',
          violation: 'Jōgan called before Prompt Helper',
          expectedNext: ['prompt-helper'],
          fixInstructions: 'Use Prompt Helper to optimize clarity before intent confirmation',
          examplePayload: {
            eye: 'prompt-helper',
            input: {
              ambiguous_prompt: 'make it better',
              clarifying_questions: ['What specifically needs improvement?', 'What are your success criteria?'],
            },
            description: 'Restructure ambiguous prompt into ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT format',
          },
        };
      }

      return {
        code: 'E_PIPELINE_ORDER',
        violation: `${eyeName} not allowed in clarification phase`,
        expectedNext: state.completedEyes.includes('prompt-helper') ? ['jogan'] : ['prompt-helper'],
        fixInstructions: 'Follow clarification sequence: Sharingan → Prompt Helper → Jōgan',
      };
    }

    // Check planning/implementation phase
    if (state.currentPhase === 'planning' || state.currentPhase === 'implementation') {
      const requiredPrereqs: EyeName[] = ['sharingan', 'jogan'];
      const missingPrereqs = requiredPrereqs.filter(eye => !state.completedEyes.includes(eye));

      if (missingPrereqs.length > 0) {
        return {
          code: 'E_PIPELINE_ORDER',
          violation: `${eyeName} called before completing prerequisites: ${missingPrereqs.join(', ')}`,
          expectedNext: missingPrereqs,
          fixInstructions: `Complete clarification phase first: ${missingPrereqs.join(' → ')}`,
        };
      }

      // Code branch logic
      if (state.isCodeRelated) {
        if (eyeName === 'rinnegan') {
          return null; // Always allowed for planning/review
        }

        if (eyeName === 'mangekyo' && state.completedEyes.includes('rinnegan')) {
          return null; // Implementation phases after planning
        }

        if (eyeName === 'mangekyo' && !state.completedEyes.includes('rinnegan')) {
          return {
            code: 'E_PIPELINE_ORDER',
            violation: 'Mangekyō called before Rinnegan planning',
            expectedNext: ['rinnegan'],
            fixInstructions: 'Create implementation plan with Rinnegan before starting Mangekyō phases',
            examplePayload: {
              eye: 'rinnegan',
              input: {
                task: 'Build a REST API for user authentication',
                requirements: ['JWT tokens', 'bcrypt hashing', 'email verification'],
              },
              description: 'Generate strategic plan with file impact table and implementation steps',
            },
          };
        }

        // Tenseigan/Byakugan not allowed in code branch
        if (eyeName === 'tenseigan' || eyeName === 'byakugan') {
          return {
            code: 'E_PIPELINE_ORDER',
            violation: `${eyeName} not allowed in code branch`,
            expectedNext: ['rinnegan', 'mangekyo'],
            fixInstructions: 'For code tasks, use Rinnegan → Mangekyō sequence. Tenseigan/Byakugan are for text analysis.',
            examplePayload: {
              eye: 'rinnegan',
              input: {
                task: 'Implement user authentication',
                phase: 'planning',
              },
              description: 'Rinnegan handles code planning; Tenseigan/Byakugan are for text validation',
            },
          };
        }
      } else {
        // Text branch logic
        if (eyeName === 'tenseigan' || eyeName === 'byakugan') {
          return null; // Allowed for text analysis
        }

        if (eyeName === 'rinnegan') {
          return null; // Optional planning for text
        }

        if (eyeName === 'mangekyo') {
          return {
            code: 'E_PIPELINE_ORDER',
            violation: 'Mangekyō not allowed in text branch',
            expectedNext: ['tenseigan', 'byakugan'],
            fixInstructions: 'For text tasks, use Tenseigan → Byakugan sequence. Mangekyō is for code implementation.',
            examplePayload: {
              eye: 'tenseigan',
              input: {
                draft_md: 'Your text content with claims [citations]',
                mode: 'validate_claims',
              },
              description: 'Tenseigan validates factual claims; Mangekyō is for code review',
            },
          };
        }
      }
    }

    // Check completion phase
    if (state.currentPhase === 'completion') {
      if (eyeName !== 'rinnegan') {
        return {
          code: 'E_PIPELINE_ORDER',
          violation: `Only Rinnegan final approval allowed in completion phase, not ${eyeName}`,
          expectedNext: ['rinnegan'],
          fixInstructions: 'Use Rinnegan for final approval once all gates return ok=true',
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
    result: { code: string; metadata?: Record<string, unknown> }
  ): void {
    const state = this.sessions.get(sessionId);
    if (!state) return;

    // Add to completed eyes
    if (!state.completedEyes.includes(eyeName)) {
      state.completedEyes.push(eyeName);
    }
    state.lastEye = eyeName;

    // Update phase based on completion
    if (eyeName === 'sharingan') {
      state.currentPhase = 'clarification';

      const metadata = result.metadata;
      if (metadata && 'isCodeRelated' in metadata) {
        const value = metadata.isCodeRelated;
        if (typeof value === 'boolean') {
          state.isCodeRelated = value;
        }
      }
    }

    if (eyeName === 'jogan') {
      state.currentPhase = 'planning';
    }

    if (eyeName === 'rinnegan' && state.completedEyes.length > 3) {
      state.currentPhase = 'completion';
    }

    if ((eyeName === 'mangekyo' && state.isCodeRelated) ||
        ((eyeName === 'tenseigan' || eyeName === 'byakugan') && !state.isCodeRelated)) {
      state.currentPhase = 'implementation';
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
      return ['overseer', 'sharingan'];
    }

    switch (state.currentPhase) {
      case 'initialization':
        return ['sharingan'];

      case 'clarification':
        if (!state.completedEyes.includes('prompt-helper')) {
          return ['prompt-helper'];
        }
        if (!state.completedEyes.includes('jogan')) {
          return ['jogan'];
        }
        return ['rinnegan'];

      case 'planning':
        return ['rinnegan'];

      case 'implementation':
        if (state.isCodeRelated) {
          return ['mangekyo', 'rinnegan'];
        } else {
          return ['tenseigan', 'byakugan', 'rinnegan'];
        }

      case 'completion':
        return ['rinnegan'];

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
