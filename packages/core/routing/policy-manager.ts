/**
 * Policy Manager - Phase 3
 *
 * High-level utility for managing routing policies
 * Provides CRUD operations and policy testing
 *
 * Per R07: Strict typing, no 'any'
 * Per R13: Centralized policy management SSOT
 */

import { randomUUID } from "node:crypto";
import type { Database } from "bun:sqlite";
import type { RoutingPolicy, Constraint } from "./routing-modes";
import { PolicyValidator } from "./policy-validator";

/**
 * Policy Manager for CRUD and validation
 */
export class PolicyManager {
  private readonly validator: PolicyValidator;

  constructor(private readonly db: Database) {
    this.validator = new PolicyValidator();
  }

  /**
   * Create new routing policy
   */
  async createPolicy(params: {
    name: string;
    description?: string;
    mandatoryEyes: readonly string[];
    forbiddenEyes?: readonly string[];
    minValidationEyes?: number;
    securityRequired?: boolean;
    alwaysConfirmIntent?: boolean;
    customConstraints?: readonly Constraint[];
  }): Promise<RoutingPolicy> {
    const id = randomUUID();
    const createdAt = Date.now();

    const policy: RoutingPolicy = {
      id,
      name: params.name,
      description: params.description,
      mandatoryEyes: params.mandatoryEyes,
      forbiddenEyes: params.forbiddenEyes,
      minValidationEyes: params.minValidationEyes,
      securityRequired: params.securityRequired ?? false,
      alwaysConfirmIntent: params.alwaysConfirmIntent ?? false,
      customConstraints: params.customConstraints,
      isActive: true,
      createdAt,
    };

    // Validate policy configuration before saving
    const validationResult = this.validator.validatePolicy(policy);
    if (!validationResult.valid) {
      throw new Error(
        `Invalid policy configuration: ${validationResult.errors.join(", ")}`,
      );
    }

    this.db
      .prepare(
        `INSERT INTO routing_policies (id, name, description, mandatory_eyes, forbidden_eyes, min_validation_eyes, security_required, always_confirm_intent, custom_constraints, is_active, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        policy.id,
        policy.name,
        policy.description ?? null,
        JSON.stringify(policy.mandatoryEyes),
        policy.forbiddenEyes ? JSON.stringify(policy.forbiddenEyes) : null,
        policy.minValidationEyes ?? null,
        policy.securityRequired ? 1 : 0,
        policy.alwaysConfirmIntent ? 1 : 0,
        policy.customConstraints
          ? JSON.stringify(policy.customConstraints)
          : null,
        policy.isActive ? 1 : 0,
        policy.createdAt,
      );

    return policy;
  }

  /**
   * Get policy by ID
   */
  getPolicy(policyId: string): RoutingPolicy | null {
    const row = this.db
      .prepare(
        `SELECT id, name, description, mandatory_eyes, forbidden_eyes, min_validation_eyes, security_required, always_confirm_intent, custom_constraints, is_active, created_at
         FROM routing_policies
         WHERE id = ?`,
      )
      .get(policyId) as
      | {
          id: string;
          name: string;
          description: string | null;
          mandatory_eyes: string;
          forbidden_eyes: string | null;
          min_validation_eyes: number | null;
          security_required: number;
          always_confirm_intent: number;
          custom_constraints: string | null;
          is_active: number;
          created_at: number;
        }
      | undefined;

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      mandatoryEyes: JSON.parse(row.mandatory_eyes) as string[],
      forbiddenEyes: row.forbidden_eyes
        ? (JSON.parse(row.forbidden_eyes) as string[])
        : undefined,
      minValidationEyes: row.min_validation_eyes ?? undefined,
      securityRequired: row.security_required === 1,
      alwaysConfirmIntent: row.always_confirm_intent === 1,
      customConstraints: row.custom_constraints
        ? (JSON.parse(row.custom_constraints) as Constraint[])
        : undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    };
  }

  /**
   * List all policies
   */
  listPolicies(filters?: { isActive?: boolean }): readonly RoutingPolicy[] {
    let query = `SELECT id, name, description, mandatory_eyes, forbidden_eyes, min_validation_eyes, security_required, always_confirm_intent, custom_constraints, is_active, created_at
                 FROM routing_policies WHERE 1=1`;
    const params: (string | number | boolean | null)[] = [];

    if (filters?.isActive !== undefined) {
      query += ` AND is_active = ?`;
      params.push(filters.isActive ? 1 : 0);
    }

    query += ` ORDER BY created_at DESC`;

    const rows = this.db.prepare(query).all(...params) as Array<{
      id: string;
      name: string;
      description: string | null;
      mandatory_eyes: string;
      forbidden_eyes: string | null;
      min_validation_eyes: number | null;
      security_required: number;
      always_confirm_intent: number;
      custom_constraints: string | null;
      is_active: number;
      created_at: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      mandatoryEyes: JSON.parse(row.mandatory_eyes) as string[],
      forbiddenEyes: row.forbidden_eyes
        ? (JSON.parse(row.forbidden_eyes) as string[])
        : undefined,
      minValidationEyes: row.min_validation_eyes ?? undefined,
      securityRequired: row.security_required === 1,
      alwaysConfirmIntent: row.always_confirm_intent === 1,
      customConstraints: row.custom_constraints
        ? (JSON.parse(row.custom_constraints) as Constraint[])
        : undefined,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
    }));
  }

  /**
   * Update policy
   */
  async updatePolicy(
    policyId: string,
    updates: Partial<{
      name: string;
      description: string;
      mandatoryEyes: readonly string[];
      forbiddenEyes: readonly string[];
      minValidationEyes: number;
      securityRequired: boolean;
      alwaysConfirmIntent: boolean;
      customConstraints: readonly Constraint[];
      isActive: boolean;
    }>,
  ): Promise<RoutingPolicy> {
    const existing = this.getPolicy(policyId);
    if (!existing) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const updated: RoutingPolicy = {
      ...existing,
      ...updates,
    };

    // Validate updated policy
    const validationResult = this.validator.validatePolicy(updated);
    if (!validationResult.valid) {
      throw new Error(
        `Invalid policy update: ${validationResult.errors.join(", ")}`,
      );
    }

    this.db
      .prepare(
        `UPDATE routing_policies
         SET name = ?, description = ?, mandatory_eyes = ?, forbidden_eyes = ?, min_validation_eyes = ?, security_required = ?, always_confirm_intent = ?, custom_constraints = ?, is_active = ?
         WHERE id = ?`,
      )
      .run(
        updated.name,
        updated.description ?? null,
        JSON.stringify(updated.mandatoryEyes),
        updated.forbiddenEyes ? JSON.stringify(updated.forbiddenEyes) : null,
        updated.minValidationEyes ?? null,
        updated.securityRequired ? 1 : 0,
        updated.alwaysConfirmIntent ? 1 : 0,
        updated.customConstraints
          ? JSON.stringify(updated.customConstraints)
          : null,
        updated.isActive ? 1 : 0,
        policyId,
      );

    return updated;
  }

  /**
   * Delete policy
   */
  deletePolicy(policyId: string): boolean {
    const result = this.db
      .prepare(`DELETE FROM routing_policies WHERE id = ?`)
      .run(policyId);

    return result.changes > 0;
  }

  /**
   * Test policy against eye sequence
   * Useful for UI testing before saving
   */
  testPolicy(
    policy: RoutingPolicy,
    eyeSequence: readonly string[],
  ): {
    readonly valid: boolean;
    readonly errors: readonly string[];
    readonly warnings: readonly string[];
  } {
    return this.validator.validateSequence(eyeSequence, policy);
  }

  /**
   * Deactivate policy
   */
  async deactivatePolicy(policyId: string): Promise<boolean> {
    const result = this.db
      .prepare(`UPDATE routing_policies SET is_active = 0 WHERE id = ?`)
      .run(policyId);

    return result.changes > 0;
  }

  /**
   * Activate policy
   */
  async activatePolicy(policyId: string): Promise<boolean> {
    const result = this.db
      .prepare(`UPDATE routing_policies SET is_active = 1 WHERE id = ?`)
      .run(policyId);

    return result.changes > 0;
  }
}
