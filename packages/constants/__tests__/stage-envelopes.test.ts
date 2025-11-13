import { describe, it, expect } from "vitest";
import { EyeId, EyeStageToken, EyeStatusCode } from "../taxonomy";
import {
  getStageTemplate,
  buildStageEnvelopeJsonSchema,
} from "../stage-envelopes";
import type { StageEnvelopeTemplate } from "../stage-envelopes";

describe("Stage Envelopes", () => {
  describe("getStageTemplate", () => {
    it("should return template for valid eye and stage", () => {
      const template = getStageTemplate(
        EyeId.SHARINGAN,
        EyeStageToken.GUIDANCE,
      );
      expect(template).not.toBeNull();
      expect(template?.allowedCodes).toBeDefined();
      expect(template?.skeleton).toBeDefined();
      expect(template?.checklist).toBeDefined();
    });

    it("should return null for invalid eye", () => {
      const template = getStageTemplate(
        "invalid-eye" as EyeId,
        EyeStageToken.GUIDANCE,
      );
      expect(template).toBeNull();
    });

    it("should return template for all built-in eyes", () => {
      const validEyes = [
        EyeId.OVERSEER,
        EyeId.SHARINGAN,
        EyeId.KYUUBI,
        EyeId.JOGAN,
        EyeId.RINNEGAN,
        EyeId.MANGEKYO,
        EyeId.TENSEIGAN,
        EyeId.BYAKUGAN,
      ];

      for (const eyeId of validEyes) {
        const guidance = getStageTemplate(eyeId, EyeStageToken.GUIDANCE);
        expect(guidance).not.toBeNull();
      }
    });

    it("should return different templates for guidance and validation stages", () => {
      const guidance = getStageTemplate(EyeId.KYUUBI, EyeStageToken.GUIDANCE);
      const validation = getStageTemplate(
        EyeId.KYUUBI,
        EyeStageToken.VALIDATION,
      );

      expect(guidance).not.toBeNull();
      expect(validation).not.toBeNull();
      expect(guidance?.skeleton).not.toBe(validation?.skeleton);
    });
  });

  describe("StageEnvelopeTemplate structure", () => {
    it("should have frozen allowedCodes array", () => {
      const template = getStageTemplate(
        EyeId.SHARINGAN,
        EyeStageToken.GUIDANCE,
      );
      expect(template).not.toBeNull();
      if (template) {
        expect(Object.isFrozen(template.allowedCodes)).toBe(true);
      }
    });

    it("should have frozen checklist array", () => {
      const template = getStageTemplate(EyeId.KYUUBI, EyeStageToken.VALIDATION);
      expect(template).not.toBeNull();
      if (template) {
        expect(Object.isFrozen(template.checklist)).toBe(true);
      }
    });

    it("should have valid JSON skeleton", () => {
      const template = getStageTemplate(EyeId.JOGAN, EyeStageToken.GUIDANCE);
      expect(template).not.toBeNull();
      if (template) {
        expect(() => JSON.parse(template.skeleton)).not.toThrow();
      }
    });

    it("should have allowedCodes for guidance stage", () => {
      const guidanceTemplates = [
        EyeId.OVERSEER,
        EyeId.SHARINGAN,
        EyeId.KYUUBI,
        EyeId.JOGAN,
        EyeId.RINNEGAN,
        EyeId.MANGEKYO,
        EyeId.TENSEIGAN,
        EyeId.BYAKUGAN,
      ].map((eyeId) => getStageTemplate(eyeId, EyeStageToken.GUIDANCE));

      for (const template of guidanceTemplates) {
        expect(template).not.toBeNull();
        expect(template?.allowedCodes.length).toBeGreaterThan(0);
      }
    });

    it("should have allowedCodes for validation stage", () => {
      const validationTemplates = [
        EyeId.OVERSEER,
        EyeId.SHARINGAN,
        EyeId.KYUUBI,
        EyeId.JOGAN,
        EyeId.RINNEGAN,
        EyeId.MANGEKYO,
        EyeId.TENSEIGAN,
        EyeId.BYAKUGAN,
      ].map((eyeId) => getStageTemplate(eyeId, EyeStageToken.VALIDATION));

      for (const template of validationTemplates) {
        expect(template).not.toBeNull();
        expect(template?.allowedCodes.length).toBeGreaterThan(0);
      }
    });
  });

  describe("buildStageEnvelopeJsonSchema", () => {
    it("should build schema from valid template", () => {
      const schema = buildStageEnvelopeJsonSchema(
        EyeId.SHARINGAN,
        EyeStageToken.GUIDANCE,
      );
      expect(schema).not.toBeNull();
      expect(schema?.name).toBe("sharingan-guidance");
      expect(schema?.strict).toBe(true);
      expect(schema?.schema).toBeDefined();
    });

    it("should return null for invalid eye", () => {
      const schema = buildStageEnvelopeJsonSchema(
        "invalid-eye" as EyeId,
        EyeStageToken.GUIDANCE,
      );
      expect(schema).toBeNull();
    });

    it("should return null for invalid stage", () => {
      const schema = buildStageEnvelopeJsonSchema(
        EyeId.SHARINGAN,
        "invalid-stage" as EyeStageToken,
      );
      expect(schema).toBeNull();
    });

    it("should build schemas for all eyes and stages", () => {
      const eyeIds = Object.values(EyeId);
      const stages = [EyeStageToken.GUIDANCE, EyeStageToken.VALIDATION];

      for (const eyeId of eyeIds) {
        for (const stage of stages) {
          const schema = buildStageEnvelopeJsonSchema(eyeId, stage);
          expect(schema).not.toBeNull();
          expect(schema?.name).toBe(`${eyeId}-${stage}`);
        }
      }
    });
  });

  describe("Template integrity", () => {
    it("should have checklist items for all templates", () => {
      const eyeIds = Object.values(EyeId);
      const stages = [EyeStageToken.GUIDANCE, EyeStageToken.VALIDATION];

      for (const eyeId of eyeIds) {
        for (const stage of stages) {
          const template = getStageTemplate(eyeId, stage);
          expect(template).not.toBeNull();
          if (template) {
            expect(template.checklist.length).toBeGreaterThan(0);
          }
        }
      }
    });

    it("should have at least one allowed code per template", () => {
      const eyeIds = Object.values(EyeId);
      const stages = [EyeStageToken.GUIDANCE, EyeStageToken.VALIDATION];

      for (const eyeId of eyeIds) {
        for (const stage of stages) {
          const template = getStageTemplate(eyeId, stage);
          expect(template).not.toBeNull();
          if (template) {
            expect(template.allowedCodes.length).toBeGreaterThan(0);
          }
        }
      }
    });
  });

  describe("Shared pattern checking", () => {
    it("should enforce guidance codes have ok=false when NE assistance needed", () => {
      const guidanceTemplates = [
        EyeId.SHARINGAN,
        EyeId.KYUUBI,
        EyeId.JOGAN,
      ].map((eyeId) => getStageTemplate(eyeId, EyeStageToken.GUIDANCE));

      for (const template of guidanceTemplates) {
        if (template) {
          const skeleton = JSON.parse(template.skeleton);
          expect(skeleton.ok).toBe(false);
        }
      }
    });

    it("should enforce validation codes have ok=true when successful", () => {
      const validationTemplates = [
        EyeId.SHARINGAN,
        EyeId.KYUUBI,
        EyeId.JOGAN,
      ].map((eyeId) => getStageTemplate(eyeId, EyeStageToken.VALIDATION));

      for (const template of validationTemplates) {
        if (template) {
          const skeleton = JSON.parse(template.skeleton);
          expect(skeleton.ok).toBe(true);
        }
      }
    });
  });
});
