/**
 * Policy Validator - Phase 1-A2
 *
 * Validates routing decisions against user-defined policies
 * Ensures Overseer respects constraints in Constrained Dynamic mode
 *
 * Per R07: Strict typing, no 'any'
 */

import type { RoutingPolicy, PolicyValidationResult } from "./routing-modes";

/**
 * Validates eye sequence against routing policy
 */
export class PolicyValidator {
  /**
   * Validate that proposed eye sequence complies with policy
   */
  validateSequence(
    proposedEyes: readonly string[],
    policy: RoutingPolicy,
  ): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate mandatory eyes are included
    for (const mandatoryEye of policy.mandatoryEyes) {
      if (!proposedEyes.includes(mandatoryEye)) {
        errors.push(`Mandatory eye missing: ${mandatoryEye}`);
      }
    }

    // Validate forbidden eyes are not included
    if (policy.forbiddenEyes) {
      for (const forbiddenEye of policy.forbiddenEyes) {
        if (proposedEyes.includes(forbiddenEye)) {
          errors.push(`Forbidden eye included: ${forbiddenEye}`);
        }
      }
    }

    // Validate minimum validation eyes
    if (policy.minValidationEyes !== undefined) {
      const validationEyes = this.countValidationEyes(proposedEyes);
      if (validationEyes < policy.minValidationEyes) {
        errors.push(
          `Insufficient validation eyes: ${validationEyes} < ${policy.minValidationEyes}`,
        );
      }
    }

    // Validate security requirement
    if (policy.securityRequired === true) {
      const hasSecurityEye = proposedEyes.some(
        (eye) => eye.toLowerCase().includes("security") || eye === "mangekyo",
      );
      if (!hasSecurityEye) {
        errors.push(
          "Security validation required but no security eye included",
        );
      }
    }

    // Validate intent confirmation requirement
    if (policy.alwaysConfirmIntent === true) {
      if (!proposedEyes.includes("jogan")) {
        errors.push("Intent confirmation required but Jōgan not included");
      }
    }

    // Validate custom constraints
    if (policy.customConstraints) {
      for (const constraint of policy.customConstraints) {
        const constraintResult = this.validateConstraint(
          proposedEyes,
          constraint,
        );
        if (!constraintResult.valid) {
          errors.push(...constraintResult.errors);
        }
        warnings.push(...constraintResult.warnings);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Count validation eyes in sequence
   * Validation eyes: mangekyo, tenseigan, byakugan, rinnegan
   */
  private countValidationEyes(eyes: readonly string[]): number {
    const validationEyes = ["mangekyo", "tenseigan", "byakugan", "rinnegan"];
    return eyes.filter((eye) => validationEyes.includes(eye.toLowerCase()))
      .length;
  }

  /**
   * Validate custom constraint
   */
  private validateConstraint(
    eyes: readonly string[],
    constraint: {
      readonly type: string;
      readonly value: unknown;
      readonly reason: string;
    },
  ): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    switch (constraint.type) {
      case "must_include":
        if (
          typeof constraint.value === "string" &&
          !eyes.includes(constraint.value)
        ) {
          errors.push(`Constraint violation: ${constraint.reason}`);
        }
        break;

      case "must_exclude":
        if (
          typeof constraint.value === "string" &&
          eyes.includes(constraint.value)
        ) {
          errors.push(`Constraint violation: ${constraint.reason}`);
        }
        break;

      case "max_eyes":
        if (
          typeof constraint.value === "number" &&
          eyes.length > constraint.value
        ) {
          errors.push(
            `Too many eyes: ${eyes.length} > ${constraint.value}. ${constraint.reason}`,
          );
        }
        break;

      case "sequence_order":
        if (Array.isArray(constraint.value)) {
          const result = this.validateSequenceOrder(
            eyes,
            constraint.value as string[],
          );
          if (!result.valid) {
            errors.push(`Sequence order violation: ${constraint.reason}`);
          }
        }
        break;

      default:
        warnings.push(`Unknown constraint type: ${constraint.type}`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate that eyes appear in specified order (not necessarily consecutive)
   */
  private validateSequenceOrder(
    actualEyes: readonly string[],
    requiredOrder: readonly string[],
  ): PolicyValidationResult {
    let lastIndex = -1;

    for (const requiredEye of requiredOrder) {
      const index = actualEyes.indexOf(requiredEye);
      if (index === -1) {
        return {
          valid: false,
          errors: [`Required eye ${requiredEye} not found in sequence`],
          warnings: [],
        };
      }

      if (index <= lastIndex) {
        return {
          valid: false,
          errors: [
            `Eye ${requiredEye} appears before previous required eye in sequence`,
          ],
          warnings: [],
        };
      }

      lastIndex = index;
    }

    return {
      valid: true,
      errors: [],
      warnings: [],
    };
  }

  /**
   * Validate policy configuration itself
   */
  validatePolicy(policy: RoutingPolicy): PolicyValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check for conflicts between mandatory and forbidden
    if (policy.forbiddenEyes) {
      for (const mandatoryEye of policy.mandatoryEyes) {
        if (policy.forbiddenEyes.includes(mandatoryEye)) {
          errors.push(`Eye ${mandatoryEye} is both mandatory and forbidden`);
        }
      }
    }

    // Validate minValidationEyes is reasonable
    if (policy.minValidationEyes !== undefined) {
      if (policy.minValidationEyes < 0) {
        errors.push("minValidationEyes cannot be negative");
      }
      if (policy.minValidationEyes > 10) {
        warnings.push("minValidationEyes > 10 may be excessive");
      }
    }

    // Validate custom constraints
    if (policy.customConstraints) {
      for (const constraint of policy.customConstraints) {
        if (!constraint.type || !constraint.reason) {
          errors.push("Custom constraints must have type and reason");
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
