/**
 * Order Guard - Pipeline Order Enforcement
 *
 * Enforces proper Eye execution order as specified in prompt.md
 * Returns E_PIPELINE_ORDER when illegal calls are made
 */
/**
 * Proper pipeline order according to prompt.md:
 *
 * For freeform tasks:
 * 1. Sharingan (ambiguity + is_code_related + questions)
 * 2. Prompt Helper (with clarifications)
 * 3. Jōgan (intent confirm)
 * 4a. For CODE: Rinnegan plan → Rinnegan review loop → Mangekyō phases → Rinnegan final
 * 4b. For TEXT: Rinnegan plan (optional) → Tenseigan → Byakugan → Rinnegan final
 */
export class OrderGuard {
    sessions = new Map();
    /**
     * Check if calling an Eye is allowed in current pipeline state
     */
    validateOrder(sessionId, eyeName) {
        let state = this.sessions.get(sessionId);
        // Initialize session if it doesn't exist
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
            const requiredPrereqs = ['sharingan', 'jogan'];
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
                    };
                }
                // Tenseigan/Byakugan not allowed in code branch
                if (eyeName === 'tenseigan' || eyeName === 'byakugan') {
                    return {
                        code: 'E_PIPELINE_ORDER',
                        violation: `${eyeName} not allowed in code branch`,
                        expectedNext: ['rinnegan', 'mangekyo'],
                        fixInstructions: 'For code tasks, use Rinnegan → Mangekyō sequence. Tenseigan/Byakugan are for text analysis.',
                    };
                }
            }
            else {
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
    recordEyeCompletion(sessionId, eyeName, result) {
        const state = this.sessions.get(sessionId);
        if (!state)
            return;
        // Add to completed eyes
        if (!state.completedEyes.includes(eyeName)) {
            state.completedEyes.push(eyeName);
        }
        state.lastEye = eyeName;
        // Update phase based on completion
        if (eyeName === 'sharingan') {
            state.currentPhase = 'clarification';
            // Detect if task is code-related from Sharingan metadata
            if (result.metadata?.isCodeRelated !== undefined) {
                state.isCodeRelated = result.metadata.isCodeRelated;
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
    getState(sessionId) {
        return this.sessions.get(sessionId) || null;
    }
    /**
     * Get expected next Eyes for a session
     */
    getExpectedNext(sessionId) {
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
                }
                else {
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
    clearSession(sessionId) {
        this.sessions.delete(sessionId);
    }
    /**
     * Get all active sessions
     */
    getActiveSessions() {
        return Array.from(this.sessions.values());
    }
}
// Export singleton instance
export const orderGuard = new OrderGuard();
//# sourceMappingURL=order-guard.js.map