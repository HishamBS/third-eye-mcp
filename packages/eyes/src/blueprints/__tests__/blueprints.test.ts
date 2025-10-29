import { describe, it, expect } from 'vitest';
import {
  OVERSEER_BLUEPRINT,
  SHARINGAN_BLUEPRINT,
  JOGAN_BLUEPRINT,
  RINNEGAN_BLUEPRINT,
  MANGEKYO_BLUEPRINT,
  TENSEIGAN_BLUEPRINT,
  BYAKUGAN_BLUEPRINT,
  PROMPT_HELPER_BLUEPRINT,
} from '../index';

describe('Persona Blueprints', () => {
  const allBlueprints = [
    OVERSEER_BLUEPRINT,
    SHARINGAN_BLUEPRINT,
    JOGAN_BLUEPRINT,
    RINNEGAN_BLUEPRINT,
    MANGEKYO_BLUEPRINT,
    TENSEIGAN_BLUEPRINT,
    BYAKUGAN_BLUEPRINT,
    PROMPT_HELPER_BLUEPRINT,
  ];

  describe('Blueprint Structure', () => {
    it('should have all 8 blueprints defined', () => {
      expect(allBlueprints.length).toBe(8);
    });

    it('should have metadata for each blueprint', () => {
      for (const blueprint of allBlueprints) {
        expect(blueprint.metadata).toBeDefined();
        expect(blueprint.metadata.eyeId).toBeDefined();
        expect(blueprint.metadata.name).toBeDefined();
        expect(blueprint.metadata.description).toBeDefined();
        expect(blueprint.metadata.version).toBeDefined();
        expect(blueprint.metadata.capabilities).toBeDefined();
        expect(Array.isArray(blueprint.metadata.capabilities)).toBe(true);
      }
    });

    it('should have mission for each blueprint', () => {
      for (const blueprint of allBlueprints) {
        expect(blueprint.mission).toBeDefined();
        expect(typeof blueprint.mission).toBe('string');
        expect(blueprint.mission.length).toBeGreaterThan(0);
      }
    });

    it('should have phase specifications', () => {
      for (const blueprint of allBlueprints) {
        expect(blueprint.phases).toBeDefined();
      }
    });

    it('should have envelope contract', () => {
      for (const blueprint of allBlueprints) {
        expect(blueprint.envelopeContract).toBeDefined();
        expect(blueprint.envelopeContract.requiredKeys).toBeDefined();
        expect(Array.isArray(blueprint.envelopeContract.requiredKeys)).toBe(true);
      }
    });

    it('should have reminders', () => {
      for (const blueprint of allBlueprints) {
        expect(blueprint.reminders).toBeDefined();
        expect(Array.isArray(blueprint.reminders)).toBe(true);
      }
    });
  });

  describe('Example JSON Parsing', () => {
    const testBlueprintExamples = (blueprint: any) => {
      for (const phase of [blueprint.phases.guidance, blueprint.phases.validation].filter(Boolean)) {
        expect(phase.example).toBeDefined();
        expect(typeof phase.example).toBe('string');
        
        try {
          const parsed = JSON.parse(phase.example);
          expect(parsed).toBeDefined();
          expect(typeof parsed).toBe('object');
        } catch (error) {
          throw new Error(`Failed to parse example JSON for ${blueprint.metadata.name}: ${error}`);
        }
      }
    };

    it('should have valid JSON examples for Overseer', () => {
      testBlueprintExamples(OVERSEER_BLUEPRINT);
    });

    it('should have valid JSON examples for Sharingan', () => {
      testBlueprintExamples(SHARINGAN_BLUEPRINT);
    });

    it('should have valid JSON examples for Jogan', () => {
      testBlueprintExamples(JOGAN_BLUEPRINT);
    });

    it('should have valid JSON examples for Rinnegan', () => {
      testBlueprintExamples(RINNEGAN_BLUEPRINT);
    });

    it('should have valid JSON examples for Mangekyo', () => {
      testBlueprintExamples(MANGEKYO_BLUEPRINT);
    });

    it('should have valid JSON examples for Tenseigan', () => {
      testBlueprintExamples(TENSEIGAN_BLUEPRINT);
    });

    it('should have valid JSON examples for Byakugan', () => {
      testBlueprintExamples(BYAKUGAN_BLUEPRINT);
    });

    it('should have valid JSON examples for Kyuubi', () => {
      testBlueprintExamples(PROMPT_HELPER_BLUEPRINT);
    });
  });

  describe('Envelope Contract Validation', () => {
    it('should have required keys for each blueprint', () => {
      for (const blueprint of allBlueprints) {
        const requiredKeys = blueprint.envelopeContract.requiredKeys;
        expect(requiredKeys.length).toBeGreaterThan(0);
        for (const key of requiredKeys) {
          expect(key).toBeDefined();
          expect(typeof key).toBe('string');
        }
      }
    });

    it('should have required data keys', () => {
      for (const blueprint of allBlueprints) {
        const dataKeys = blueprint.envelopeContract.requiredDataKeys;
        expect(Array.isArray(dataKeys)).toBe(true);
      }
    });

    it('should have required UI keys', () => {
      for (const blueprint of allBlueprints) {
        const uiKeys = blueprint.envelopeContract.requiredUiKeys;
        expect(Array.isArray(uiKeys)).toBe(true);
        expect(uiKeys.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Zero String Literals', () => {
    it('should not contain string literals in examples', () => {
      const stringLiterals = [
        "'tag'",
        "'ok'",
        "'code'",
        "'data'",
        "'ui'",
        "'next'",
        "'title'",
        "'summary'",
        "'details'",
        "'icon'",
        "'color'",
        "'success'",
        "'warning'",
        "'error'",
        "'info'",
        "'🔍'",
        "'✅'",
        "'🎉'",
        "'⚠️'",
        "'👁️'",
        "'✨'",
        "'📋'",
        "'🔬'",
      ];

      for (const blueprint of allBlueprints) {
        const source = Object.values(blueprint).join(' ');
        for (const literal of stringLiterals) {
          expect(source).not.toContain(literal);
        }
      }
    });
  });
});
