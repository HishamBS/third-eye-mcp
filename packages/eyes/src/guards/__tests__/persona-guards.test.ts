import { describe, it, expect } from "vitest";
import {
  ensureEyeBehavior,
  buildReminderMessage,
  validateStatusCode,
} from "../persona-guards";
import { OVERSEER_BLUEPRINT } from "../../blueprints";
import { EnvelopeField, EyeStatusCode, EyeTag } from "@third-eye/constants";

describe("Persona Guards", () => {
  describe("ensureEyeBehavior", () => {
    it("should pass valid envelope", () => {
      const envelope = {
        [EnvelopeField.TAG]: EyeTag.OVERSEER,
        [EnvelopeField.OK]: true,
        [EnvelopeField.CODE]: EyeStatusCode.OK,
        [EnvelopeField.DATA]: {
          requestType: "new_task",
          contentDomain: "mixed",
        },
        [EnvelopeField.UI]: {
          title: "Title",
          summary: "Summary",
          details: "Details",
          icon: "icon",
          color: "color",
        },
        [EnvelopeField.NEXT]: "next-eye",
      };

      const result = ensureEyeBehavior(OVERSEER_BLUEPRINT, envelope);
      expect(result.valid).toBe(true);
      expect(result.violations.length).toBe(0);
    });

    it("should fail when envelope is not an object", () => {
      const result = ensureEyeBehavior(OVERSEER_BLUEPRINT, null);
      expect(result.valid).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.violations[0].field).toBe("envelope");
    });

    it("should fail when tag is missing", () => {
      const envelope = {
        [EnvelopeField.OK]: true,
        [EnvelopeField.CODE]: EyeStatusCode.OK,
        [EnvelopeField.DATA]: {},
        [EnvelopeField.UI]: {},
      };

      const result = ensureEyeBehavior(OVERSEER_BLUEPRINT, envelope);
      expect(result.valid).toBe(false);
      const tagViolation = result.violations.find(
        (v) => v.field === EnvelopeField.TAG,
      );
      expect(tagViolation).toBeDefined();
    });

    it("should fail when tag is wrong", () => {
      const envelope = {
        [EnvelopeField.TAG]: EyeTag.SHARINGAN,
        [EnvelopeField.OK]: true,
        [EnvelopeField.CODE]: EyeStatusCode.OK,
        [EnvelopeField.DATA]: {},
        [EnvelopeField.UI]: {},
      };

      const result = ensureEyeBehavior(OVERSEER_BLUEPRINT, envelope);
      expect(result.valid).toBe(false);
      const violation = result.violations.find(
        (v) => v.field === EnvelopeField.TAG,
      );
      expect(violation).toBeDefined();
    });

    it("should fail when required data keys are missing", () => {
      const envelope = {
        [EnvelopeField.TAG]: EyeTag.OVERSEER,
        [EnvelopeField.OK]: true,
        [EnvelopeField.CODE]: EyeStatusCode.OK,
        [EnvelopeField.DATA]: {},
        [EnvelopeField.UI]: {},
      };

      const result = ensureEyeBehavior(OVERSEER_BLUEPRINT, envelope);
      expect(result.valid).toBe(false);
      const dataViolations = result.violations.filter((v) =>
        v.field.startsWith(EnvelopeField.DATA),
      );
      expect(dataViolations.length).toBeGreaterThan(0);
    });

    it("should fail when required UI keys are missing", () => {
      const envelope = {
        [EnvelopeField.TAG]: EyeTag.OVERSEER,
        [EnvelopeField.OK]: true,
        [EnvelopeField.CODE]: EyeStatusCode.OK,
        [EnvelopeField.DATA]: {
          requestType: "new_task",
          contentDomain: "mixed",
        },
        [EnvelopeField.UI]: {},
      };

      const result = ensureEyeBehavior(OVERSEER_BLUEPRINT, envelope);
      expect(result.valid).toBe(false);
      const uiViolations = result.violations.filter((v) =>
        v.field.startsWith(EnvelopeField.UI),
      );
      expect(uiViolations.length).toBeGreaterThan(0);
    });

    it("should detect when ok is not boolean", () => {
      const envelope = {
        [EnvelopeField.TAG]: EyeTag.OVERSEER,
        [EnvelopeField.OK]: "not-a-boolean",
        [EnvelopeField.CODE]: EyeStatusCode.OK,
        [EnvelopeField.DATA]: {},
        [EnvelopeField.UI]: {},
      };

      const result = ensureEyeBehavior(OVERSEER_BLUEPRINT, envelope);
      expect(result.valid).toBe(false);
      const okViolation = result.violations.find(
        (v) => v.field === EnvelopeField.OK,
      );
      expect(okViolation).toBeDefined();
    });
  });

  describe("buildReminderMessage", () => {
    it("should return no violations message for empty array", () => {
      const message = buildReminderMessage([]);
      expect(message).toBe("No violations detected.");
    });

    it("should build message with violations", () => {
      const violations = [
        {
          field: "tag",
          message: "Missing tag",
          reminder: "Include the tag field",
        },
        {
          field: "ok",
          message: "Invalid ok",
          reminder: "Include the ok field",
        },
      ];

      const message = buildReminderMessage(violations);
      expect(message).toContain("2 violation(s)");
      expect(message).toContain("tag: Include the tag field");
      expect(message).toContain("ok: Include the ok field");
    });
  });

  describe("validateStatusCode", () => {
    it("should return true for valid code", () => {
      const allowedCodes = ["OK", "ERROR", "NEED_CLARIFICATION"];
      expect(validateStatusCode("OK", allowedCodes)).toBe(true);
    });

    it("should return false for invalid code", () => {
      const allowedCodes = ["OK", "ERROR", "NEED_CLARIFICATION"];
      expect(validateStatusCode("INVALID", allowedCodes)).toBe(false);
    });

    it("should return false for non-string code", () => {
      const allowedCodes = ["OK", "ERROR", "NEED_CLARIFICATION"];
      expect(validateStatusCode(123, allowedCodes)).toBe(false);
    });
  });
});
