import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Jōgan-specific metadata
export const JoganMetadata = z.object({
  primaryIntent: z.enum([
    'create', 'read', 'update', 'delete', 'refactor', 'debug', 'test', 'document',
    'deploy', 'configure', 'analyze', 'optimize', 'secure', 'migrate', 'unknown'
  ]),
  secondaryIntents: z.array(z.string()),
  intentConfidence: z.number().min(0).max(100),
  implicitRequirements: z.array(z.string()), // What they didn't say but probably need
  potentialMisalignment: z.array(z.string()), // Where stated vs. intended might differ
  suggestedScope: z.enum(['minimal', 'moderate', 'comprehensive', 'unclear']),
});

export const JoganEnvelopeSchema = BaseEnvelopeSchema.extend({
  eye: z.literal('jogan'),
  metadata: JoganMetadata.optional(),
});

export type JoganEnvelope = z.infer<typeof JoganEnvelopeSchema>;

/**
 * Jōgan Eye - Intent Analysis
 * Analyzes the true intent behind requests, detecting misalignment between stated and intended goals
 */
export class JoganEye implements BaseEye {
  readonly name = 'jogan';
  readonly description = 'Intent Analyzer - Detects true intent and hidden requirements';
  readonly version = '1.0.0';

  async process(input: string, context?: Record<string, any>): Promise<JoganEnvelope> {
    try {
      const lowerInput = input.toLowerCase();

      // Detect primary intent
      const intentPatterns = [
        { intent: 'create' as const, patterns: ['create', 'build', 'add', 'implement', 'make', 'new', 'generate'] },
        { intent: 'read' as const, patterns: ['show', 'display', 'get', 'fetch', 'retrieve', 'find', 'search', 'list'] },
        { intent: 'update' as const, patterns: ['update', 'modify', 'change', 'edit', 'alter', 'improve', 'enhance'] },
        { intent: 'delete' as const, patterns: ['delete', 'remove', 'drop', 'clear', 'destroy'] },
        { intent: 'refactor' as const, patterns: ['refactor', 'restructure', 'reorganize', 'clean up', 'simplify'] },
        { intent: 'debug' as const, patterns: ['debug', 'fix', 'solve', 'troubleshoot', 'diagnose', 'error', 'bug'] },
        { intent: 'test' as const, patterns: ['test', 'verify', 'validate', 'check', 'ensure', 'confirm'] },
        { intent: 'document' as const, patterns: ['document', 'explain', 'describe', 'comment', 'readme', 'guide'] },
        { intent: 'deploy' as const, patterns: ['deploy', 'release', 'publish', 'ship', 'launch'] },
        { intent: 'configure' as const, patterns: ['configure', 'setup', 'set up', 'install', 'initialize'] },
        { intent: 'analyze' as const, patterns: ['analyze', 'review', 'audit', 'investigate', 'examine', 'inspect'] },
        { intent: 'optimize' as const, patterns: ['optimize', 'improve performance', 'speed up', 'reduce', 'minimize'] },
        { intent: 'secure' as const, patterns: ['secure', 'protect', 'encrypt', 'authenticate', 'authorize', 'permission'] },
        { intent: 'migrate' as const, patterns: ['migrate', 'move', 'transfer', 'convert', 'upgrade', 'port'] },
      ];

      let primaryIntent: JoganMetadata['primaryIntent'] = 'unknown';
      let intentConfidence = 0;
      const secondaryIntents: string[] = [];

      // Score each intent
      const intentScores = intentPatterns.map(({ intent, patterns }) => {
        const score = patterns.filter(pattern => lowerInput.includes(pattern)).length;
        return { intent, score };
      });

      // Sort by score
      intentScores.sort((a, b) => b.score - a.score);

      if (intentScores[0].score > 0) {
        primaryIntent = intentScores[0].intent;
        intentConfidence = Math.min(intentScores[0].score * 30, 100);

        // Capture secondary intents
        intentScores.slice(1, 4).forEach(({ intent, score }) => {
          if (score > 0) {
            secondaryIntents.push(intent);
          }
        });
      }

      // Detect implicit requirements based on intent
      const implicitRequirements: string[] = [];

      if (primaryIntent === 'create') {
        implicitRequirements.push('Input validation rules');
        implicitRequirements.push('Error handling strategy');
        if (lowerInput.includes('user') || lowerInput.includes('form')) {
          implicitRequirements.push('User feedback mechanism');
        }
        if (lowerInput.includes('api') || lowerInput.includes('endpoint')) {
          implicitRequirements.push('API documentation');
          implicitRequirements.push('Request/response schemas');
        }
      }

      if (primaryIntent === 'update' || primaryIntent === 'delete') {
        implicitRequirements.push('Data backup or rollback mechanism');
        implicitRequirements.push('Concurrent update handling');
        implicitRequirements.push('Audit logging');
      }

      if (primaryIntent === 'secure') {
        implicitRequirements.push('Threat model definition');
        implicitRequirements.push('Security testing plan');
        implicitRequirements.push('Compliance requirements (GDPR, HIPAA, etc.)');
      }

      if (primaryIntent === 'deploy') {
        implicitRequirements.push('Environment configuration');
        implicitRequirements.push('Monitoring and alerting setup');
        implicitRequirements.push('Rollback procedure');
      }

      if (lowerInput.includes('database') || lowerInput.includes('db')) {
        implicitRequirements.push('Migration strategy');
        implicitRequirements.push('Index optimization');
      }

      if (lowerInput.includes('performance') || lowerInput.includes('optimize')) {
        implicitRequirements.push('Performance benchmarks');
        implicitRequirements.push('Profiling data');
      }

      // Detect potential misalignment
      const potentialMisalignment: string[] = [];

      // Check for "just" or "simple" - often underestimated
      if (lowerInput.includes('just ') || lowerInput.includes('simple') || lowerInput.includes('quick')) {
        potentialMisalignment.push('Request may underestimate complexity (uses "just", "simple", or "quick")');
        intentConfidence -= 15;
      }

      // Check for multiple conflicting intents
      if (secondaryIntents.length > 2) {
        potentialMisalignment.push('Multiple intents detected - may need to break into separate tasks');
        intentConfidence -= 10;
      }

      // Check for vague scope indicators
      if (lowerInput.includes('everything') || lowerInput.includes('all') || lowerInput.includes('complete')) {
        potentialMisalignment.push('Scope may be too broad ("everything", "all", "complete")');
      }

      // Determine suggested scope
      let suggestedScope: JoganMetadata['suggestedScope'] = 'unclear';

      if (primaryIntent === 'unknown' || intentConfidence < 40) {
        suggestedScope = 'unclear';
      } else if (lowerInput.length < 50 && secondaryIntents.length === 0) {
        suggestedScope = 'minimal';
      } else if (secondaryIntents.length > 2 || lowerInput.length > 200) {
        suggestedScope = 'comprehensive';
      } else {
        suggestedScope = 'moderate';
      }

      // Determine verdict
      let verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT';
      let code: JoganEnvelope['code'];
      let summary: string;

      if (primaryIntent === 'unknown' || intentConfidence < 30) {
        verdict = 'NEEDS_INPUT';
        code = 'NEED_MORE_CONTEXT';
        summary = `Cannot determine primary intent (confidence: ${intentConfidence}%). Need clearer action verbs or context.`;
      } else if (potentialMisalignment.length > 2 || intentConfidence < 50) {
        verdict = 'NEEDS_INPUT';
        code = 'NEED_CLARIFICATION';
        summary = `Intent detected (${primaryIntent}) but ${potentialMisalignment.length} potential misalignments found. Confidence: ${intentConfidence}%.`;
      } else {
        verdict = 'APPROVED';
        code = intentConfidence > 70 ? 'OK' : 'OK_WITH_NOTES';
        summary = `Primary intent: ${primaryIntent} (confidence: ${intentConfidence}%). Scope: ${suggestedScope}.`;
      }

      const suggestions: string[] = [];

      if (implicitRequirements.length > 0) {
        suggestions.push(`Consider these implicit requirements: ${implicitRequirements.slice(0, 3).join(', ')}`);
      }

      if (potentialMisalignment.length > 0) {
        suggestions.push(...potentialMisalignment.slice(0, 2));
      }

      if (suggestedScope === 'comprehensive') {
        suggestions.push('Consider breaking this into smaller, focused tasks');
      }

      return {
        eye: 'jogan',
        code,
        verdict,
        summary,
        details: `Primary intent: ${primaryIntent}. Secondary intents: ${secondaryIntents.join(', ') || 'none'}. ` +
          `Detected ${implicitRequirements.length} implicit requirements and ${potentialMisalignment.length} potential misalignments.`,
        suggestions: suggestions.length > 0 ? suggestions.slice(0, 5) : undefined,
        confidence: Math.max(0, intentConfidence),
        metadata: {
          primaryIntent,
          secondaryIntents,
          intentConfidence: Math.max(0, intentConfidence),
          implicitRequirements,
          potentialMisalignment,
          suggestedScope,
        },
      };
    } catch (error) {
      return {
        eye: 'jogan',
        code: 'EYE_ERROR',
        verdict: 'NEEDS_INPUT',
        summary: `Jōgan processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
      };
    }
  }

  validate(envelope: unknown): envelope is JoganEnvelope {
    return JoganEnvelopeSchema.safeParse(envelope).success;
  }

  getPersona(): string {
    return `You are Jōgan, the Intent Analysis Eye of the Third Eye MCP system.

Your SOLE PURPOSE is to detect the TRUE intent behind requests and identify hidden requirements.

## Your Abilities
- Classify primary intent (create, read, update, delete, refactor, debug, test, etc.)
- Detect secondary and conflicting intents
- Identify implicit requirements based on intent patterns
- Flag potential misalignment between stated and intended goals
- Assess scope (minimal, moderate, comprehensive)

## Response Protocol
You must ALWAYS return a valid JSON envelope:
{
  "eye": "jogan",
  "code": "OK" | "OK_WITH_NOTES" | "NEED_MORE_CONTEXT" | "NEED_CLARIFICATION",
  "verdict": "APPROVED" | "NEEDS_INPUT",
  "summary": "Brief explanation (max 500 chars)",
  "details": "Intent analysis with implicit requirements",
  "suggestions": ["Implicit requirement 1", "Misalignment warning 1", ...],
  "confidence": 0-100,
  "metadata": {
    "primaryIntent": "create" | "read" | "update" | "delete" | etc.,
    "secondaryIntents": ["intent2", "intent3", ...],
    "intentConfidence": 0-100,
    "implicitRequirements": ["requirement1", "requirement2", ...],
    "potentialMisalignment": ["warning1", "warning2", ...],
    "suggestedScope": "minimal" | "moderate" | "comprehensive" | "unclear"
  }
}

## Intent Categories
- CREATE: Build, add, implement, make, generate new things
- READ: Show, display, get, fetch, retrieve, search, list
- UPDATE: Modify, change, edit, improve, enhance existing
- DELETE: Remove, drop, clear, destroy
- REFACTOR: Restructure, reorganize, clean up code
- DEBUG: Fix, solve, troubleshoot, diagnose errors
- TEST: Verify, validate, check, ensure correctness
- DOCUMENT: Explain, describe, comment, write guides
- DEPLOY: Release, publish, ship, launch
- CONFIGURE: Setup, install, initialize systems
- ANALYZE: Review, audit, investigate, examine
- OPTIMIZE: Improve performance, reduce, minimize
- SECURE: Protect, encrypt, authenticate, authorize
- MIGRATE: Move, transfer, convert, upgrade

## Confidence Thresholds
- 70-100%: High confidence (OK)
- 50-69%: Medium confidence (OK_WITH_NOTES)
- 30-49%: Low confidence (NEED_CLARIFICATION)
- 0-29%: Unknown intent (NEED_MORE_CONTEXT)

## Implicit Requirements by Intent

**CREATE**:
- Input validation rules
- Error handling strategy
- User feedback mechanism (if UI)
- API documentation (if endpoint)

**UPDATE/DELETE**:
- Backup/rollback mechanism
- Concurrent update handling
- Audit logging

**SECURE**:
- Threat model definition
- Security testing plan
- Compliance requirements

**DEPLOY**:
- Environment configuration
- Monitoring setup
- Rollback procedure

## Example Judgments

**NEED_MORE_CONTEXT (Confidence 25%)**
Input: "Do something with the user data"
Analysis: Vague verb "do something", unclear what operation
Intent: Unknown
Questions: ["What specific operation?", "Create, update, or delete?", "Which user data fields?"]

**NEED_CLARIFICATION (Confidence 45%)**
Input: "Just quickly add a simple user login"
Analysis:
- Primary: CREATE (add)
- Misalignment: "just", "quickly", "simple" underestimate complexity
- Implicit: Password hashing, session management, rate limiting, forgot password flow
Suggestions: ["This involves authentication, not just a login form", "Consider OAuth vs. custom auth"]

**OK (Confidence 85%)**
Input: "Implement JWT authentication with access tokens (15min expiry) and refresh tokens (7 day expiry), storing hashed passwords with bcrypt rounds=12"
Analysis:
- Primary: CREATE + SECURE
- Scope: Comprehensive
- Implicit requirements addressed: expiry times, hashing algorithm
- Clear, specific, actionable

See through the vague to the true need.`;
  }
}

// Export singleton instance
export const jogan = new JoganEye();
