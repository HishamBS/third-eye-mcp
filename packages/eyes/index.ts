// Re-export everything from src/index.ts (which has the registry and getEye function)
export * from "./src/index";

// Legacy exports for backwards compatibility
export { clarify } from "./sharingan";
export { confirmIntent } from "./jogan";
export { rewritePrompt } from "./helper";
export { validateClaims } from "./tenseigan";
export { consistencyCheck } from "./byakugan";
export { navigator } from "./overseer";
export { planRequirements } from "./rinnegan/requirements";
export { planReview } from "./rinnegan/review";
export { finalApproval } from "./rinnegan/approval";
export { reviewScaffold } from "./mangekyo/scaffold";
export { reviewImpl } from "./mangekyo/impl";
export { reviewTests } from "./mangekyo/tests";
export { reviewDocs } from "./mangekyo/docs";

export type { BaseEnvelope, BaseEnvelope as EyeResponse } from "./src/schemas/base";
export { isApproved, isRejected, needsInput } from "./src/schemas/base";
export type { SharinganRequest } from "./sharingan";
export type { JoganRequest } from "./jogan";
export type { HelperRequest } from "./helper";
export type { TenseiganRequest, CitationEntry } from "./tenseigan";
export type { ByakuganRequest } from "./byakugan";
export type { OverseerRequest } from "./overseer";
export type { PlanRequirementsRequest } from "./rinnegan/requirements";
export type { PlanReviewRequest } from "./rinnegan/review";
export type { FinalApprovalRequest } from "./rinnegan/approval";
export type { ReviewScaffoldRequest } from "./mangekyo/scaffold";
export type { ReviewImplRequest } from "./mangekyo/impl";
export type { ReviewTestsRequest } from "./mangekyo/tests";
export type { ReviewDocsRequest } from "./mangekyo/docs";

export {
  MarkdownBuilder,
  type MarkdownHeading,
  type MarkdownListSymbol,
  type MarkdownAlignment,
  type MarkdownTableOptions,
} from "./utils/markdown-builder";
