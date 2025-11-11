/**
 * Template Executor - Phase 1-A2
 *
 * Executes fixed pipeline templates without Overseer routing
 * For Fixed Template mode where user defines exact eye sequence
 *
 * Per R07: Strict typing, no 'any'
 */

import type { PipelineTemplate } from './routing-modes';
import type { Database } from 'better-sqlite3';

/**
 * Template execution result
 */
export interface TemplateExecutionPlan {
  readonly templateId: string;
  readonly templateName: string;
  readonly eyeSequence: readonly string[];
  readonly strict: boolean;
  readonly reasoning: string;
}

/**
 * Executes fixed pipeline templates
 */
export class TemplateExecutor {
  constructor(private readonly db: Database) {}

  /**
   * Get template by ID
   */
  async getTemplate(templateId: string): Promise<PipelineTemplate | null> {
    const row = this.db
      .prepare(
        `SELECT id, name, description, eyes, strict, auto_trigger_pattern, created_by, is_public, usage_count, created_at
         FROM pipeline_templates
         WHERE id = ?`
      )
      .get(templateId) as
      | {
          id: string;
          name: string;
          description: string | null;
          eyes: string;
          strict: number;
          auto_trigger_pattern: string | null;
          created_by: string | null;
          is_public: number;
          usage_count: number;
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
      eyes: JSON.parse(row.eyes) as string[],
      strict: row.strict === 1,
      autoTriggerPattern: row.auto_trigger_pattern ?? undefined,
      createdBy: row.created_by ?? undefined,
      isPublic: row.is_public === 1,
      usageCount: row.usage_count,
      createdAt: row.created_at,
    };
  }

  /**
   * Find template by auto-trigger pattern
   */
  async findTemplateByPattern(request: string): Promise<PipelineTemplate | null> {
    const rows = this.db
      .prepare(
        `SELECT id, name, description, eyes, strict, auto_trigger_pattern, created_by, is_public, usage_count, created_at
         FROM pipeline_templates
         WHERE auto_trigger_pattern IS NOT NULL
         ORDER BY usage_count DESC`
      )
      .all() as Array<{
      id: string;
      name: string;
      description: string | null;
      eyes: string;
      strict: number;
      auto_trigger_pattern: string | null;
      created_by: string | null;
      is_public: number;
      usage_count: number;
      created_at: number;
    }>;

    // Test each pattern against request
    for (const row of rows) {
      if (row.auto_trigger_pattern) {
        try {
          const regex = new RegExp(row.auto_trigger_pattern, 'i');
          if (regex.test(request)) {
            return {
              id: row.id,
              name: row.name,
              description: row.description ?? undefined,
              eyes: JSON.parse(row.eyes) as string[],
              strict: row.strict === 1,
              autoTriggerPattern: row.auto_trigger_pattern,
              createdBy: row.created_by ?? undefined,
              isPublic: row.is_public === 1,
              usageCount: row.usage_count,
              createdAt: row.created_at,
            };
          }
        } catch (error) {
          // Invalid regex - skip
          console.warn(`Invalid auto-trigger pattern for template ${row.id}:`, error);
        }
      }
    }

    return null;
  }

  /**
   * Execute template - return fixed eye sequence
   */
  async executeTemplate(templateId: string): Promise<TemplateExecutionPlan> {
    const template = await this.getTemplate(templateId);
    if (!template) {
      throw new Error(`Template not found: ${templateId}`);
    }

    // Increment usage count
    this.db
      .prepare(`UPDATE pipeline_templates SET usage_count = usage_count + 1 WHERE id = ?`)
      .run(templateId);

    return {
      templateId: template.id,
      templateName: template.name,
      eyeSequence: template.eyes,
      strict: template.strict,
      reasoning: `Using fixed template: ${template.name}${template.description ? ` - ${template.description}` : ''}`,
    };
  }

  /**
   * Create new template
   */
  async createTemplate(params: {
    name: string;
    description?: string;
    eyes: readonly string[];
    strict?: boolean;
    autoTriggerPattern?: string;
    createdBy?: string;
    isPublic?: boolean;
  }): Promise<PipelineTemplate> {
    const id = this.generateId();
    const createdAt = Date.now();

    const template: PipelineTemplate = {
      id,
      name: params.name,
      description: params.description,
      eyes: params.eyes,
      strict: params.strict ?? true,
      autoTriggerPattern: params.autoTriggerPattern,
      createdBy: params.createdBy,
      isPublic: params.isPublic ?? false,
      usageCount: 0,
      createdAt,
    };

    this.db
      .prepare(
        `INSERT INTO pipeline_templates (id, name, description, eyes, strict, auto_trigger_pattern, created_by, is_public, usage_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        template.id,
        template.name,
        template.description ?? null,
        JSON.stringify(template.eyes),
        template.strict ? 1 : 0,
        template.autoTriggerPattern ?? null,
        template.createdBy ?? null,
        template.isPublic ? 1 : 0,
        template.usageCount,
        template.createdAt
      );

    return template;
  }

  /**
   * List all templates (optionally filtered)
   */
  async listTemplates(filters?: { isPublic?: boolean; createdBy?: string }): Promise<readonly PipelineTemplate[]> {
    let query = `SELECT id, name, description, eyes, strict, auto_trigger_pattern, created_by, is_public, usage_count, created_at
                 FROM pipeline_templates WHERE 1=1`;
    const params: unknown[] = [];

    if (filters?.isPublic !== undefined) {
      query += ` AND is_public = ?`;
      params.push(filters.isPublic ? 1 : 0);
    }

    if (filters?.createdBy) {
      query += ` AND created_by = ?`;
      params.push(filters.createdBy);
    }

    query += ` ORDER BY usage_count DESC, created_at DESC`;

    const rows = this.db.prepare(query).all(...params) as Array<{
      id: string;
      name: string;
      description: string | null;
      eyes: string;
      strict: number;
      auto_trigger_pattern: string | null;
      created_by: string | null;
      is_public: number;
      usage_count: number;
      created_at: number;
    }>;

    return rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      eyes: JSON.parse(row.eyes) as string[],
      strict: row.strict === 1,
      autoTriggerPattern: row.auto_trigger_pattern ?? undefined,
      createdBy: row.created_by ?? undefined,
      isPublic: row.is_public === 1,
      usageCount: row.usage_count,
      createdAt: row.created_at,
    }));
  }

  /**
   * Delete template
   */
  async deleteTemplate(templateId: string): Promise<boolean> {
    const result = this.db
      .prepare(`DELETE FROM pipeline_templates WHERE id = ?`)
      .run(templateId);

    return result.changes > 0;
  }

  /**
   * Generate template ID
   */
  private generateId(): string {
    return `tmpl_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
