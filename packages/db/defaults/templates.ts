/**
 * REPAIR_PLAN A7.2: Predefined Template Library
 *
 * 5 built-in pipeline templates for common use cases
 * Seeded into database on first run
 *
 * CRITICAL FIX: Use deterministic IDs instead of nanoid() at module load time
 * - Prevents ID regeneration on every module load
 * - Ensures stable references across restarts
 * - Fixes seed idempotency issues
 */

export const PREDEFINED_TEMPLATES = [
  {
    id: "template-fast-code-review",
    name: "Fast Code Review",
    description: "Quick review for small changes",
    eyes: JSON.stringify(["sharingan", "mangekyo"]),
    strict: false,
    autoTriggerPattern: null,
    createdBy: "system",
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
  },
  {
    id: "template-security-audit",
    name: "Security Audit",
    description: "Comprehensive security analysis",
    eyes: JSON.stringify(["sharingan", "rinnegan", "tenseigan", "byakugan"]),
    strict: true,
    autoTriggerPattern: null,
    createdBy: "system",
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
  },
  {
    id: "template-research-article",
    name: "Research Article",
    description: "Deep research with fact-checking",
    eyes: JSON.stringify(["kyuubi", "tenseigan", "byakugan"]),
    strict: true,
    autoTriggerPattern: null,
    createdBy: "system",
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
  },
  {
    id: "template-quick-question",
    name: "Quick Question",
    description: "Simple clarification",
    eyes: JSON.stringify(["sharingan"]),
    strict: false,
    autoTriggerPattern: null,
    createdBy: "system",
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
  },
  {
    id: "template-complete-pipeline",
    name: "Complete Pipeline",
    description: "All eyes, maximum thoroughness",
    eyes: JSON.stringify([
      "sharingan",
      "kyuubi",
      "rinnegan",
      "mangekyo",
      "tenseigan",
      "byakugan",
    ]),
    strict: true,
    autoTriggerPattern: null,
    createdBy: "system",
    isPublic: true,
    usageCount: 0,
    createdAt: new Date(),
  },
];
