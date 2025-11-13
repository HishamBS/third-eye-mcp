import { describe, it, expect } from "vitest";
import {
  EyeId,
  ALL_EYE_IDS,
  EyeStageToken,
  ALL_EYE_STAGE_TOKENS,
  EyeStatusCode,
  ALL_EYE_STATUS_CODES,
  RequestType,
  ALL_REQUEST_TYPES,
  ContentDomain,
  ALL_CONTENT_DOMAINS,
  NextAction,
  ALL_NEXT_ACTIONS,
  UiTextToken,
  ALL_UI_TEXT_TOKENS,
  UiIconToken,
  ALL_UI_ICON_TOKENS,
  UiColorToken,
  ALL_UI_COLOR_TOKENS,
  EyeCapability,
  ALL_EYE_CAPABILITIES,
  CAPABILITY_CATEGORY_COLORS,
} from "../taxonomy";

describe("Taxonomy Enums", () => {
  describe("EyeId", () => {
    it("should include all built-in eyes", () => {
      expect(ALL_EYE_IDS).toContain(EyeId.OVERSEER);
      expect(ALL_EYE_IDS).toContain(EyeId.SHARINGAN);
      expect(ALL_EYE_IDS).toContain(EyeId.KYUUBI);
      expect(ALL_EYE_IDS).toContain(EyeId.JOGAN);
      expect(ALL_EYE_IDS).toContain(EyeId.RINNEGAN);
      expect(ALL_EYE_IDS).toContain(EyeId.MANGEKYO);
      expect(ALL_EYE_IDS).toContain(EyeId.TENSEIGAN);
      expect(ALL_EYE_IDS).toContain(EyeId.BYAKUGAN);
    });

    it("should have exactly 8 built-in eyes", () => {
      expect(ALL_EYE_IDS.length).toBe(8);
    });
  });

  describe("EyeStageToken", () => {
    it("should include guidance and validation stages", () => {
      expect(ALL_EYE_STAGE_TOKENS).toContain(EyeStageToken.GUIDANCE);
      expect(ALL_EYE_STAGE_TOKENS).toContain(EyeStageToken.VALIDATION);
    });

    it("should have exactly 2 stage tokens", () => {
      expect(ALL_EYE_STAGE_TOKENS.length).toBe(2);
    });
  });

  describe("EyeStatusCode", () => {
    it("should include required status codes", () => {
      expect(ALL_EYE_STATUS_CODES).toContain(EyeStatusCode.NEED_CLARIFICATION);
      expect(ALL_EYE_STATUS_CODES).toContain(
        EyeStatusCode.OK_NO_CLARIFICATION_NEEDED,
      );
      expect(ALL_EYE_STATUS_CODES).toContain(EyeStatusCode.OK_WITH_NOTES);
      expect(ALL_EYE_STATUS_CODES).toContain(EyeStatusCode.OK_INTENT_CONFIRMED);
      expect(ALL_EYE_STATUS_CODES).toContain(EyeStatusCode.OK_ALL_APPROVED);
      expect(ALL_EYE_STATUS_CODES).toContain(EyeStatusCode.REJECT_INCOMPLETE);
    });

    it("should have exhaustively defined status codes", () => {
      expect(ALL_EYE_STATUS_CODES.length).toBeGreaterThan(40);
    });
  });

  describe("RequestType", () => {
    it("should include all request types", () => {
      expect(ALL_REQUEST_TYPES).toContain(RequestType.NEW_TASK);
      expect(ALL_REQUEST_TYPES).toContain(RequestType.DRAFT_REVIEW);
      expect(ALL_REQUEST_TYPES).toContain(RequestType.VALIDATION_ONLY);
    });

    it("should have exactly 3 request types", () => {
      expect(ALL_REQUEST_TYPES.length).toBe(3);
    });
  });

  describe("ContentDomain", () => {
    it("should include all content domains", () => {
      expect(ALL_CONTENT_DOMAINS).toContain(ContentDomain.CODE);
      expect(ALL_CONTENT_DOMAINS).toContain(ContentDomain.TEXT);
      expect(ALL_CONTENT_DOMAINS).toContain(ContentDomain.PLAN);
      expect(ALL_CONTENT_DOMAINS).toContain(ContentDomain.MIXED);
    });

    it("should have exactly 4 content domains", () => {
      expect(ALL_CONTENT_DOMAINS.length).toBe(4);
    });
  });

  describe("NextAction", () => {
    it("should include all next action values", () => {
      expect(ALL_NEXT_ACTIONS).toContain(NextAction.PROCEED);
      expect(ALL_NEXT_ACTIONS).toContain(NextAction.AWAIT_INPUT);
      expect(ALL_NEXT_ACTIONS).toContain(NextAction.AWAIT_DRAFT);
      expect(ALL_NEXT_ACTIONS).toContain(NextAction.AWAIT_CONFIRMATION);
      expect(ALL_NEXT_ACTIONS).toContain(NextAction.COMPLETE);
    });

    it("should have exactly 5 next actions", () => {
      expect(ALL_NEXT_ACTIONS.length).toBe(5);
    });
  });

  describe("UiTextToken", () => {
    it("should include status message tokens", () => {
      expect(ALL_UI_TEXT_TOKENS).toContain(UiTextToken.LOADING);
      expect(ALL_UI_TEXT_TOKENS).toContain(UiTextToken.NO_DATA);
      expect(ALL_UI_TEXT_TOKENS).toContain(UiTextToken.ERROR);
      expect(ALL_UI_TEXT_TOKENS).toContain(UiTextToken.SUCCESS);
    });

    it("should include eye description tokens", () => {
      expect(ALL_UI_TEXT_TOKENS).toContain(UiTextToken.AMBIGUITY_DETECTION);
      expect(ALL_UI_TEXT_TOKENS).toContain(UiTextToken.CODE_REVIEW);
    });

    it("should include wow feature tokens", () => {
      expect(ALL_UI_TEXT_TOKENS).toContain(UiTextToken.EVIDENCE_LENS);
      expect(ALL_UI_TEXT_TOKENS).toContain(UiTextToken.DUEL_MODE);
    });

    it("should have a substantial number of UI text tokens", () => {
      expect(ALL_UI_TEXT_TOKENS.length).toBeGreaterThan(20);
    });
  });

  describe("UiIconToken", () => {
    it("should include common icon tokens", () => {
      expect(ALL_UI_ICON_TOKENS).toContain(UiIconToken.EYE);
      expect(ALL_UI_ICON_TOKENS).toContain(UiIconToken.SHIELD);
      expect(ALL_UI_ICON_TOKENS).toContain(UiIconToken.SEARCH);
      expect(ALL_UI_ICON_TOKENS).toContain(UiIconToken.CODE);
    });

    it("should have a substantial number of icon tokens", () => {
      expect(ALL_UI_ICON_TOKENS.length).toBeGreaterThan(15);
    });
  });

  describe("UiColorToken", () => {
    it("should include brand colors", () => {
      expect(ALL_UI_COLOR_TOKENS).toContain(UiColorToken.BRAND_PRIMARY);
      expect(ALL_UI_COLOR_TOKENS).toContain(UiColorToken.BRAND_ACCENT);
      expect(ALL_UI_COLOR_TOKENS).toContain(UiColorToken.BRAND_INK);
      expect(ALL_UI_COLOR_TOKENS).toContain(UiColorToken.BRAND_PAPER);
    });

    it("should include eye colors", () => {
      expect(ALL_UI_COLOR_TOKENS).toContain(UiColorToken.EYE_SHARINGAN);
      expect(ALL_UI_COLOR_TOKENS).toContain(UiColorToken.EYE_BYAKUGAN);
    });

    it("should include semantic colors", () => {
      expect(ALL_UI_COLOR_TOKENS).toContain(UiColorToken.SUCCESS);
      expect(ALL_UI_COLOR_TOKENS).toContain(UiColorToken.WARNING);
      expect(ALL_UI_COLOR_TOKENS).toContain(UiColorToken.ERROR);
    });

    it("should have all color categories", () => {
      expect(ALL_UI_COLOR_TOKENS.length).toBe(18);
    });
  });

  describe("EyeCapability", () => {
    it("should include required capability tags", () => {
      expect(ALL_EYE_CAPABILITIES).toContain(EyeCapability.CLARIFICATION);
      expect(ALL_EYE_CAPABILITIES).toContain(EyeCapability.CODE_REVIEW);
      expect(ALL_EYE_CAPABILITIES).toContain(EyeCapability.FINAL_APPROVAL);
      expect(ALL_EYE_CAPABILITIES).toContain(EyeCapability.ORCHESTRATION);
    });

    it("should have a substantial number of capabilities", () => {
      expect(ALL_EYE_CAPABILITIES.length).toBeGreaterThan(15);
    });
  });

  describe("CAPABILITY_CATEGORY_COLORS", () => {
    it("should have color definitions for all categories", () => {
      const categories = Object.keys(CAPABILITY_CATEGORY_COLORS);
      expect(categories.length).toBe(6); // GUIDANCE, VALIDATION, CODE_QUALITY, PLANNING, ORCHESTRATION, SAFETY
    });

    it("should have bg, text, and border properties for each category", () => {
      Object.values(CAPABILITY_CATEGORY_COLORS).forEach((color) => {
        expect(color).toHaveProperty("bg");
        expect(color).toHaveProperty("text");
        expect(color).toHaveProperty("border");
      });
    });
  });

  describe("Enum Exhaustiveness", () => {
    it("should ensure all enums are frozen", () => {
      expect(Object.isFrozen(EyeId)).toBe(true);
      expect(Object.isFrozen(EyeStageToken)).toBe(true);
      expect(Object.isFrozen(EyeStatusCode)).toBe(true);
    });

    it("should ensure all ALL_* arrays are frozen", () => {
      expect(Object.isFrozen(ALL_EYE_IDS)).toBe(true);
      expect(Object.isFrozen(ALL_EYE_STAGE_TOKENS)).toBe(true);
      expect(Object.isFrozen(ALL_EYE_STATUS_CODES)).toBe(true);
    });
  });
});
