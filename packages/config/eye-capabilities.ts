/**
 * Eye Capabilities - SSOT for Phase 4
 *
 * Defines what each eye can do (capabilities), not what they will do (pipeline).
 * Per R01: Single source of truth for eye capabilities
 * Per R07: Strict typing, no 'any'
 * Per R13: All capability tags centralized here
 */

export interface EyeCapability {
  readonly tags: readonly string[];
  readonly description: string;
  readonly scenarios: readonly string[];
  readonly icon: string;
  readonly color: string;
}

/**
 * Eye capability definitions
 * Used by CapabilityMatrix to show what each eye can do
 */
export const EYE_CAPABILITIES = {
  overseer: {
    tags: ["routing", "analysis", "decision-making", "orchestration"],
    description: "Analyzes requests and dynamically routes to appropriate eyes",
    scenarios: [
      "All requests - determines optimal eye sequence",
      "Capability matching",
      "Dynamic routing decisions",
    ],
    icon: "🧿",
    color: "purple",
  },
  sharingan: {
    tags: [
      "ambiguity-detection",
      "clarification",
      "questions",
      "disambiguation",
    ],
    description: "Detects ambiguities and asks clarifying questions",
    scenarios: [
      "Vague requests",
      "Missing context",
      "Unclear requirements",
      "Scope disambiguation",
    ],
    icon: "🔍",
    color: "red",
  },
  kyuubi: {
    tags: ["structuring", "guidance", "framework", "content-planning"],
    description: "Provides structural guidance and content frameworks",
    scenarios: [
      "Content creation",
      "Document structuring",
      "Planning templates",
      "Framework design",
    ],
    icon: "🦊",
    color: "orange",
  },
  jogan: {
    tags: [
      "intent-confirmation",
      "approval",
      "scope-validation",
      "human-in-loop",
    ],
    description: "Confirms user intent before proceeding with tasks",
    scenarios: [
      "High-impact actions",
      "Scope confirmation",
      "User approval needed",
      "Intent validation",
    ],
    icon: "👁️",
    color: "blue",
  },
  rinnegan: {
    tags: ["feasibility", "validation", "planning", "resource-estimation"],
    description: "Validates feasibility and provides planning guidance",
    scenarios: [
      "Complex tasks",
      "Multi-step planning",
      "Resource validation",
      "Feasibility analysis",
    ],
    icon: "⚫",
    color: "indigo",
  },
  mangekyo: {
    tags: ["code-review", "security", "best-practices", "quality-assurance"],
    description: "Reviews code for quality, security, and best practices",
    scenarios: [
      "Code review",
      "Security audit",
      "Technical validation",
      "Best practices check",
    ],
    icon: "🔥",
    color: "pink",
  },
  tenseigan: {
    tags: ["quality-check", "completeness", "refinement", "polish"],
    description: "Validates quality and completeness of outputs",
    scenarios: [
      "Output validation",
      "Completeness check",
      "Quality assurance",
      "Refinement",
    ],
    icon: "🌙",
    color: "cyan",
  },
  byakugan: {
    tags: ["final-review", "delivery", "output-formatting", "presentation"],
    description: "Final review and output preparation for delivery",
    scenarios: [
      "Final validation",
      "Output formatting",
      "Delivery preparation",
      "Presentation polish",
    ],
    icon: "👀",
    color: "green",
  },
} as const satisfies Record<string, EyeCapability>;

export type EyeCapabilityName = keyof typeof EYE_CAPABILITIES;

/**
 * Get capability tags for a specific eye
 */
export function getEyeCapabilityTags(
  eyeName: EyeCapabilityName,
): readonly string[] {
  return EYE_CAPABILITIES[eyeName].tags;
}

/**
 * Get all capability tags across all eyes (for filtering)
 */
export function getAllCapabilityTags(): readonly string[] {
  const allTags = new Set<string>();
  for (const eye of Object.values(EYE_CAPABILITIES)) {
    for (const tag of eye.tags) {
      allTags.add(tag);
    }
  }
  return Array.from(allTags).sort();
}

/**
 * Find eyes that have a specific capability tag
 */
export function getEyesByCapability(
  capabilityTag: string,
): readonly EyeCapabilityName[] {
  const eyeNames: EyeCapabilityName[] = [];
  for (const [eyeName, capabilities] of Object.entries(EYE_CAPABILITIES)) {
    if ((capabilities.tags as readonly string[]).includes(capabilityTag)) {
      eyeNames.push(eyeName as EyeCapabilityName);
    }
  }
  return eyeNames;
}

/**
 * Routing mode descriptions for mode selector
 */
export const ROUTING_MODE_INFO = {
  fully_dynamic: {
    label: "Fully Dynamic",
    icon: "🧠",
    description: "Overseer analyzes and routes automatically",
    badge: "Recommended",
    badgeColor: "green",
  },
  constrained: {
    label: "Constrained",
    icon: "🛡️",
    description: "Overseer routes within policy constraints",
    badge: "With Policies",
    badgeColor: "blue",
  },
  fixed: {
    label: "Fixed Template",
    icon: "📋",
    description: "Use predefined eye sequence",
    badge: "Consistent",
    badgeColor: "purple",
  },
} as const;

export type RoutingModeName = keyof typeof ROUTING_MODE_INFO;
