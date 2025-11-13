import { nanoid } from "nanoid";

/**
 * REPAIR_PLAN A7.2: Predefined Template Library
 *
 * 5 built-in pipeline templates for common use cases
 * Seeded into database on first run
 */

export const PREDEFINED_TEMPLATES = [
  {
    id: nanoid(),
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
    id: nanoid(),
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
    id: nanoid(),
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
    id: nanoid(),
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
    id: nanoid(),
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
