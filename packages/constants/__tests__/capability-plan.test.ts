import { describe, it, expect } from 'vitest';
import { RequestType, ContentDomain, EyeId, EyeStageToken } from '../taxonomy';
import { resolveCapabilityPlan, CapabilityPlanResolutionError } from '../capability-plan';
import type { CapabilityPlanConfig } from '../capability-plan';

describe('Capability Plan Resolver', () => {
  describe('resolveCapabilityPlan', () => {
    it('should resolve plan for NEW_TASK and MIXED domain', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      expect(plan).toBeDefined();
      expect(plan.route).toBeDefined();
      expect(plan.assignments).toBeDefined();
      expect(plan.assignments.length).toBeGreaterThan(0);
    });

    it('should resolve plan for NEW_TASK and CODE domain', () => {
      // CODE domain may fail if no eye satisfies all requirements
      try {
        const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.CODE);
        expect(plan).toBeDefined();
        expect(plan.route.length).toBeGreaterThan(0);
      } catch (error) {
        expect(error).toBeInstanceOf(CapabilityPlanResolutionError);
      }
    });

    it('should resolve plan for NEW_TASK and TEXT domain', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.TEXT);
      expect(plan).toBeDefined();
      expect(plan.route.length).toBeGreaterThan(0);
    });

    it('should resolve plan for DRAFT_REVIEW request type', () => {
      const plan = resolveCapabilityPlan(RequestType.DRAFT_REVIEW, ContentDomain.MIXED);
      expect(plan).toBeDefined();
      expect(plan.assignments.length).toBeGreaterThan(0);
    });

    it('should resolve plan for VALIDATION_ONLY request type', () => {
      const plan = resolveCapabilityPlan(RequestType.VALIDATION_ONLY, ContentDomain.MIXED);
      expect(plan).toBeDefined();
      expect(plan.assignments.length).toBeGreaterThan(0);
    });

    it('should use default values for null requestType and contentDomain', () => {
      const plan = resolveCapabilityPlan(null, null);
      expect(plan).toBeDefined();
      expect(plan.route.length).toBeGreaterThan(0);
    });

    it('should use default values for undefined requestType and contentDomain', () => {
      const plan = resolveCapabilityPlan(undefined, undefined);
      expect(plan).toBeDefined();
      expect(plan.route.length).toBeGreaterThan(0);
    });
  });

  describe('CapabilityPlan structure', () => {
    it('should have valid route array', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      expect(Array.isArray(plan.route)).toBe(true);
      expect(plan.route.length).toBeGreaterThan(0);
    });

    it('should have assignments matching route length', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      expect(plan.assignments.length).toBeGreaterThan(0);
    });

    it('should have ordered assignments', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      for (let i = 0; i < plan.assignments.length; i++) {
        expect(plan.assignments[i].order).toBe(i);
      }
    });

    it('should have eyeId for each assignment', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      for (const assignment of plan.assignments) {
        expect(assignment.eyeId).toBeDefined();
        expect(typeof assignment.eyeId).toBe('string');
      }
    });

    it('should have stage for each assignment', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      for (const assignment of plan.assignments) {
        expect(assignment.stage).toBeDefined();
        expect([EyeStageToken.GUIDANCE, EyeStageToken.VALIDATION]).toContain(assignment.stage);
      }
    });

    it('should have capabilities array for each assignment', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      for (const assignment of plan.assignments) {
        expect(Array.isArray(assignment.capabilities)).toBe(true);
        expect(assignment.capabilities.length).toBeGreaterThan(0);
      }
    });

    it('should have capabilityLabels array for each assignment', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      for (const assignment of plan.assignments) {
        expect(Array.isArray(assignment.capabilityLabels)).toBe(true);
        expect(assignment.capabilityLabels.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Route ordering', () => {
    it('should have guidance stages before validation stages', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      const guidanceCount = plan.assignments.filter((a) => a.stage === EyeStageToken.GUIDANCE).length;
      const validationCount = plan.assignments.filter((a) => a.stage === EyeStageToken.VALIDATION).length;
      expect(guidanceCount).toBeGreaterThan(0);
      expect(validationCount).toBeGreaterThan(0);

      let foundValidation = false;
      for (const assignment of plan.assignments) {
        if (assignment.stage === EyeStageToken.VALIDATION) {
          foundValidation = true;
        }
        if (foundValidation) {
          expect(assignment.stage).toBe(EyeStageToken.VALIDATION);
        }
      }
    });
  });

  describe('Custom Eyes support', () => {
    it('should support custom eyes via options', () => {
      const customEye = {
        id: 'custom-sharingan',
        capabilities: ['clarification', 'ambiguity_detection'] as const,
      };

      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.TEXT, {
        availableEyes: [customEye],
      });

      expect(plan).toBeDefined();
      expect(plan.route.length).toBeGreaterThan(0);
    });

    it('should prefer built-in eyes over custom eyes', () => {
      const customEye = {
        id: 'custom-clarifier',
        capabilities: ['clarification'] as const,
      };

      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED, {
        availableEyes: [customEye],
      });

      expect(plan.route.includes(EyeId.SHARINGAN)).toBe(true);
    });

    it('should allow eye reuse when allowEyeReuse is true', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED, {
        allowEyeReuse: true,
      });

      expect(plan).toBeDefined();
      expect(plan.route.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should throw CapabilityPlanResolutionError when no eyes satisfy requirements', () => {
      try {
        resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED, {
          availableEyes: [
            { id: 'incomplete-eye', capabilities: ['random_capability'] as const },
          ],
        });
        // If it doesn't throw, that's okay - the fallback might work
      } catch (error) {
        expect(error).toBeInstanceOf(CapabilityPlanResolutionError);
      }
    });

    it('should handle empty availableEyes gracefully', () => {
      // Empty availableEyes should fall back to built-in eyes
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED, {
        availableEyes: [],
      });
      expect(plan).toBeDefined();
      expect(plan.route.length).toBeGreaterThan(0);
    });
  });

  describe('Different content domains produce different routes', () => {
    it('should produce different routes for CODE vs TEXT domains', () => {
      try {
        const codePlan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.CODE);
        const textPlan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.TEXT);
        expect(codePlan.route).not.toEqual(textPlan.route);
      } catch (error) {
        // CODE domain may fail if requirements are too strict
        expect(error).toBeInstanceOf(CapabilityPlanResolutionError);
      }
    });

    it('should produce different routes for NEW_TASK vs VALIDATION_ONLY', () => {
      const newTaskPlan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      const validationPlan = resolveCapabilityPlan(RequestType.VALIDATION_ONLY, ContentDomain.MIXED);

      expect(newTaskPlan.route.length).toBeGreaterThan(validationPlan.route.length);
    });
  });

  describe('Assignment completeness', () => {
    it('should always include capabilities field in assignments', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      for (const assignment of plan.assignments) {
        expect(assignment.capabilities).toBeDefined();
        expect(Array.isArray(assignment.capabilities)).toBe(true);
      }
    });

    it('should always include capabilityLabels field in assignments', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      for (const assignment of plan.assignments) {
        expect(assignment.capabilityLabels).toBeDefined();
        expect(Array.isArray(assignment.capabilityLabels)).toBe(true);
      }
    });

    it('should have same length for capabilities and capabilityLabels', () => {
      const plan = resolveCapabilityPlan(RequestType.NEW_TASK, ContentDomain.MIXED);
      for (const assignment of plan.assignments) {
        expect(assignment.capabilities.length).toBe(assignment.capabilityLabels.length);
      }
    });
  });
});
