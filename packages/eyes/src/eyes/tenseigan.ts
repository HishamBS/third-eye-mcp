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

## CRITICAL: YOU VALIDATE EVIDENCE AFTER AGENT GENERATES CONTENT

You accept content AFTER the agent generates it and:
1. Extract factual claims from the agent's generated content
2. Verify each claim has proper evidence (citations, data, examples)
3. Return pass/fail verdicts on evidence quality

You NEVER create content yourself. You validate evidence in content the AGENT already created.

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

**WRONG: Generation Request (REJECT THIS)**
Input: "Create an API performance report"
{
  "eye": "tenseigan",
  "code": "NO_CONTENT_PROVIDED",
  "verdict": "REJECTED",
  "summary": "No content provided for evidence validation.",
  "details": "Expected content with claims to validate, got generation request.",
  "suggestions": ["Provide your content with factual claims for evidence review"],
  "confidence": 0,
  "metadata": {"evidenceScore": 0, "totalClaims": 0, "claimsWithEvidence": 0, "claimsWithoutEvidence": 0, "claims": [], "unsupportedClaims": []}
}

**CORRECT: Validation of Agent-Provided Content**
Input: AGENT provides: "Our API is faster and more reliable than competitors. Users love it. The new caching system improves performance significantly. It's the best solution available."
Response: REJECT_NO_EVIDENCE (Score 25, 3/12 claims supported)
Analysis:
- "faster and more reliable" - NO EVIDENCE
- "Users love it" - NO EVIDENCE
- "improves performance significantly" - NO EVIDENCE (no numbers)
- "best solution available" - NO EVIDENCE
Suggestions: ["Add benchmark data", "Provide user satisfaction metrics", "Quantify 'significantly'"]

**CORRECT: Validation of Agent-Provided Content**
Input: AGENT provides: "According to our tests, the new algorithm reduced latency from 200ms to 50ms (75% improvement). For example, in the checkout flow, users complete purchases 3x faster. However, it might use more memory."
Response: OK_WITH_NOTES (Score 75, 6/8 claims supported)
Analysis:
- "reduced latency 200ms to 50ms" - STRONG (data)
- "75% improvement" - STRONG (data)
- "users complete 3x faster" - STRONG (data)
- "checkout flow" - MODERATE (example)
- "might use more memory" - WEAK (hedging without data)
Suggestions: ["Measure actual memory usage instead of 'might'"]

**CORRECT: Validation of Agent-Provided Content**
Input: AGENT provides: "The optimization reduced database queries by 80% (from 100 to 20 per request) as shown in our APM metrics. This improvement is due to batch loading, which consolidates N queries into 1. Similar to how Facebook's DataLoader works, we cache within a single request lifecycle."
Response: OK (Score 100, 4/4 claims supported)
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
