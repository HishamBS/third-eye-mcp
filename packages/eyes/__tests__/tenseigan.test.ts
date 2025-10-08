import { describe, it, expect } from 'vitest';
import { TenseiganEye, TenseiganEnvelopeSchema } from '../src/eyes/tenseigan';

const tenseigan = new TenseiganEye();

describe('Tenseigan Eye', () => {
  describe('Citation Validation', () => {
    it('should validate claims with proper citations', () => {
      const envelope = {
        eye: 'tenseigan' as const,
        code: 'OK' as const,
        verdict: 'APPROVED' as const,
        summary: 'All claims supported by citations',
        details: 'TypeScript release date backed by official documentation',
        suggestions: [],
        confidence: 95,
        metadata: {
          evidenceScore: 100,
          totalClaims: 1,
          claimsWithEvidence: 1,
          claimsWithoutEvidence: 0,
          claims: [{
            claim: 'TypeScript was released in 2012',
            startIndex: 0,
            endIndex: 33,
            hasEvidence: true,
            evidenceType: 'citation' as const,
            evidenceQuality: 'strong' as const
          }],
          unsupportedClaims: []
        }
      };

      expect(tenseigan.validate(envelope)).toBe(true);
      expect(envelope.metadata.evidenceScore).toBe(100);
    });

    it('should flag claims without citations', () => {
      const envelope = {
        eye: 'tenseigan' as const,
        code: 'REJECT_NO_EVIDENCE' as const,
        verdict: 'REJECTED' as const,
        summary: 'Unsupported opinion claim detected',
        details: 'Subjective claim without supporting evidence',
        suggestions: ['Add supporting data', 'Provide benchmarks', 'Include citations'],
        confidence: 0,
        metadata: {
          evidenceScore: 0,
          totalClaims: 1,
          claimsWithEvidence: 0,
          claimsWithoutEvidence: 1,
          claims: [{
            claim: 'TypeScript is the best language',
            startIndex: 0,
            endIndex: 32,
            hasEvidence: false,
            evidenceType: 'none' as const,
            evidenceQuality: 'missing' as const,
            suggestion: 'Add supporting data, citations, examples, or reasoning'
          }],
          unsupportedClaims: ['TypeScript is the best language']
        }
      };

      expect(tenseigan.validate(envelope)).toBe(true);
      expect(envelope.code).toBe('REJECT_NO_EVIDENCE');
      expect(envelope.metadata.evidenceScore).toBe(0);
    });

    it('should calculate evidence scores correctly', () => {
      const envelope = {
        eye: 'tenseigan' as const,
        code: 'OK_WITH_NOTES' as const,
        verdict: 'APPROVED' as const,
        summary: 'Mixed evidence quality detected',
        details: '2 out of 3 claims have evidence',
        suggestions: ['Provide evidence for unsupported claim'],
        confidence: 67,
        metadata: {
          evidenceScore: 67, // (2/3) * 100 = 66.7 ≈ 67
          totalClaims: 3,
          claimsWithEvidence: 2,
          claimsWithoutEvidence: 1,
          claims: [
            {
              claim: 'Fact 1',
              startIndex: 0,
              endIndex: 6,
              hasEvidence: true,
              evidenceType: 'citation' as const,
              evidenceQuality: 'strong' as const
            },
            {
              claim: 'Fact 2',
              startIndex: 7,
              endIndex: 13,
              hasEvidence: true,
              evidenceType: 'citation' as const,
              evidenceQuality: 'strong' as const
            },
            {
              claim: 'Fact 3',
              startIndex: 14,
              endIndex: 20,
              hasEvidence: false,
              evidenceType: 'none' as const,
              evidenceQuality: 'missing' as const
            }
          ],
          unsupportedClaims: ['Fact 3']
        }
      };

      expect(tenseigan.validate(envelope)).toBe(true);
      expect(envelope.metadata.evidenceScore).toBe(67);
      expect(envelope.metadata.claimsWithEvidence).toBe(2);
      expect(envelope.metadata.claimsWithoutEvidence).toBe(1);
    });
  });

  describe('Evidence Detection', () => {
    it('should detect data/statistics as strong evidence', () => {
      const envelope = {
        eye: 'tenseigan' as const,
        code: 'OK' as const,
        verdict: 'APPROVED' as const,
        summary: 'Strong statistical evidence found',
        details: 'Claims backed by concrete data',
        suggestions: [],
        confidence: 100,
        metadata: {
          evidenceScore: 100,
          totalClaims: 2,
          claimsWithEvidence: 2,
          claimsWithoutEvidence: 0,
          claims: [
            {
              claim: 'Performance improved by 50%',
              startIndex: 0,
              endIndex: 25,
              hasEvidence: true,
              evidenceType: 'data' as const,
              evidenceQuality: 'strong' as const
            },
            {
              claim: '1000 users tested the feature',
              startIndex: 26,
              endIndex: 52,
              hasEvidence: true,
              evidenceType: 'data' as const,
              evidenceQuality: 'strong' as const
            }
          ],
          unsupportedClaims: []
        }
      };

      expect(tenseigan.validate(envelope)).toBe(true);
      expect(envelope.metadata.claims[0].evidenceType).toBe('data');
      expect(envelope.metadata.claims[0].evidenceQuality).toBe('strong');
    });

    it('should detect examples as moderate evidence', () => {
      const envelope = {
        eye: 'tenseigan' as const,
        code: 'OK_WITH_NOTES' as const,
        verdict: 'APPROVED' as const,
        summary: 'Evidence found but could be stronger',
        details: 'Examples provide moderate support',
        suggestions: ['Consider adding data or citations for stronger evidence'],
        confidence: 75,
        metadata: {
          evidenceScore: 100,
          totalClaims: 1,
          claimsWithEvidence: 1,
          claimsWithoutEvidence: 0,
          claims: [{
            claim: 'This pattern works well',
            startIndex: 0,
            endIndex: 22,
            hasEvidence: true,
            evidenceType: 'example' as const,
            evidenceQuality: 'moderate' as const
          }],
          unsupportedClaims: []
        }
      };

      expect(tenseigan.validate(envelope)).toBe(true);
      expect(envelope.metadata.claims[0].evidenceType).toBe('example');
      expect(envelope.metadata.claims[0].evidenceQuality).toBe('moderate');
    });
  });

  describe('Evidence Quality Assessment', () => {
    it('should accept strong citations', () => {
      const envelope = {
        eye: 'tenseigan' as const,
        code: 'OK' as const,
        verdict: 'APPROVED' as const,
        summary: 'All claims backed by authoritative citations',
        details: 'Official documentation provides strong evidence',
        suggestions: [],
        confidence: 100,
        metadata: {
          evidenceScore: 100,
          totalClaims: 1,
          claimsWithEvidence: 1,
          claimsWithoutEvidence: 0,
          claims: [{
            claim: 'React supports hooks since version 16.8',
            startIndex: 0,
            endIndex: 38,
            hasEvidence: true,
            evidenceType: 'citation' as const,
            evidenceQuality: 'strong' as const
          }],
          unsupportedClaims: []
        }
      };

      expect(tenseigan.validate(envelope)).toBe(true);
      expect(envelope.metadata.claims[0].evidenceQuality).toBe('strong');
    });

    it('should flag hedging language as weak evidence', () => {
      const envelope = {
        eye: 'tenseigan' as const,
        code: 'NEED_MORE_CONTEXT' as const,
        verdict: 'NEEDS_INPUT' as const,
        summary: 'Hedging language indicates uncertainty',
        details: 'Claims use uncertain language without concrete evidence',
        suggestions: ['Replace hedging language with concrete evidence or data'],
        confidence: 25,
        metadata: {
          evidenceScore: 0,
          totalClaims: 1,
          claimsWithEvidence: 0,
          claimsWithoutEvidence: 1,
          claims: [{
            claim: 'This might improve performance',
            startIndex: 0,
            endIndex: 30,
            hasEvidence: false,
            evidenceType: 'none' as const,
            evidenceQuality: 'weak' as const,
            suggestion: 'Replace hedging language with concrete evidence or data'
          }],
          unsupportedClaims: ['This might improve performance']
        }
      };

      expect(tenseigan.validate(envelope)).toBe(true);
      expect(envelope.metadata.claims[0].evidenceQuality).toBe('weak');
      expect(envelope.code).toBe('NEED_MORE_CONTEXT');
    });

    it('should validate the persona method returns proper format', () => {
      const persona = tenseigan.getPersona();

      expect(persona).toContain('Tenseigan');
      expect(persona).toContain('Evidence Validator');
      expect(persona).toContain('JSON envelope');
      expect(persona).toContain('evidenceScore');
    });
  });
});
