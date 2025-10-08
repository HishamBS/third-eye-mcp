import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Byakugan-specific metadata
export const Inconsistency = z.object({
  type: z.enum(['logical', 'temporal', 'factual', 'scope', 'assumption']),
  severity: z.enum(['minor', 'moderate', 'major', 'critical']),
  description: z.string(),
  conflictingStatements: z.array(z.string()),
  suggestion: z.string(),
});

export const ByakuganMetadata = z.object({
  consistencyScore: z.number().min(0).max(100),
  inconsistenciesFound: z.number(),
  inconsistenciesByType: z.record(z.number()),
  inconsistenciesBySeverity: z.record(z.number()),
  inconsistencies: z.array(Inconsistency),
  assumptions: z.array(z.string()),
  logicalFlaws: z.array(z.string()),
});

export const ByakuganEnvelopeSchema = BaseEnvelopeSchema.extend({
  eye: z.literal('byakugan'),
  metadata: ByakuganMetadata.optional(),
});

export type ByakuganEnvelope = z.infer<typeof ByakuganEnvelopeSchema>;

/**
 * Byakugan Eye - Consistency Checker
 * Detects logical inconsistencies, contradictions, and flawed assumptions
 */
export class ByakuganEye implements BaseEye {
  readonly name = 'byakugan';
  readonly description = 'Consistency Checker - Detects contradictions and logical flaws';
  readonly version = '1.0.0';


  private checkLogicalContradictions(input: string, inconsistencies: z.infer<typeof Inconsistency>[]): void {
    const lowerInput = input.toLowerCase();

    // Check for direct negations
    const sentences = input.split(/[.!?]+/).filter(s => s.trim().length > 0);

    for (let i = 0; i < sentences.length; i++) {
      for (let j = i + 1; j < sentences.length; j++) {
        const sent1 = sentences[i].toLowerCase().trim();
        const sent2 = sentences[j].toLowerCase().trim();

        // Check for "X is Y" followed by "X is not Y"
        const positiveMatch = sent1.match(/(\w+)\s+(?:is|are|was|were)\s+(\w+)/);
        const negativeMatch = sent2.match(/(\w+)\s+(?:is not|are not|isn't|aren't|wasn't|weren't)\s+(\w+)/);

        if (positiveMatch && negativeMatch) {
          const [, subj1, pred1] = positiveMatch;
          const [, subj2, pred2] = negativeMatch;

          if (subj1 === subj2 && pred1 === pred2) {
            inconsistencies.push({
              type: 'logical',
              severity: 'critical',
              description: 'Direct contradiction between statements',
              conflictingStatements: [sentences[i].trim(), sentences[j].trim()],
              suggestion: `Resolve contradiction: "${sentences[i].trim()}" vs "${sentences[j].trim()}"`,
            });
          }
        }
      }
    }

    // Check for "always" followed by "never" for same subject
    if (/\balways\b.*\bnever\b|\bnever\b.*\balways\b/.test(lowerInput)) {
      inconsistencies.push({
        type: 'logical',
        severity: 'major',
        description: 'Conflicting absolute statements (always vs never)',
        conflictingStatements: [input.match(/.*always.*/i)?.[0] || '', input.match(/.*never.*/i)?.[0] || ''],
        suggestion: 'Remove absolute terms or clarify conditions',
      });
    }

    // Check for "all" followed by "none" or "some"
    if (/\ball\b.*\bnone\b|\bnone\b.*\ball\b/.test(lowerInput)) {
      inconsistencies.push({
        type: 'logical',
        severity: 'major',
        description: 'Conflicting quantifiers (all vs none)',
        conflictingStatements: [input.match(/.*all.*/i)?.[0] || '', input.match(/.*none.*/i)?.[0] || ''],
        suggestion: 'Clarify scope - does this apply to all or none?',
      });
    }
  }

  private checkTemporalInconsistencies(input: string, inconsistencies: z.infer<typeof Inconsistency>[]): void {
    // Check for conflicting time references
    const timePatterns = [
      { pattern: /before|earlier|previously|prior/, label: 'past' },
      { pattern: /after|later|subsequently|then/, label: 'future' },
      { pattern: /now|currently|presently/, label: 'present' },
    ];

    const timeRefs: Array<{ label: string; match: string }> = [];

    timePatterns.forEach(({ pattern, label }) => {
      const matches = input.match(new RegExp(`${pattern.source}[^.!?]{0,100}`, 'gi'));
      if (matches) {
        matches.forEach(match => {
          timeRefs.push({ label, match: match.trim() });
        });
      }
    });

    // Check for "before X, then Y" followed by "after Y, then X"
    const beforeAfterConflict = /before\s+(\w+).*(?:then|after)\s+(\w+).*after\s+\2.*\1/.test(input.toLowerCase());
    if (beforeAfterConflict) {
      inconsistencies.push({
        type: 'temporal',
        severity: 'major',
        description: 'Conflicting temporal sequence',
        conflictingStatements: [input],
        suggestion: 'Clarify the correct order of events',
      });
    }

    // Check for date inconsistencies
    const dates = input.match(/\b(?:19|20)\d{2}\b/g);
    if (dates && dates.length > 1) {
      const years = dates.map(d => parseInt(d, 10));
      const hasChronologyIssue = input.toLowerCase().includes('before') && years[0] > years[1];
      if (hasChronologyIssue) {
        inconsistencies.push({
          type: 'temporal',
          severity: 'moderate',
          description: 'Chronological inconsistency in dates',
          conflictingStatements: dates,
          suggestion: 'Verify date sequence matches temporal language (before/after)',
        });
      }
    }
  }

  private checkFactualConflicts(input: string, inconsistencies: z.infer<typeof Inconsistency>[]): void {
    // Check for conflicting numbers for the same subject
    const numberRefs: Array<{ subject: string; value: number; text: string }> = [];

    const numberPattern = /(\w+(?:\s+\w+)?)\s+(?:is|are|has|have|costs?|takes?)\s+(\d+(?:\.\d+)?)/gi;
    let match;

    while ((match = numberPattern.exec(input)) !== null) {
      const subject = match[1].toLowerCase().trim();
      const value = parseFloat(match[2]);
      numberRefs.push({ subject, value, text: match[0] });
    }

    // Find conflicts
    for (let i = 0; i < numberRefs.length; i++) {
      for (let j = i + 1; j < numberRefs.length; j++) {
        if (numberRefs[i].subject === numberRefs[j].subject && numberRefs[i].value !== numberRefs[j].value) {
          inconsistencies.push({
            type: 'factual',
            severity: 'major',
            description: `Conflicting numbers for "${numberRefs[i].subject}"`,
            conflictingStatements: [numberRefs[i].text, numberRefs[j].text],
            suggestion: `Verify which value is correct for "${numberRefs[i].subject}": ${numberRefs[i].value} or ${numberRefs[j].value}?`,
          });
        }
      }
    }
  }

  private checkScopeInconsistencies(input: string, inconsistencies: z.infer<typeof Inconsistency>[]): void {
    const lowerInput = input.toLowerCase();

    // Check for "only X" followed by "X and Y"
    const onlyPattern = /only\s+(\w+)/gi;
    let match;
    const onlyTerms: string[] = [];

    while ((match = onlyPattern.exec(input)) !== null) {
      onlyTerms.push(match[1].toLowerCase());
    }

    onlyTerms.forEach(term => {
      const andPattern = new RegExp(`${term}\\s+and\\s+(\\w+)`, 'i');
      if (andPattern.test(input)) {
        inconsistencies.push({
          type: 'scope',
          severity: 'moderate',
          description: `Scope conflict: "only ${term}" but also mentions "${term} and [other]"`,
          conflictingStatements: [input.match(new RegExp(`only\\s+${term}.*`, 'i'))?.[0] || '', input.match(andPattern)?.[0] || ''],
          suggestion: `Remove "only" or clarify that it's not just ${term}`,
        });
      }
    });

    // Check for "must" followed by "optional"
    if (/\bmust\b.*\boptional\b|\boptional\b.*\bmust\b/.test(lowerInput)) {
      inconsistencies.push({
        type: 'scope',
        severity: 'major',
        description: 'Conflicting requirements (must vs optional)',
        conflictingStatements: [input.match(/.*must.*/i)?.[0] || '', input.match(/.*optional.*/i)?.[0] || ''],
        suggestion: 'Clarify whether this is required or optional',
      });
    }
  }

  private detectAssumptions(input: string, assumptions: string[]): void {
    const assumptionPatterns = [
      /\bassum(?:e|ing|ed|ption)\b/i,
      /\bprobably\b|\blikely\b|\bshould\b|\bwould\b/i,
      /\bif\s+\w+.*then/i,
      /\bgiven that\b|\bprovided that\b/i,
    ];

    assumptionPatterns.forEach(pattern => {
      const matches = input.match(new RegExp(`${pattern.source}[^.!?]{0,100}`, 'gi'));
      if (matches) {
        matches.forEach(match => {
          assumptions.push(match.trim());
        });
      }
    });
  }

  private findLogicalFallacies(input: string, logicalFlaws: string[]): void {
    const lowerInput = input.toLowerCase();

    // Circular reasoning
    if (/because\s+it\s+is|since\s+it\s+is/.test(lowerInput)) {
      logicalFlaws.push('Circular reasoning detected: using the claim to prove itself');
    }

    // False dichotomy
    if (/either\s+\w+\s+or\s+\w+|\bmust\s+be\s+either/.test(lowerInput) && !/unless|except|other/.test(lowerInput)) {
      logicalFlaws.push('False dichotomy: presenting only two options when more may exist');
    }

    // Hasty generalization
    if (/(always|never|all|none|every).*(?:because|based on).*(?:one|single|once)/i.test(input)) {
      logicalFlaws.push('Hasty generalization: broad conclusion from limited evidence');
    }

    // Appeal to authority without evidence
    if (/experts?\s+(?:say|believe|think|claim)|according\s+to\s+experts?/.test(lowerInput) && !/\bdata\b|\bresearch\b|\bstudy\b/.test(lowerInput)) {
      logicalFlaws.push('Appeal to authority without supporting evidence');
    }

    // Slippery slope
    if (/if\s+\w+.*then\s+\w+.*then\s+\w+.*then/i.test(input)) {
      logicalFlaws.push('Slippery slope: chain of events without establishing causation');
    }
  }

  validate(envelope: unknown): envelope is ByakuganEnvelope {
    return ByakuganEnvelopeSchema.safeParse(envelope).success;
  }

  getPersona(): string {
    return `You are Byakugan, the Consistency Checker Eye of the Third Eye MCP system.

Your SOLE PURPOSE is to detect logical inconsistencies, contradictions, and flawed assumptions.

## CRITICAL: YOU VALIDATE CONSISTENCY AFTER AGENT GENERATES CONTENT

You accept content AFTER the agent generates it and:
1. Analyze logic and statements for contradictions
2. Detect temporal, factual, and scope inconsistencies
3. Return pass/fail verdicts on logical consistency

You NEVER create content yourself. You validate consistency in content the AGENT already created.

## Your Abilities
- Detect logical contradictions (X is Y, X is not Y)
- Find temporal inconsistencies (before/after conflicts)
- Identify factual conflicts (conflicting numbers/facts)
- Spot scope creep (only X, but also Y)
- Flag unstated assumptions
- Catch logical fallacies

## Response Protocol
You must ALWAYS return a valid JSON envelope:
{
  "eye": "byakugan",
  "code": "OK" | "OK_WITH_NOTES" | "REJECT_INCONSISTENT" | "NEED_CLARIFICATION",
  "verdict": "APPROVED" | "REJECTED" | "NEEDS_INPUT",
  "summary": "Brief explanation (max 500 chars)",
  "details": "Inconsistency breakdown by type and severity",
  "suggestions": ["CRITICAL: fix X", "Resolve assumption Y", ...],
  "confidence": 0-100,
  "metadata": {
    "consistencyScore": 0-100,
    "inconsistenciesFound": number,
    "inconsistenciesByType": { "logical": 2, "temporal": 1, ... },
    "inconsistenciesBySeverity": { "critical": 1, "major": 2, ... },
    "inconsistencies": [{
      "type": "logical" | "temporal" | "factual" | "scope" | "assumption",
      "severity": "minor" | "moderate" | "major" | "critical",
      "description": "what's wrong",
      "conflictingStatements": ["statement 1", "statement 2"],
      "suggestion": "how to fix"
    }],
    "assumptions": ["assumption 1", "assumption 2", ...],
    "logicalFlaws": ["fallacy 1", "fallacy 2", ...]
  }
}

## Inconsistency Types

### Logical
- Direct contradictions (X is Y vs X is not Y)
- Conflicting absolutes (always vs never)
- Conflicting quantifiers (all vs none/some)

### Temporal
- Reversed chronology (before X then Y, but later after Y then X)
- Date conflicts (year order doesn't match before/after language)

### Factual
- Conflicting numbers for same subject
- Contradicting facts or data points

### Scope
- "Only X" but also mentions "X and Y"
- "Must do X" but also "X is optional"

### Assumption
- Unstated premises (if X then Y, but X is assumed)
- Unacknowledged dependencies

## Logical Fallacies
- **Circular reasoning**: using claim to prove itself
- **False dichotomy**: only two options when more exist
- **Hasty generalization**: broad claim from one example
- **Appeal to authority**: "experts say" without data
- **Slippery slope**: unproven chain of events

## Scoring
Start at 100, deduct:
- Critical inconsistency: -25 each
- Major inconsistency: -15 each
- Moderate inconsistency: -8 each
- Minor inconsistency: -3 each
- Assumptions (up to -20 total): -5 each
- Logical fallacies (up to -30 total): -10 each

## Verdict Logic
- Any critical OR score <40 → REJECTED (REJECT_INCONSISTENT)
- 2+ major OR score <70 → NEEDS_INPUT (NEED_CLARIFICATION)
- Score ≥90 → APPROVED (OK)
- Score 70-89 → APPROVED (OK_WITH_NOTES)

## Example Judgments

**WRONG: Generation Request (REJECT THIS)**
Input: "Create a consistent API design specification"
{
  "eye": "byakugan",
  "code": "NO_CONTENT_PROVIDED",
  "verdict": "REJECTED",
  "summary": "No content provided for consistency checking.",
  "details": "Expected content to analyze for logical consistency, got generation request.",
  "suggestions": ["Provide your content for logical consistency review"],
  "confidence": 0,
  "metadata": {"consistencyScore": 0, "inconsistenciesFound": 0, "inconsistenciesByType": {}, "inconsistenciesBySeverity": {}, "inconsistencies": [], "assumptions": [], "logicalFlaws": []}
}

**CORRECT: Validation of Agent-Provided Content**
Input: AGENT provides: "The API always returns JSON. When it fails, it returns XML error messages. Response time is 50ms. Later tests show response time is 200ms."
Response: REJECT_INCONSISTENT (Score 25, 1 critical)
Analysis:
- CRITICAL: Logical contradiction (always JSON vs sometimes XML)
- MAJOR: Factual conflict (50ms vs 200ms for response time)
Suggestions: ["CRITICAL: Resolve JSON vs XML contradiction", "Verify correct response time: 50ms or 200ms?"]

**CORRECT: Validation of Agent-Provided Content**
Input: AGENT provides: "We must implement authentication. OAuth is optional. This assumes users have email addresses."
Response: NEED_CLARIFICATION (Score 62, 0 critical, 2 major)
Analysis:
- MAJOR: Scope conflict (must implement vs optional)
- MODERATE: Unstated assumption (email addresses)
Suggestions: ["Clarify: is OAuth required or optional?", "State assumption about email addresses explicitly"]

**CORRECT: Validation of Agent-Provided Content**
Input: AGENT provides: "Implement JWT auth with 15-minute access tokens and 7-day refresh tokens. Store hashed passwords using bcrypt. Rate limit to 5 login attempts per minute."
Response: OK (Score 95, 0 critical, 0 major)
Analysis:
- Consistent requirements
- No contradictions
- Clear scope
- No unstated assumptions

See all inconsistencies. Logic must be airtight.`;
  }
}

// Export singleton instance
export const byakugan = new ByakuganEye();
