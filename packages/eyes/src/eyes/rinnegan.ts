import { z } from 'zod';
import { BaseEnvelope, BaseEnvelopeSchema, BaseEye } from '../schemas/base';

// Rinnegan-specific metadata
export const RinneganMetadata = z.object({
  planQualityScore: z.number().min(0).max(100),
  hasSteps: z.boolean(),
  stepCount: z.number(),
  hasSuccessCriteria: z.boolean(),
  hasRollback: z.boolean(),
  hasDependencies: z.boolean(),
  hasTimeEstimates: z.boolean(),
  criticalGaps: z.array(z.string()),
  riskFactors: z.array(z.object({
    risk: z.string(),
    severity: z.enum(['low', 'medium', 'high', 'critical']),
    mitigation: z.string(),
  })),
  improvedPlan: z.string().optional(),
});

export const RinneganEnvelopeSchema = BaseEnvelopeSchema.extend({
  eye: z.literal('rinnegan'),
  metadata: RinneganMetadata.optional(),
});

export type RinneganEnvelope = z.infer<typeof RinneganEnvelopeSchema>;

/**
 * Rinnegan Eye - Plan Reviewer
 * Validates implementation plans for completeness, feasibility, and risk management
 */
export class RinneganEye implements BaseEye {
  readonly name = 'rinnegan';
  readonly description = 'Plan Validator - Reviews implementation plans for gaps and risks';
  readonly version = '1.0.0';

  async process(input: string, context?: Record<string, any>): Promise<RinneganEnvelope> {
    try {
      let planQualityScore = 100;
      const criticalGaps: string[] = [];
      const riskFactors: RinneganMetadata['riskFactors'] = [];

      // 1. Check for numbered steps or structure
      const hasNumberedSteps = /\d+\.\s/.test(input) || /step\s+\d+/i.test(input);
      const hasBulletPoints = /[-*•]\s/.test(input);
      const hasSteps = hasNumberedSteps || hasBulletPoints;

      if (!hasSteps) {
        planQualityScore -= 25;
        criticalGaps.push('No structured steps - plan must be broken into numbered or bulleted steps');
      }

      // Count steps
      const stepMatches = input.match(/(?:\d+\.|\-|\*|•)\s/g);
      const stepCount = stepMatches ? stepMatches.length : 0;

      if (stepCount < 3 && input.length > 100) {
        planQualityScore -= 15;
        criticalGaps.push('Too few steps for complex task - break down further');
      }

      // 2. Check for success criteria
      const successCriteriaKeywords = ['success', 'done when', 'complete when', 'acceptance criteria', 'verify', 'validate', 'test'];
      const hasSuccessCriteria = successCriteriaKeywords.some(keyword => input.toLowerCase().includes(keyword));

      if (!hasSuccessCriteria) {
        planQualityScore -= 20;
        criticalGaps.push('No success criteria - how will you know when it\'s done?');
      }

      // 3. Check for rollback/error handling
      const rollbackKeywords = ['rollback', 'revert', 'undo', 'error handling', 'fallback', 'recovery', 'backup'];
      const hasRollback = rollbackKeywords.some(keyword => input.toLowerCase().includes(keyword));

      if (!hasRollback) {
        planQualityScore -= 15;
        criticalGaps.push('No rollback or error handling strategy');
        riskFactors.push({
          risk: 'No recovery plan if implementation fails',
          severity: 'high',
          mitigation: 'Add rollback steps and error handling procedures',
        });
      }

      // 4. Check for dependencies
      const dependencyKeywords = ['depends on', 'requires', 'needs', 'prerequisite', 'after', 'before', 'once'];
      const hasDependencies = dependencyKeywords.some(keyword => input.toLowerCase().includes(keyword));

      if (!hasDependencies && stepCount > 3) {
        planQualityScore -= 10;
        criticalGaps.push('No explicit dependencies between steps - may cause ordering issues');
      }

      // 5. Check for time estimates
      const timeKeywords = ['minutes', 'hours', 'days', 'weeks', 'estimate', 'duration', 'timeline'];
      const hasTimeEstimates = timeKeywords.some(keyword => input.toLowerCase().includes(keyword));

      if (!hasTimeEstimates && stepCount > 5) {
        planQualityScore -= 8;
        criticalGaps.push('No time estimates - hard to track progress');
      }

      // 6. Detect specific risk patterns
      const lowerInput = input.toLowerCase();

      // Database changes without backup
      if ((lowerInput.includes('database') || lowerInput.includes('migration')) && !hasRollback) {
        riskFactors.push({
          risk: 'Database changes without backup/rollback plan',
          severity: 'critical',
          mitigation: 'Add database backup step before migration',
        });
        planQualityScore -= 20;
      }

      // API changes without versioning
      if ((lowerInput.includes('api') || lowerInput.includes('endpoint')) && !lowerInput.includes('version')) {
        riskFactors.push({
          risk: 'API changes without versioning strategy',
          severity: 'high',
          mitigation: 'Consider API versioning (v1, v2) for backward compatibility',
        });
        planQualityScore -= 12;
      }

      // Security changes without testing
      if ((lowerInput.includes('auth') || lowerInput.includes('security') || lowerInput.includes('permission')) && !hasSuccessCriteria) {
        riskFactors.push({
          risk: 'Security changes without explicit testing plan',
          severity: 'critical',
          mitigation: 'Add security testing and penetration testing steps',
        });
        planQualityScore -= 18;
      }

      // Production deployment without staging
      if (lowerInput.includes('deploy') && !lowerInput.includes('staging') && !lowerInput.includes('test environment')) {
        riskFactors.push({
          risk: 'Direct production deployment without staging validation',
          severity: 'high',
          mitigation: 'Deploy to staging environment first',
        });
        planQualityScore -= 15;
      }

      // Breaking changes without migration path
      if ((lowerInput.includes('breaking') || lowerInput.includes('remove') || lowerInput.includes('delete')) && !lowerInput.includes('migration')) {
        riskFactors.push({
          risk: 'Breaking changes without user migration path',
          severity: 'medium',
          mitigation: 'Provide migration guide or deprecation period',
        });
        planQualityScore -= 10;
      }

      // Performance changes without benchmarks
      if ((lowerInput.includes('optimize') || lowerInput.includes('performance')) && !lowerInput.includes('benchmark') && !lowerInput.includes('measure')) {
        riskFactors.push({
          risk: 'Performance changes without baseline benchmarks',
          severity: 'medium',
          mitigation: 'Measure current performance before optimizing',
        });
        planQualityScore -= 8;
      }

      // Cap score at 0-100
      planQualityScore = Math.max(0, Math.min(100, planQualityScore));

      // Determine verdict
      let verdict: 'APPROVED' | 'REJECTED' | 'NEEDS_INPUT';
      let code: RinneganEnvelope['code'];
      let summary: string;

      if (planQualityScore < 40) {
        verdict = 'REJECTED';
        code = 'REJECT_BAD_PLAN';
        summary = `Plan quality too low (${planQualityScore}/100). ${criticalGaps.length} critical gaps and ${riskFactors.filter(r => r.severity === 'critical' || r.severity === 'high').length} high-risk factors.`;
      } else if (planQualityScore < 70) {
        verdict = 'NEEDS_INPUT';
        code = 'NEED_MORE_CONTEXT';
        summary = `Plan needs improvement (${planQualityScore}/100). Address ${criticalGaps.length} gaps before proceeding.`;
      } else {
        verdict = 'APPROVED';
        code = planQualityScore >= 90 ? 'OK' : 'OK_WITH_NOTES';
        summary = `Plan is ${planQualityScore >= 90 ? 'solid' : 'acceptable'} (${planQualityScore}/100). ${riskFactors.length > 0 ? `${riskFactors.length} risks identified.` : 'No major risks.'}`;
      }

      const suggestions: string[] = [];

      // Add top critical gaps
      criticalGaps.slice(0, 3).forEach(gap => {
        suggestions.push(`GAP: ${gap}`);
      });

      // Add top risk mitigations
      riskFactors
        .filter(r => r.severity === 'critical' || r.severity === 'high')
        .slice(0, 2)
        .forEach(r => {
          suggestions.push(`${r.severity.toUpperCase()} RISK: ${r.mitigation}`);
        });

      return {
        eye: 'rinnegan',
        code,
        verdict,
        summary,
        details: `Quality score: ${planQualityScore}/100. Steps: ${stepCount}. ` +
          `Has success criteria: ${hasSuccessCriteria}. Has rollback: ${hasRollback}. ` +
          `Critical gaps: ${criticalGaps.length}. Risk factors: ${riskFactors.length} (${riskFactors.filter(r => r.severity === 'critical').length} critical).`,
        suggestions: suggestions.length > 0 ? suggestions.slice(0, 5) : undefined,
        confidence: planQualityScore,
        metadata: {
          planQualityScore,
          hasSteps,
          stepCount,
          hasSuccessCriteria,
          hasRollback,
          hasDependencies,
          hasTimeEstimates,
          criticalGaps,
          riskFactors,
          improvedPlan: criticalGaps.length > 0 ? this.generateImprovedPlan(input, criticalGaps) : undefined,
        },
      };
    } catch (error) {
      return {
        eye: 'rinnegan',
        code: 'EYE_ERROR',
        verdict: 'NEEDS_INPUT',
        summary: `Rinnegan processing error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        confidence: 0,
      };
    }
  }

  private generateImprovedPlan(original: string, gaps: string[]): string {
    let improved = `## Improved Plan\n\n${original}\n\n## Required Additions:\n\n`;

    gaps.forEach((gap, index) => {
      improved += `${index + 1}. **${gap}**\n`;

      if (gap.includes('steps')) {
        improved += `   - Break down into clear, numbered steps\n`;
      }
      if (gap.includes('success criteria')) {
        improved += `   - Define "done" conditions and acceptance criteria\n`;
      }
      if (gap.includes('rollback')) {
        improved += `   - Add rollback procedure for each critical step\n`;
      }
      if (gap.includes('dependencies')) {
        improved += `   - Map dependencies: what must happen before each step\n`;
      }
      if (gap.includes('time')) {
        improved += `   - Add time estimates to track progress\n`;
      }
    });

    return improved;
  }

  /**
   * Sub-method: Plan Requirements
   * Validates that a plan has clear requirements and scope
   */
  async planRequirements(input: string, context?: Record<string, any>): Promise<RinneganEnvelope> {
    const result = await this.process(input, context);
    // Focus on requirements-specific scoring
    const hasRequirements = /requirements?|must|should|will/i.test(input);
    if (!hasRequirements) {
      return {
        ...result,
        verdict: 'NEEDS_INPUT',
        code: 'NEED_MORE_CONTEXT',
        summary: 'No clear requirements specified',
      };
    }
    return result;
  }

  /**
   * Sub-method: Plan Review
   * General plan quality review
   */
  async planReview(input: string, context?: Record<string, any>): Promise<RinneganEnvelope> {
    return this.process(input, context);
  }

  /**
   * Sub-method: Final Approval
   * Final check before execution - strictest validation
   */
  async finalApproval(input: string, context?: Record<string, any>): Promise<RinneganEnvelope> {
    const result = await this.process(input, context);
    // For final approval, require higher quality score
    if (result.metadata && result.metadata.planQualityScore < 80) {
      return {
        ...result,
        verdict: 'REJECTED',
        code: 'REJECT_BAD_PLAN',
        summary: `Plan quality ${result.metadata.planQualityScore}/100 insufficient for final approval (need 80+)`,
      };
    }
    return result;
  }

  validate(envelope: unknown): envelope is RinneganEnvelope {
    return RinneganEnvelopeSchema.safeParse(envelope).success;
  }

  getPersona(): string {
    return `You are Rinnegan, the Plan Validator Eye of the Third Eye MCP system.

Your SOLE PURPOSE is to validate implementation plans for completeness, feasibility, and risk management.

## Your Abilities
- Verify plans have structured steps (numbered or bulleted)
- Ensure success criteria and "done" definitions exist
- Demand rollback and error handling strategies
- Check for dependency mapping between steps
- Validate time estimates for tracking
- Identify risk factors and demand mitigation plans

## Response Protocol
You must ALWAYS return a valid JSON envelope:
{
  "eye": "rinnegan",
  "code": "OK" | "OK_WITH_NOTES" | "REJECT_BAD_PLAN" | "NEED_MORE_CONTEXT",
  "verdict": "APPROVED" | "REJECTED" | "NEEDS_INPUT",
  "summary": "Brief explanation (max 500 chars)",
  "details": "Quality score breakdown and risk analysis",
  "suggestions": ["GAP: missing element", "HIGH RISK: mitigation needed", ...],
  "confidence": 0-100,
  "metadata": {
    "planQualityScore": 0-100,
    "hasSteps": boolean,
    "stepCount": number,
    "hasSuccessCriteria": boolean,
    "hasRollback": boolean,
    "hasDependencies": boolean,
    "hasTimeEstimates": boolean,
    "criticalGaps": ["gap1", "gap2", ...],
    "riskFactors": [{
      "risk": "description",
      "severity": "low" | "medium" | "high" | "critical",
      "mitigation": "what to do"
    }],
    "improvedPlan": "enhanced version with gaps filled"
  }
}

## Plan Quality Scoring
Start at 100, deduct for missing elements:
- No structured steps: -25
- Too few steps: -15
- No success criteria: -20
- No rollback/error handling: -15
- No dependencies: -10
- No time estimates: -8

Additional deductions for specific risks:
- Database changes without backup: -20
- API changes without versioning: -12
- Security changes without testing: -18
- Production deployment without staging: -15
- Breaking changes without migration: -10
- Performance changes without benchmarks: -8

## Severity Thresholds
- 90-100: Excellent plan (APPROVED with OK)
- 70-89: Good plan with minor notes (APPROVED with OK_WITH_NOTES)
- 40-69: Needs improvement (NEEDS_INPUT with NEED_MORE_CONTEXT)
- 0-39: Fundamentally flawed (REJECTED with REJECT_BAD_PLAN)

## Risk Severity Levels
- **CRITICAL**: Could cause data loss, security breach, or system outage
- **HIGH**: Could cause significant user impact or require emergency rollback
- **MEDIUM**: Could cause minor issues or require manual intervention
- **LOW**: Could cause inconvenience but easily fixable

## Example Judgments

**REJECT_BAD_PLAN (Score 28)**
Input: "Update the API to use new authentication"
Analysis:
- No steps (-25)
- No success criteria (-20)
- No rollback (-15)
- API changes without versioning (-12)
- Security changes without testing (-18)
Score: 28/100
Gaps: ["No structured steps", "No success criteria", "No rollback strategy", "No versioning", "No security testing"]

**NEED_MORE_CONTEXT (Score 55)**
Input: "1. Create new endpoint 2. Update frontend 3. Deploy"
Analysis:
- Has steps (+0)
- No success criteria (-20)
- No rollback (-15)
- No dependencies (-10)
Score: 55/100
Gaps: ["No success criteria", "No rollback plan", "No dependencies mapped"]

**OK (Score 92)**
Input: "1. Backup database 2. Run migration script 3. Verify data integrity 4. Update API version to v2 5. Deploy to staging 6. Run E2E tests 7. If tests pass, deploy to production, else rollback"
Analysis:
- Structured steps ✓
- Success criteria (tests pass) ✓
- Rollback explicit ✓
- Dependencies clear ✓
- Staging before prod ✓
Score: 92/100

Demand rigor. Plans save time.`;
  }
}

// Export singleton instance
export const rinnegan = new RinneganEye();
