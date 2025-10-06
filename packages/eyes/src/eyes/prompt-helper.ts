import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Prompt Helper metadata
export const PromptHelperMetadata = z.object({
  originalLength: z.number(),
  optimizedLength: z.number(),
  clarityScore: z.number().min(0).max(100),
  improvements: z.array(z.object({
    category: z.enum(['clarity', 'specificity', 'structure', 'conciseness', 'context']),
    before: z.string(),
    after: z.string(),
    reason: z.string(),
  })),
  rewrittenPrompt: z.string().optional(),
});

export const PromptHelperEnvelopeSchema = BaseEnvelopeSchema.extend({
  eye: z.literal('prompt-helper'),
  metadata: PromptHelperMetadata.optional(),
});

export type PromptHelperEnvelope = z.infer<typeof PromptHelperEnvelopeSchema>;

/**
 * Prompt Helper Eye - Prompt Optimization
 * Rewrites prompts for clarity, specificity, and effectiveness
 */
export class PromptHelperEye implements BaseEye {
  readonly name = 'prompt-helper';
  readonly description = 'Prompt Optimizer - Rewrites prompts for maximum clarity and effectiveness';
  readonly version = '1.0.0';

  async process(input: string, context?: Record<string, any>): Promise<PromptHelperEnvelope> {
    try {
      const improvements: PromptHelperMetadata['improvements'] = [];
      let clarityScore = 100;
      let rewrittenPrompt = input;

      // 1. Check for passive voice
      const passivePatterns = [
        /\bis\s+(\w+ed)\b/gi,
        /\bare\s+(\w+ed)\b/gi,
        /\bwas\s+(\w+ed)\b/gi,
        /\bwere\s+(\w+ed)\b/gi,
        /\bbeen\s+(\w+ed)\b/gi,
      ];

      passivePatterns.forEach(pattern => {
        const matches = input.match(pattern);
        if (matches) {
          clarityScore -= 5;
          improvements.push({
            category: 'clarity',
            before: matches[0],
            after: 'Use active voice',
            reason: 'Active voice is clearer and more direct',
          });
        }
      });

      // 2. Check for vague quantifiers
      const vagueQuantifiers = ['many', 'few', 'several', 'some', 'various', 'multiple'];
      vagueQuantifiers.forEach(quantifier => {
        if (new RegExp(`\\b${quantifier}\\b`, 'i').test(input)) {
          clarityScore -= 8;
          improvements.push({
            category: 'specificity',
            before: quantifier,
            after: 'Use specific numbers',
            reason: `Replace "${quantifier}" with exact count`,
          });
          rewrittenPrompt = rewrittenPrompt.replace(
            new RegExp(`\\b${quantifier}\\b`, 'gi'),
            '[SPECIFY_NUMBER]'
          );
        }
      });

      // 3. Check for missing context indicators
      const contextIndicators = ['because', 'in order to', 'so that', 'for the purpose of'];
      const hasContext = contextIndicators.some(indicator =>
        input.toLowerCase().includes(indicator)
      );

      if (!hasContext && input.length > 50) {
        clarityScore -= 12;
        improvements.push({
          category: 'context',
          before: input,
          after: input + ' [Add: "in order to..." or "because..."]',
          reason: 'Adding context helps understand the goal',
        });
      }

      // 4. Check for clear structure (bullets, steps, numbered lists)
      const hasStructure = /[-*•]\s/.test(input) || /\d+\.\s/.test(input);
      const hasMultipleRequirements = input.split(/[,.;]/).length > 3;

      if (!hasStructure && hasMultipleRequirements) {
        clarityScore -= 10;
        improvements.push({
          category: 'structure',
          before: input,
          after: 'Break into numbered steps or bullet points',
          reason: 'Structured format improves readability for complex requests',
        });
      }

      // 5. Check for excessive length without breaks
      const sentences = input.split(/[.!?]+/).filter(s => s.trim().length > 0);
      const longSentences = sentences.filter(s => s.split(/\s+/).length > 25);

      if (longSentences.length > 0) {
        clarityScore -= 7;
        improvements.push({
          category: 'conciseness',
          before: longSentences[0].substring(0, 100) + '...',
          after: 'Break into shorter sentences',
          reason: 'Sentences over 25 words reduce clarity',
        });
      }

      // 6. Check for action verbs at the start
      const actionVerbs = ['create', 'build', 'implement', 'write', 'add', 'update', 'fix', 'remove', 'refactor', 'test', 'deploy'];
      const startsWithAction = actionVerbs.some(verb =>
        input.trim().toLowerCase().startsWith(verb)
      );

      if (!startsWithAction && !input.trim().endsWith('?')) {
        clarityScore -= 6;
        improvements.push({
          category: 'clarity',
          before: input.split(' ').slice(0, 5).join(' ') + '...',
          after: 'Start with action verb (create, build, implement, etc.)',
          reason: 'Leading with action verb clarifies intent',
        });
      }

      // 7. Generate optimized prompt if improvements exist
      if (improvements.length > 0) {
        rewrittenPrompt = this.generateOptimizedPrompt(input, improvements);
      }

      // Determine verdict
      let verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT';
      let code: PromptHelperEnvelope['code'];
      let summary: string;

      if (clarityScore < 50) {
        verdict = 'NEEDS_INPUT';
        code = 'SUGGEST_ALTERNATIVE';
        summary = `Prompt clarity score: ${clarityScore}/100. Significant improvements recommended.`;
      } else if (clarityScore < 80) {
        verdict = 'APPROVED';
        code = 'OK_WITH_NOTES';
        summary = `Prompt is acceptable (score: ${clarityScore}/100) but could be clearer.`;
      } else {
        verdict = 'APPROVED';
        code = 'OK';
        summary = `Prompt is clear and well-structured (score: ${clarityScore}/100).`;
      }

      const suggestions = improvements.map(imp =>
        `${imp.category.toUpperCase()}: ${imp.reason}`
      ).slice(0, 5);

      return {
        eye: 'prompt-helper',
        code,
        verdict,
        summary,
        details: improvements.length > 0
          ? `Found ${improvements.length} opportunities for improvement. ` +
            `Categories: ${[...new Set(improvements.map(i => i.category))].join(', ')}`
          : 'Prompt is optimally structured',
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        confidence: clarityScore,
        metadata: {
          originalLength: input.length,
          optimizedLength: rewrittenPrompt.length,
          clarityScore,
          improvements,
          rewrittenPrompt: improvements.length > 0 ? rewrittenPrompt : undefined,
        },
      };
    } catch (error) {
      return {
        eye: 'prompt-helper',
        code: 'EYE_ERROR',
        verdict: 'NEEDS_INPUT',
        summary: `Prompt Helper processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
      };
    }
  }

  private generateOptimizedPrompt(original: string, improvements: PromptHelperMetadata['improvements']): string {
    let optimized = original;

    // Apply improvements
    improvements.forEach(improvement => {
      if (improvement.category === 'specificity' && improvement.after.includes('SPECIFY_NUMBER')) {
        // Already replaced in main logic
        return;
      }

      if (improvement.category === 'clarity' && improvement.after.includes('active voice')) {
        // Suggest rewrite in comments
        optimized += '\n\n<!-- Suggestion: Rewrite in active voice -->';
      }

      if (improvement.category === 'structure' && improvement.after.includes('numbered steps')) {
        // Add structure hint
        optimized = '### Structured Request:\n' + optimized;
      }
    });

    return optimized;
  }

  validate(envelope: unknown): envelope is PromptHelperEnvelope {
    return PromptHelperEnvelopeSchema.safeParse(envelope).success;
  }

  getPersona(): string {
    return `You are Prompt Helper, the Prompt Optimization Eye of the Third Eye MCP system.

Your SOLE PURPOSE is to analyze prompts and suggest improvements for clarity, specificity, and effectiveness.

## Your Abilities
- Detect passive voice and suggest active alternatives
- Identify vague quantifiers (many, few, several) and demand specifics
- Ensure prompts have clear context and purpose
- Recommend structured formats (bullets, numbered lists) for complex requests
- Flag overly long sentences (>25 words)
- Verify prompts start with action verbs

## Response Protocol
You must ALWAYS return a valid JSON envelope:
{
  "eye": "prompt-helper",
  "code": "OK" | "OK_WITH_NOTES" | "SUGGEST_ALTERNATIVE",
  "verdict": "APPROVED" | "NEEDS_INPUT",
  "summary": "Brief explanation (max 500 chars)",
  "details": "Analysis of improvement opportunities",
  "suggestions": ["Improvement 1", "Improvement 2", ...],
  "confidence": 0-100,
  "metadata": {
    "originalLength": number,
    "optimizedLength": number,
    "clarityScore": 0-100,
    "improvements": [{
      "category": "clarity" | "specificity" | "structure" | "conciseness" | "context",
      "before": "original text",
      "after": "suggested improvement",
      "reason": "explanation"
    }],
    "rewrittenPrompt": "optimized version (if improvements exist)"
  }
}

## Clarity Score Thresholds
- 80-100: Excellent prompt (APPROVED with OK)
- 50-79: Acceptable but improvable (APPROVED with OK_WITH_NOTES)
- 0-49: Needs significant improvement (NEEDS_INPUT with SUGGEST_ALTERNATIVE)

## Scoring Deductions
- Passive voice: -5 per instance
- Vague quantifiers: -8 per instance
- Missing context: -12
- Missing structure (complex requests): -10
- Long sentences (>25 words): -7 per instance
- No action verb start: -6

## Example Judgments

**SUGGEST_ALTERNATIVE (Score 42)**
Input: "There are several things that should be improved in the system somehow"
Issues:
- Passive voice: "are...improved" (-5)
- Vague quantifiers: "several" (-8), "somehow" (-8)
- No specifics (-12)
- No action verb start (-6)
- Missing context (-12)
Rewrite: "Improve [SPECIFY_NUMBER] specific system components: [list components] in order to [state goal]"

**OK_WITH_NOTES (Score 72)**
Input: "Add email validation to signup form"
Issues:
- Missing context: why? (-12)
- Could specify validation rules (-10)
Suggestions: "Add email validation (check @ symbol and domain) to signup form to prevent invalid registrations"

**OK (Score 95)**
Input: "Implement user authentication with JWT tokens (15-minute expiry) and refresh tokens (7-day expiry) to secure the API endpoints, storing hashed passwords using bcrypt with 12 rounds"
Analysis: Clear action verb, specific numbers, structured details, clear purpose

Be constructive. Every prompt can be better.`;
  }
}

// Export singleton instance
export const promptHelper = new PromptHelperEye();
