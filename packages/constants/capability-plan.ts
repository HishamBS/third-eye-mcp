/**
 * Capability Plan Resolver
 *
 * Generates capability-driven routes based on the constitutional requirement
 * matrix (`ROUTING_CAPABILITY_REQUIREMENTS`). The resolver prefers built-in Eyes
 * but can dynamically substitute custom Eyes when they expose the required
 * capabilities. This keeps routing aligned with THIRD_EYE_VISION.md without
 * hardcoding specific Eye sequences.
 */

import {
  EyeId,
  RequestType,
  ContentDomain,
  EyeCapability,
  BUILTIN_EYE_CAPABILITIES,
  EyeStageToken,
  EYE_CAPABILITY_LABELS,
} from "./taxonomy";
import { ROUTING_CAPABILITY_REQUIREMENTS } from "./routing-vision";

export type CapabilityStage = EyeStageToken;
export type CapabilityPlanEyeId = string;

export interface CapabilityAssignmentConfig {
  readonly order: number;
  readonly stage: CapabilityStage;
  readonly eyeId: CapabilityPlanEyeId;
  readonly capabilities: readonly EyeCapability[];
  readonly capabilityLabels: readonly string[];
}

export interface CapabilityPlanConfig {
  readonly route: readonly CapabilityPlanEyeId[];
  readonly assignments: readonly CapabilityAssignmentConfig[];
}

export interface CapabilityPlanCandidateEye {
  readonly id: string;
  readonly capabilities: readonly EyeCapability[];
}

export interface CapabilityPlanOptions {
  readonly availableEyes?: ReadonlyArray<CapabilityPlanCandidateEye>;
  readonly allowEyeReuse?: boolean;
}

export class CapabilityPlanResolutionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CapabilityPlanResolutionError";
  }
}

const BUILTIN_EYE_IDS = new Set(Object.values(EyeId));

const toLowerId = (value: string): string => value.trim().toLowerCase();

const dedupeCapabilities = (
  capabilities: readonly EyeCapability[],
): EyeCapability[] => {
  const seen = new Set<EyeCapability>();
  const result: EyeCapability[] = [];
  for (const capability of capabilities) {
    if (!seen.has(capability)) {
      seen.add(capability);
      result.push(capability);
    }
  }
  return result;
};

interface InternalCandidate {
  readonly id: string;
  readonly idLower: string;
  readonly capabilities: EyeCapability[];
  readonly builtin: boolean;
}

const toCandidate = (
  id: string,
  capabilities: readonly EyeCapability[],
): InternalCandidate => {
  const trimmedId = id.trim();
  return {
    id: trimmedId,
    idLower: toLowerId(trimmedId),
    capabilities: dedupeCapabilities(capabilities),
    builtin: BUILTIN_EYE_IDS.has(trimmedId as EyeId),
  };
};

const buildCandidateList = (
  options: CapabilityPlanOptions = {},
): ReadonlyArray<InternalCandidate> => {
  const map = new Map<string, InternalCandidate>();

  const addCandidate = (
    eyeId: string,
    capabilities: readonly EyeCapability[],
  ): void => {
    const candidate = toCandidate(eyeId, capabilities);
    map.set(candidate.idLower, candidate);
  };

  if (options.availableEyes) {
    for (const eye of options.availableEyes) {
      addCandidate(eye.id, eye.capabilities);
    }
  }

  for (const [eyeId, capabilities] of Object.entries(
    BUILTIN_EYE_CAPABILITIES,
  )) {
    if (!map.has(toLowerId(eyeId))) {
      addCandidate(eyeId, capabilities);
    }
  }

  return Array.from(map.values()).sort((a, b) =>
    a.idLower.localeCompare(b.idLower),
  );
};

interface ExpandedRequirement {
  readonly stage: CapabilityStage;
  readonly allOf: readonly EyeCapability[];
  readonly anyOf: readonly EyeCapability[];
  readonly allowReuse: boolean;
}

const expandRequirementList = (
  requirements: ReadonlyArray<{
    allOf?: readonly EyeCapability[];
    anyOf?: readonly EyeCapability[];
    optional?: boolean;
  }>,
  stage: CapabilityStage,
): readonly ExpandedRequirement[] =>
  requirements.map(
    (requirement): ExpandedRequirement => ({
      stage,
      allOf: requirement.allOf ?? [],
      anyOf: requirement.anyOf ?? [],
      allowReuse: requirement.optional ?? false,
    }),
  );

const getStageDefinitions = (
  requestType: RequestType,
  contentDomain: ContentDomain,
): readonly ExpandedRequirement[] => {
  const requirementSet =
    ROUTING_CAPABILITY_REQUIREMENTS[requestType]?.[contentDomain];
  const effectiveSet =
    requirementSet ??
    ROUTING_CAPABILITY_REQUIREMENTS[RequestType.NEW_TASK][ContentDomain.MIXED];

  const stages = [
    ...expandRequirementList(effectiveSet.guidance, EyeStageToken.GUIDANCE),
    ...expandRequirementList(effectiveSet.validation, EyeStageToken.VALIDATION),
  ];

  if (stages.length > 0) {
    return stages;
  }

  const fallback =
    ROUTING_CAPABILITY_REQUIREMENTS[RequestType.NEW_TASK][ContentDomain.MIXED];
  return [
    ...expandRequirementList(fallback.guidance, EyeStageToken.GUIDANCE),
    ...expandRequirementList(fallback.validation, EyeStageToken.VALIDATION),
  ];
};

const hasAllCapabilities = (
  candidate: InternalCandidate,
  required: readonly EyeCapability[],
): boolean =>
  required.every((capability) => candidate.capabilities.includes(capability));

const countMatches = (
  candidate: InternalCandidate,
  pool: readonly EyeCapability[],
): number =>
  pool.reduce(
    (count, capability) =>
      candidate.capabilities.includes(capability) ? count + 1 : count,
    0,
  );

const selectCandidateForStage = (
  stage: ExpandedRequirement,
  candidates: ReadonlyArray<InternalCandidate>,
): InternalCandidate => {
  const { allOf, anyOf } = stage;

  const matchesRequired = candidates.filter((candidate) =>
    hasAllCapabilities(candidate, allOf),
  );

  const matchesRequiredAndAny =
    anyOf.length > 0
      ? matchesRequired.filter((candidate) =>
          anyOf.some((capability) =>
            candidate.capabilities.includes(capability),
          ),
        )
      : matchesRequired;

  let ranked =
    matchesRequiredAndAny.length > 0 ? matchesRequiredAndAny : matchesRequired;

  if (ranked.length === 0 && allOf.length === 0 && anyOf.length > 0) {
    ranked = candidates.filter((candidate) =>
      anyOf.some((capability) => candidate.capabilities.includes(capability)),
    );
  }

  if (ranked.length === 0) {
    throw new CapabilityPlanResolutionError(
      `No available Eye satisfies capability requirements: allOf=[${allOf.join(
        ", ",
      )}], anyOf=[${anyOf.join(", ")}]`,
    );
  }

  ranked.sort((a, b) => {
    if (a.builtin !== b.builtin) {
      return a.builtin ? -1 : 1;
    }

    const requiredDiff = countMatches(b, allOf) - countMatches(a, allOf);
    if (requiredDiff !== 0) return requiredDiff;

    const anyDiff = countMatches(b, anyOf) - countMatches(a, anyOf);
    if (anyDiff !== 0) return anyDiff;

    const capabilityDiff = b.capabilities.length - a.capabilities.length;
    if (capabilityDiff !== 0) return capabilityDiff;

    return a.id.localeCompare(b.id);
  });

  return ranked[0];
};

const buildAssignmentCapabilities = (
  candidate: InternalCandidate,
  stage: ExpandedRequirement,
): readonly EyeCapability[] => {
  const ordered: EyeCapability[] = [];

  const push = (capability: EyeCapability): void => {
    if (!ordered.includes(capability)) {
      ordered.push(capability);
    }
  };

  for (const capability of stage.allOf) {
    push(capability);
  }

  for (const capability of stage.anyOf) {
    if (candidate.capabilities.includes(capability)) {
      push(capability);
    }
  }

  if (ordered.length === 0 && candidate.capabilities.length > 0) {
    ordered.push(candidate.capabilities[0]);
  }

  return ordered;
};

export function resolveCapabilityPlan(
  requestType: RequestType | null | undefined,
  contentDomain: ContentDomain | null | undefined,
  options: CapabilityPlanOptions = {},
): CapabilityPlanConfig {
  const normalizedType = requestType ?? RequestType.NEW_TASK;
  const normalizedDomain = contentDomain ?? ContentDomain.MIXED;

  const stages = getStageDefinitions(normalizedType, normalizedDomain);
  const candidates = buildCandidateList(options);

  if (candidates.length === 0) {
    throw new CapabilityPlanResolutionError(
      "No Eyes available to satisfy capability requirements.",
    );
  }

  const allowReuseGlobal = options.allowEyeReuse ?? false;
  const used = new Set<string>();
  const assignments: CapabilityAssignmentConfig[] = [];

  for (const stage of stages) {
    const allowReuse = stage.allowReuse || allowReuseGlobal;

    const pool = allowReuse
      ? candidates
      : candidates.filter((candidate) => !used.has(candidate.idLower));

    if (pool.length === 0) {
      throw new CapabilityPlanResolutionError(
        "Exhausted available Eyes before satisfying all capability stages.",
      );
    }

    const selected = selectCandidateForStage(stage, pool);

    if (!allowReuse) {
      used.add(selected.idLower);
    }

    const stageCapabilities = buildAssignmentCapabilities(selected, stage);

    assignments.push({
      order: assignments.length,
      stage: stage.stage,
      eyeId: selected.id,
      capabilities: stageCapabilities,
      capabilityLabels: stageCapabilities.map(
        (capability) => EYE_CAPABILITY_LABELS[capability] ?? capability,
      ),
    });
  }

  const route = assignments.map((assignment) => assignment.eyeId);

  return {
    route,
    assignments,
  };
}
