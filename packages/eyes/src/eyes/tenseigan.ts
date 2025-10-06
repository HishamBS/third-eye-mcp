import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Tenseigan-specific metadata
export const Claim = z.object({
  claim: z.string(),
  startIndex: z.number(),
  endIndex: z.number(),
  hasEvidence: z.boolean(),
  evidenceType: z.enum(['data', 'citation', 'example', 'reasoning', 'none']).optional(),
  evidenceQuality: z.enum(['strong', 'moderate', 'weak', 'missing']),
  suggestion: z.string().optional(),
});

export const TenseiganMetadata = z.object({
  evidenceScore: z.number().min(0).max(100),
  totalClaims: z.number(),
  claimsWithEvidence: z.number(),
  claimsWithoutEvidence: z.number(),
  claims: z.array(Claim),
  unsupportedClaims: z.array(z.string()),
});

export const TenseiganEnvelopeSchema = BaseEnvelopeSchema.extend({
  eye: z.literal('tenseigan'),
  metadata: TenseiganMetadata.optional(),
});

export type TenseiganEnvelope = z.infer<typeof TenseiganEnvelopeSchema>;

/**
 * Tenseigan Eye - Evidence Validator
 * Validates that all claims are supported by evidence (data, citations, examples, or sound reasoning)
 */
export class TenseiganEye implements BaseEye {
  readonly name = 'tenseigan';
  readonly description = 'Evidence Validator - Ensures all claims are backed by evidence';
  readonly version = '1.0.0';

  async process(input: string, context?: Record<string, any>): Promise<TenseiganEnvelope> {
    try {
      const claims: z.infer<typeof Claim>[] = [];
      const unsupportedClaims: string[] = [];

      // Extract claims (statements that assert something)
      const claimPatterns = [
        // Definitive statements
        /\b(is|are|was|were|will be|has|have|had)\s+([^.!?]{10,100})/gi,
        // Comparative statements
        /\b(better|worse|faster|slower|more|less|higher|lower)\s+than\s+([^.!?]{5,100})/gi,
        // Causal statements
        /\b(because|since|therefore|thus|hence|consequently)\s+([^.!?]{10,100})/gi,
        // Statistical statements
        /\b(\d+%|\d+\s*(?:percent|times|x))\s+([^.!?]{10,100})/gi,
      ];

      let claimIndex = 0;

      claimPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(input)) !== null) {
          const claimText = match[0].trim();
          const startIndex = match.index;
          const endIndex = match.index + claimText.length;

          // Check for evidence near the claim (within 200 chars before/after)
          const contextStart = Math.max(0, startIndex - 200);
          const contextEnd = Math.min(input.length, endIndex + 200);
          const surroundingContext = input.substring(contextStart, contextEnd);

          const evidenceCheck = this.checkEvidence(claimText, surroundingContext);

          claims.push({
            claim: claimText,
            startIndex,
            endIndex,
            hasEvidence: evidenceCheck.hasEvidence,
            evidenceType: evidenceCheck.evidenceType,
            evidenceQuality: evidenceCheck.quality,
            suggestion: evidenceCheck.suggestion,
          });

          if (!evidenceCheck.hasEvidence) {
            unsupportedClaims.push(claimText);
          }

          claimIndex++;
        }
      });

      // Remove duplicate claims
      const uniqueClaims = claims.filter((claim, index, self) =>
        index === self.findIndex(c => c.claim === claim.claim)
      );

      const totalClaims = uniqueClaims.length;
      const claimsWithEvidence = uniqueClaims.filter(c => c.hasEvidence).length;
      const claimsWithoutEvidence = totalClaims - claimsWithEvidence;

      // Calculate evidence score
      const evidenceScore = totalClaims > 0
        ? Math.round((claimsWithEvidence / totalClaims) * 100)
        : 100; // If no claims, assume OK

      // Determine verdict
      let verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT';
      let code: TenseiganEnvelope['code'];
      let summary: string;

      if (claimsWithoutEvidence > 3 || evidenceScore < 40) {
        verdict = 'REJECTED';
        code = 'REJECT_NO_EVIDENCE';
        summary = `Too many unsupported claims (${claimsWithoutEvidence}/${totalClaims}). Evidence score: ${evidenceScore}/100.`;
      } else if (claimsWithoutEvidence > 0 || evidenceScore < 70) {
        verdict = 'NEEDS_INPUT';
        code = 'NEED_MORE_CONTEXT';
        summary = `Some claims lack evidence (${claimsWithoutEvidence}/${totalClaims}). Evidence score: ${evidenceScore}/100.`;
      } else {
        verdict = 'APPROVED';
        code = evidenceScore >= 90 ? 'OK' : 'OK_WITH_NOTES';
        summary = `Claims are well-supported (${claimsWithEvidence}/${totalClaims}). Evidence score: ${evidenceScore}/100.`;
      }

      const suggestions: string[] = [];

      // Add suggestions for unsupported claims
      unsupportedClaims.slice(0, 3).forEach(claim => {
        const trimmedClaim = claim.length > 80 ? claim.substring(0, 80) + '...' : claim;
        suggestions.push(`Provide evidence for: "${trimmedClaim}"`);
      });

      // Add suggestions based on evidence quality
      const weakClaims = uniqueClaims.filter(c => c.evidenceQuality === 'weak' && c.suggestion);
      weakClaims.slice(0, 2).forEach(claim => {
        if (claim.suggestion) {
          suggestions.push(claim.suggestion);
        }
      });

      return {
        eye: 'tenseigan',
        code,
        verdict,
        summary,
        details: totalClaims > 0
          ? `Analyzed ${totalClaims} claims. ${claimsWithEvidence} have evidence (${claimsWithoutEvidence} missing). ` +
            `Evidence types: ${this.summarizeEvidenceTypes(uniqueClaims)}`
          : 'No factual claims detected',
        suggestions: suggestions.length > 0 ? suggestions.slice(0, 5) : undefined,
        confidence: evidenceScore,
        metadata: {
          evidenceScore,
          totalClaims,
          claimsWithEvidence,
          claimsWithoutEvidence,
          claims: uniqueClaims,
          unsupportedClaims: unsupportedClaims.slice(0, 10),
        },
      };
    } catch (error) {
      return {
        eye: 'tenseigan',
        code: 'EYE_ERROR',
        verdict: 'NEEDS_INPUT',
        summary: `Tenseigan processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
      };
    }
  }

  private checkEvidence(claim: string, context: string): {
    hasEvidence: boolean;
    evidenceType?: 'data' | 'citation' | 'example' | 'reasoning' | 'none';
    quality: 'strong' | 'moderate' | 'weak' | 'missing';
    suggestion?: string;
  } {
    const lowerContext = context.toLowerCase();

    // Check for data/statistics
    const hasData = /\d+%|\d+\s*(?:percent|times|users|customers|cases)|\b\d+\.\d+\b/.test(context);
    if (hasData) {
      return {
        hasEvidence: true,
        evidenceType: 'data',
        quality: 'strong',
      };
    }

    // Check for citations
    const hasCitation = /according to|research shows|studies indicate|source:|ref:|citation:|[@\[]/.test(lowerContext);
    if (hasCitation) {
      return {
        hasEvidence: true,
        evidenceType: 'citation',
        quality: 'strong',
      };
    }

    // Check for examples
    const hasExample = /for example|such as|e\.g\.|instance|like|consider|imagine/.test(lowerContext);
    if (hasExample) {
      return {
        hasEvidence: true,
        evidenceType: 'example',
        quality: 'moderate',
      };
    }

    // Check for reasoning/explanation
    const hasReasoning = /because|since|due to|as a result|therefore|thus|hence|given that/.test(lowerContext);
    if (hasReasoning) {
      // Check if reasoning is substantial (more than just "because X")
      const reasoningLength = context.match(/because[^.!?]{20,}/i);
      if (reasoningLength) {
        return {
          hasEvidence: true,
          evidenceType: 'reasoning',
          quality: 'moderate',
        };
      } else {
        return {
          hasEvidence: false,
          evidenceType: 'none',
          quality: 'weak',
          suggestion: 'Expand on the reasoning with more detail',
        };
      }
    }

    // Check for hedging language (may indicate lack of evidence)
    const hasHedging = /might|could|possibly|perhaps|maybe|probably|seems|appears/.test(context);
    if (hasHedging) {
      return {
        hasEvidence: false,
        evidenceType: 'none',
        quality: 'weak',
        suggestion: 'Replace hedging language with concrete evidence or data',
      };
    }

    // No evidence found
    return {
      hasEvidence: false,
      evidenceType: 'none',
      quality: 'missing',
      suggestion: 'Add supporting data, citations, examples, or reasoning',
    };
  }

  private summarizeEvidenceTypes(claims: z.infer<typeof Claim>[]): string {
    const typeCounts: Record<string, number> = {};

    claims.forEach(claim => {
      if (claim.evidenceType && claim.evidenceType !== 'none') {
        typeCounts[claim.evidenceType] = (typeCounts[claim.evidenceType] || 0) + 1;
      }
    });

    const summary = Object.entries(typeCounts)
      .map(([type, count]) => `${count} ${type}`)
      .join(', ');

    return summary || 'none';
  }

  validate(envelope: unknown): envelope is TenseiganEnvelope {
    return TenseiganEnvelopeSchema.safeParse(envelope).success;
  }

  getPersona(): string {
    return `You are Tenseigan, the Evidence Validator Eye of the Third Eye MCP system.

Your SOLE PURPOSE is to ensure all factual claims are supported by evidence.

## Your Abilities
- Extract factual claims from text
- Detect evidence types: data/statistics, citations, examples, reasoning
- Grade evidence quality: strong, moderate, weak, missing
- Identify unsupported claims
- Suggest evidence to add

## Response Protocol
You must ALWAYS return a valid JSON envelope:
{
  "eye": "tenseigan",
  "code": "OK" | "OK_WITH_NOTES" | "REJECT_NO_EVIDENCE" | "NEED_MORE_CONTEXT",
  "verdict": "APPROVED" | "REJECTED" | "NEEDS_INPUT",
  "summary": "Brief explanation (max 500 chars)",
  "details": "Evidence analysis with types breakdown",
  "suggestions": ["Provide evidence for X", "Add data for Y", ...],
  "confidence": 0-100,
  "metadata": {
    "evidenceScore": 0-100,
    "totalClaims": number,
    "claimsWithEvidence": number,
    "claimsWithoutEvidence": number,
    "claims": [{
      "claim": "the statement",
      "startIndex": number,
      "endIndex": number,
      "hasEvidence": boolean,
      "evidenceType": "data" | "citation" | "example" | "reasoning" | "none",
      "evidenceQuality": "strong" | "moderate" | "weak" | "missing",
      "suggestion": "how to improve (optional)"
    }],
    "unsupportedClaims": ["claim1", "claim2", ...]
  }
}

## Claim Detection
Extract statements that assert something:
- Definitive: "X is Y", "X has Y"
- Comparative: "X is better than Y"
- Causal: "X because Y"
- Statistical: "50% of users", "3x faster"

## Evidence Types

### Strong Evidence
1. **Data/Statistics**: Numbers, percentages, measurements
   - "50% of users reported improvement"
   - "Response time reduced from 200ms to 50ms"

2. **Citations**: References to sources, research, studies
   - "According to the 2024 State of JS survey..."
   - "Research by MIT shows..."

### Moderate Evidence
3. **Examples**: Concrete instances demonstrating the claim
   - "For example, when we tested with 1000 users..."
   - "Consider the case of Amazon's checkout flow"

4. **Reasoning**: Logical explanation (if substantial)
   - "This works because the algorithm caches results, reducing computation from O(n²) to O(n)"

### Missing/Weak Evidence
- Hedging language without facts: "might", "could", "possibly", "maybe"
- Bare assertions without support
- Circular reasoning

## Evidence Score Calculation
Score = (Claims with Evidence / Total Claims) × 100

## Verdict Logic
- ≥4 unsupported claims OR score <40 → REJECTED (REJECT_NO_EVIDENCE)
- 1-3 unsupported claims OR score 40-69 → NEEDS_INPUT (NEED_MORE_CONTEXT)
- Score ≥90 → APPROVED (OK)
- Score 70-89 → APPROVED (OK_WITH_NOTES)

## Example Judgments

**REJECT_NO_EVIDENCE (Score 25, 3/12 claims supported)**
Input: "Our API is faster and more reliable than competitors. Users love it. The new caching system improves performance significantly. It's the best solution available."
Analysis:
- "faster and more reliable" - NO EVIDENCE
- "Users love it" - NO EVIDENCE
- "improves performance significantly" - NO EVIDENCE (no numbers)
- "best solution available" - NO EVIDENCE
Suggestions: ["Add benchmark data", "Provide user satisfaction metrics", "Quantify 'significantly'"]

**OK_WITH_NOTES (Score 75, 6/8 claims supported)**
Input: "According to our tests, the new algorithm reduced latency from 200ms to 50ms (75% improvement). For example, in the checkout flow, users complete purchases 3x faster. However, it might use more memory."
Analysis:
- "reduced latency 200ms to 50ms" - STRONG (data)
- "75% improvement" - STRONG (data)
- "users complete 3x faster" - STRONG (data)
- "checkout flow" - MODERATE (example)
- "might use more memory" - WEAK (hedging without data)
Suggestions: ["Measure actual memory usage instead of 'might'"]

**OK (Score 100, 4/4 claims supported)**
Input: "The optimization reduced database queries by 80% (from 100 to 20 per request) as shown in our APM metrics. This improvement is due to batch loading, which consolidates N queries into 1. Similar to how Facebook's DataLoader works, we cache within a single request lifecycle."
Analysis:
- "reduced by 80%" - STRONG (data with numbers)
- "from 100 to 20" - STRONG (data)
- "due to batch loading" - MODERATE (reasoning)
- "similar to DataLoader" - MODERATE (example/citation)

Show me the receipts. No evidence = no approval.`;
  }
}

// Export singleton instance
export const tenseigan = new TenseiganEye();
