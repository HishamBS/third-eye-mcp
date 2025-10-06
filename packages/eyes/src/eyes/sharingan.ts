import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Sharingan-specific metadata
export const SharinganMetadata = z.object({
  ambiguityScore: z.number().min(0).max(100), // 0 = crystal clear, 100 = completely ambiguous
  ambiguousTerms: z.array(z.string()), // List of ambiguous terms found
  missingContext: z.array(z.string()), // What context is missing
  clarifyingQuestions: z.array(z.string()), // Questions to resolve ambiguity
});

// Sharingan envelope extends base
export const SharinganEnvelopeSchema = BaseEnvelopeSchema.extend({
  eye: z.literal('sharingan'),
  metadata: SharinganMetadata.optional(),
});

export type SharinganEnvelope = z.infer<typeof SharinganEnvelopeSchema>;

/**
 * Sharingan Eye - Ambiguity Radar
 * Detects vague, ambiguous, or underspecified requests
 */
export class SharinganEye implements BaseEye {
  readonly name = 'sharingan';
  readonly description = 'Ambiguity Radar - Detects vague or underspecified requests';
  readonly version = '1.0.0';

  async process(input: string, context?: Record<string, any>): Promise<SharinganEnvelope> {
    try {
      // Ambiguity detection patterns
      const vagueTerms = [
        'somehow', 'maybe', 'kinda', 'sorta', 'probably', 'possibly',
        'some', 'few', 'several', 'many', 'various', 'stuff', 'things',
        'it', 'that', 'this', 'those', 'these', 'etc', 'and so on'
      ];

      const ambiguousVerbs = [
        'improve', 'optimize', 'enhance', 'better', 'fix', 'handle',
        'deal with', 'take care of', 'work on', 'update'
      ];

      const missingSpecifics = {
        'what': ['what', 'which', 'where', 'when', 'who', 'how'],
        'numbers': /\d+/g,
        'specificity': ['specific', 'exactly', 'precisely', 'must', 'should', 'will']
      };

      const lowerInput = input.toLowerCase();
      const words = lowerInput.split(/\s+/);

      // Calculate ambiguity score
      let ambiguityScore = 0;
      const ambiguousTerms: string[] = [];
      const missingContext: string[] = [];
      const clarifyingQuestions: string[] = [];

      // Check for vague terms
      vagueTerms.forEach(term => {
        if (lowerInput.includes(term)) {
          ambiguityScore += 5;
          ambiguousTerms.push(term);
        }
      });

      // Check for ambiguous verbs without specifics
      ambiguousVerbs.forEach(verb => {
        if (lowerInput.includes(verb)) {
          ambiguityScore += 3;
          ambiguousTerms.push(verb);
        }
      });

      // Check for pronouns without clear antecedents
      const pronouns = ['it', 'this', 'that', 'these', 'those'];
      pronouns.forEach(pronoun => {
        const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
        const matches = input.match(regex);
        if (matches && matches.length > 2) {
          ambiguityScore += 8;
          missingContext.push(`Unclear referents for pronoun "${pronoun}"`);
        }
      });

      // Check for missing specificity indicators
      const hasNumbers = /\d+/.test(input);
      const hasSpecificWords = missingSpecifics.specificity.some(word => lowerInput.includes(word));

      if (!hasNumbers && words.length > 10) {
        ambiguityScore += 10;
        missingContext.push('No specific quantities or measurements provided');
        clarifyingQuestions.push('What are the specific quantities, counts, or measurements involved?');
      }

      if (!hasSpecificWords && words.length > 15) {
        ambiguityScore += 8;
        missingContext.push('No clear requirements or constraints specified');
        clarifyingQuestions.push('What are the specific requirements or constraints?');
      }

      // Check for question words indicating uncertainty
      const questionWords = ['what', 'which', 'where', 'when', 'who', 'how'];
      questionWords.forEach(word => {
        if (lowerInput.includes(word) && !input.trim().endsWith('?')) {
          ambiguityScore += 6;
          missingContext.push(`Embedded question about "${word}" without resolution`);
        }
      });

      // Check for "or" clauses indicating uncertainty
      const orCount = (input.match(/\bor\b/gi) || []).length;
      if (orCount > 2) {
        ambiguityScore += orCount * 4;
        missingContext.push('Multiple alternatives presented without clear preference');
        clarifyingQuestions.push('Which specific option do you prefer?');
      }

      // Cap ambiguity score at 100
      ambiguityScore = Math.min(ambiguityScore, 100);

      // Determine verdict based on ambiguity score
      let verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT';
      let code: SharinganEnvelope['code'];
      let summary: string;

      if (ambiguityScore >= 60) {
        verdict = 'REJECTED';
        code = 'REJECT_AMBIGUOUS';
        summary = `Request is too ambiguous (score: ${ambiguityScore}/100). Multiple vague terms and missing context detected.`;
      } else if (ambiguityScore >= 30) {
        verdict = 'NEEDS_INPUT';
        code = 'NEED_CLARIFICATION';
        summary = `Request has moderate ambiguity (score: ${ambiguityScore}/100). Some clarification would improve precision.`;
      } else {
        verdict = 'APPROVED';
        code = ambiguityScore > 0 ? 'OK_WITH_NOTES' : 'OK';
        summary = `Request is clear (ambiguity score: ${ambiguityScore}/100).`;
      }

      // Generate clarifying questions based on missing context
      if (missingContext.length > 0 && clarifyingQuestions.length === 0) {
        missingContext.slice(0, 3).forEach(missing => {
          clarifyingQuestions.push(`Can you clarify: ${missing}?`);
        });
      }

      return {
        eye: 'sharingan',
        code,
        verdict,
        summary,
        details: ambiguityScore > 0
          ? `Detected ${ambiguousTerms.length} ambiguous terms and ${missingContext.length} missing context items. ` +
            `Ambiguous terms: ${ambiguousTerms.slice(0, 5).join(', ')}${ambiguousTerms.length > 5 ? '...' : ''}`
          : undefined,
        suggestions: clarifyingQuestions.length > 0 ? clarifyingQuestions.slice(0, 3) : undefined,
        confidence: Math.max(70, 100 - ambiguityScore / 2), // Higher ambiguity = lower confidence
        metadata: {
          ambiguityScore,
          ambiguousTerms: ambiguousTerms.slice(0, 10),
          missingContext: missingContext.slice(0, 5),
          clarifyingQuestions: clarifyingQuestions.slice(0, 5),
        },
      };
    } catch (error) {
      return {
        eye: 'sharingan',
        code: 'EYE_ERROR',
        verdict: 'NEEDS_INPUT',
        summary: `Sharingan processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
      };
    }
  }

  validate(envelope: unknown): envelope is SharinganEnvelope {
    return SharinganEnvelopeSchema.safeParse(envelope).success;
  }

  getPersona(): string {
    return `You are Sharingan, the Ambiguity Radar Eye of the Third Eye MCP system.

Your SOLE PURPOSE is to detect vague, ambiguous, or underspecified requests and demand clarity.

## Your Abilities
- Spot vague terms (somehow, maybe, kinda, stuff, things, etc.)
- Identify ambiguous verbs without clear targets (improve, optimize, enhance, fix)
- Detect pronouns with unclear referents (it, this, that, these, those)
- Flag missing specificity (no quantities, measurements, or concrete requirements)
- Recognize embedded questions that indicate uncertainty

## Response Protocol
You must ALWAYS return a valid JSON envelope:
{
  "eye": "sharingan",
  "code": "OK" | "OK_WITH_NOTES" | "REJECT_AMBIGUOUS" | "NEED_CLARIFICATION",
  "verdict": "APPROVED" | "REJECTED" | "NEEDS_INPUT",
  "summary": "Brief explanation (max 500 chars)",
  "details": "Extended analysis (optional)",
  "suggestions": ["Clarifying question 1", "Clarifying question 2", ...],
  "confidence": 0-100,
  "metadata": {
    "ambiguityScore": 0-100,
    "ambiguousTerms": ["term1", "term2", ...],
    "missingContext": ["context1", "context2", ...],
    "clarifyingQuestions": ["question1", "question2", ...]
  }
}

## Severity Thresholds
- Score 0-29: APPROVED (clear enough to proceed)
- Score 30-59: NEEDS_INPUT (moderate ambiguity, request clarification)
- Score 60-100: REJECTED (too ambiguous, must clarify before proceeding)

## Example Judgments

**REJECT (Score 85)**
Input: "Can you somehow improve this thing and make it better?"
Analysis: "somehow" (vague method), "this thing" (unclear referent), "improve"/"better" (no specifics)
Questions: ["What specifically needs improvement?", "What does 'this thing' refer to?", "What defines 'better' in this context?"]

**NEED_CLARIFICATION (Score 45)**
Input: "Update the user settings to handle various edge cases"
Analysis: "update" (ambiguous action), "various" (unspecified count), "edge cases" (which ones?)
Questions: ["Which specific edge cases?", "What kind of update is needed?"]

**APPROVED (Score 15)**
Input: "Add email validation to the signup form that checks for @ symbol and domain"
Analysis: Specific action (add), clear target (signup form), defined requirements (@ and domain)

Be ruthless about ambiguity. Precision saves time.`;
  }
}

// Export singleton instance
export const sharingan = new SharinganEye();
