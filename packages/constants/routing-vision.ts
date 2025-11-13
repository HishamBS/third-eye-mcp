/**
 * Routing Capability Requirements
 *
 * Defines capability matrices for dynamic routing based on request type
 * and content domain. Used by capability plan resolver to generate
 * appropriate eye sequences.
 */

import { EyeCapability, RequestType, ContentDomain } from "./taxonomy";

const freeze = <T>(value: T): Readonly<T> => Object.freeze(value);

export interface CapabilityRequirement {
  readonly allOf?: readonly EyeCapability[];
  readonly anyOf?: readonly EyeCapability[];
  readonly optional?: boolean;
}

interface RoutingMatrix {
  readonly guidance: readonly CapabilityRequirement[];
  readonly validation: readonly CapabilityRequirement[];
}

type RoutingMatrixMap = Readonly<Record<ContentDomain, RoutingMatrix>>;

type RoutingRequirementsMap = Readonly<Record<RequestType, RoutingMatrixMap>>;

export const ROUTING_CAPABILITY_REQUIREMENTS: RoutingRequirementsMap =
  Object.freeze({
    [RequestType.NEW_TASK]: Object.freeze({
      [ContentDomain.TEXT]: {
        guidance: Object.freeze([
          Object.freeze({
            allOf: Object.freeze([
              EyeCapability.CLARIFICATION,
              EyeCapability.AMBIGUITY_DETECTION,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.PROMPT_STRUCTURING]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
          }),
        ]),
        validation: Object.freeze([
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.FACT_VALIDATION,
              EyeCapability.EVIDENCE_GROUNDING,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
      [ContentDomain.CODE]: {
        guidance: Object.freeze([
          Object.freeze({
            allOf: Object.freeze([
              EyeCapability.CLARIFICATION,
              EyeCapability.AMBIGUITY_DETECTION,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.PROMPT_STRUCTURING]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.STRATEGIC_PLANNING]),
          }),
        ]),
        validation: Object.freeze([
          Object.freeze({
            allOf: Object.freeze([EyeCapability.CODE_REVIEW]),
          }),
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.QUALITY_ASSURANCE,
              EyeCapability.OUTCOME_SYNTHESIS,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
      [ContentDomain.PLAN]: {
        guidance: Object.freeze([
          Object.freeze({
            allOf: Object.freeze([
              EyeCapability.CLARIFICATION,
              EyeCapability.AMBIGUITY_DETECTION,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.STRATEGIC_PLANNING]),
          }),
        ]),
        validation: Object.freeze([
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.QUALITY_ASSURANCE,
              EyeCapability.OUTCOME_SYNTHESIS,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
      [ContentDomain.MIXED]: {
        guidance: Object.freeze([
          Object.freeze({
            allOf: Object.freeze([
              EyeCapability.CLARIFICATION,
              EyeCapability.AMBIGUITY_DETECTION,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.PROMPT_STRUCTURING]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
          }),
        ]),
        validation: Object.freeze([
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.CODE_REVIEW,
              EyeCapability.FACT_VALIDATION,
              EyeCapability.EVIDENCE_GROUNDING,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
    }),
    [RequestType.DRAFT_REVIEW]: Object.freeze({
      [ContentDomain.TEXT]: {
        guidance: Object.freeze([]),
        validation: Object.freeze([
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.FACT_VALIDATION,
              EyeCapability.EVIDENCE_GROUNDING,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
      [ContentDomain.CODE]: {
        guidance: Object.freeze([]),
        validation: Object.freeze([
          Object.freeze({
            allOf: Object.freeze([EyeCapability.CODE_REVIEW]),
          }),
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.QUALITY_ASSURANCE,
              EyeCapability.OUTCOME_SYNTHESIS,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
        ]),
      },
      [ContentDomain.PLAN]: {
        guidance: Object.freeze([]),
        validation: Object.freeze([
          Object.freeze({
            allOf: Object.freeze([
              EyeCapability.STRATEGIC_PLANNING,
              EyeCapability.QUALITY_ASSURANCE,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
      [ContentDomain.MIXED]: {
        guidance: Object.freeze([]),
        validation: Object.freeze([
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.CODE_REVIEW,
              EyeCapability.FACT_VALIDATION,
              EyeCapability.EVIDENCE_GROUNDING,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
    }),
    [RequestType.VALIDATION_ONLY]: Object.freeze({
      [ContentDomain.TEXT]: {
        guidance: Object.freeze([]),
        validation: Object.freeze([
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.FACT_VALIDATION,
              EyeCapability.EVIDENCE_GROUNDING,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
      [ContentDomain.CODE]: {
        guidance: Object.freeze([]),
        validation: Object.freeze([
          Object.freeze({
            allOf: Object.freeze([EyeCapability.CODE_REVIEW]),
          }),
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.QUALITY_ASSURANCE,
              EyeCapability.OUTCOME_SYNTHESIS,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
        ]),
      },
      [ContentDomain.PLAN]: {
        guidance: Object.freeze([]),
        validation: Object.freeze([
          Object.freeze({
            allOf: Object.freeze([
              EyeCapability.STRATEGIC_PLANNING,
              EyeCapability.QUALITY_ASSURANCE,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
      [ContentDomain.MIXED]: {
        guidance: Object.freeze([]),
        validation: Object.freeze([
          Object.freeze({
            anyOf: Object.freeze([
              EyeCapability.CODE_REVIEW,
              EyeCapability.FACT_VALIDATION,
              EyeCapability.EVIDENCE_GROUNDING,
            ]),
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.INTENT_VALIDATION]),
            optional: true,
          }),
          Object.freeze({
            allOf: Object.freeze([EyeCapability.FINAL_APPROVAL]),
          }),
        ]),
      },
    }),
  });
