import { z } from 'zod';

/**
 * Tool metadata for MCP discovery
 */
export interface ToolMetadata {
  name: string;
  description: string;
  inputSchema: z.ZodType<any> | Record<string, any>;
  outputSchema: z.ZodType<any> | Record<string, any>;
  version: string;
  tags?: string[];
  examples?: Array<{ input: any; output: any; description?: string }>;
}

/**
 * Tool Registry for MCP
 * Manages all registered Eyes and their metadata
 */
class ToolRegistry {
  private tools = new Map<string, ToolMetadata>();

  /**
   * Register a new tool (Eye)
   */
  register(tool: ToolMetadata): void {
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a specific tool by name
   */
  getTool(name: string): ToolMetadata | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   */
  getAllTools(): ToolMetadata[] {
    return Array.from(this.tools.values());
  }

  /**
   * Get tool names
   */
  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Check if tool exists
   */
  has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Unregister a tool
   */
  unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Clear all tools
   */
  clear(): void {
    this.tools.clear();
  }
}

// Global registry instance
export const toolRegistry = new ToolRegistry();

// Register built-in Eyes
toolRegistry.register({
  name: 'sharingan',
  description: 'Ambiguity Radar - Detects vague, ambiguous, or underspecified requests',
  version: '1.0.0',
  tags: ['clarification', 'validation', 'input-analysis'],
  inputSchema: {
    type: 'object',
    properties: {
      prompt: { type: 'string', minLength: 1 },
      lang: { enum: ['auto', 'en', 'ar'] },
    },
    required: ['prompt'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      eye: { type: 'string' },
      code: { type: 'string' },
      verdict: { enum: ['APPROVED', 'REJECTED', 'NEEDS_INPUT'] },
      summary: { type: 'string' },
      metadata: {
        type: 'object',
        properties: {
          ambiguityScore: { type: 'number' },
          clarifyingQuestions: { type: 'array', items: { type: 'string' } },
        },
      },
    },
  },
});

toolRegistry.register({
  name: 'prompt-helper',
  description: 'Prompt Rewriter - Transforms vague prompts into structured ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT format',
  version: '1.0.0',
  tags: ['prompt-engineering', 'optimization'],
  inputSchema: {
    type: 'object',
    properties: {
      user_prompt: { type: 'string', minLength: 1 },
      clarification_answers_md: { type: 'string' },
    },
    required: ['user_prompt'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      eye: { type: 'string' },
      code: { type: 'string' },
      verdict: { enum: ['APPROVED', 'REJECTED', 'NEEDS_INPUT'] },
      summary: { type: 'string' },
      details: { type: 'string' },
    },
  },
});

toolRegistry.register({
  name: 'jogan',
  description: 'Intent Confirmation - Confirms user intent and task understanding',
  version: '1.0.0',
  tags: ['intent', 'confirmation', 'understanding'],
  inputSchema: {
    type: 'object',
    properties: {
      refined_prompt_md: { type: 'string', minLength: 1 },
      estimated_tokens: { type: 'number', minimum: 0 },
    },
    required: ['refined_prompt_md', 'estimated_tokens'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      eye: { type: 'string' },
      code: { type: 'string' },
      verdict: { enum: ['APPROVED', 'REJECTED', 'NEEDS_INPUT'] },
      summary: { type: 'string' },
    },
  },
});

toolRegistry.register({
  name: 'rinnegan',
  description: 'Plan Requirements/Review/Approval - Manages planning lifecycle',
  version: '1.0.0',
  tags: ['planning', 'requirements', 'review', 'approval'],
  inputSchema: {
    type: 'object',
    properties: {
      mode: { enum: ['requirements', 'review', 'approval'] },
      data: { type: 'object' },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      eye: { type: 'string' },
      code: { type: 'string' },
      verdict: { enum: ['APPROVED', 'REJECTED', 'NEEDS_INPUT'] },
      summary: { type: 'string' },
    },
  },
});

toolRegistry.register({
  name: 'mangekyo',
  description: 'Code Gates - Reviews scaffold, implementation, tests, and documentation',
  version: '1.0.0',
  tags: ['code-review', 'quality', 'gates'],
  inputSchema: {
    type: 'object',
    properties: {
      gate: { enum: ['scaffold', 'impl', 'tests', 'docs'] },
      diffs_md: { type: 'string' },
    },
    required: ['gate'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      eye: { type: 'string' },
      code: { type: 'string' },
      verdict: { enum: ['APPROVED', 'REJECTED', 'NEEDS_INPUT'] },
      summary: { type: 'string' },
    },
  },
});

toolRegistry.register({
  name: 'tenseigan',
  description: 'Evidence Validation - Validates claims with citations and evidence',
  version: '1.0.0',
  tags: ['validation', 'evidence', 'citations', 'fact-checking'],
  inputSchema: {
    type: 'object',
    properties: {
      draft_md: { type: 'string', minLength: 1 },
    },
    required: ['draft_md'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      eye: { type: 'string' },
      code: { type: 'string' },
      verdict: { enum: ['APPROVED', 'REJECTED', 'NEEDS_INPUT'] },
      summary: { type: 'string' },
      metadata: {
        type: 'object',
        properties: {
          totalClaims: { type: 'number' },
          citedClaims: { type: 'number' },
          citationRate: { type: 'number' },
        },
      },
    },
  },
});

toolRegistry.register({
  name: 'byakugan',
  description: 'Consistency Checker - Detects logical contradictions and inconsistencies',
  version: '1.0.0',
  tags: ['consistency', 'validation', 'logic'],
  inputSchema: {
    type: 'object',
    properties: {
      topic: { type: 'string', minLength: 1 },
      draft_md: { type: 'string', minLength: 1 },
    },
    required: ['topic', 'draft_md'],
  },
  outputSchema: {
    type: 'object',
    properties: {
      eye: { type: 'string' },
      code: { type: 'string' },
      verdict: { enum: ['APPROVED', 'REJECTED', 'NEEDS_INPUT'] },
      summary: { type: 'string' },
    },
  },
});

toolRegistry.register({
  name: 'overseer',
  description: 'Pipeline Navigator - Recommends next Eye based on current state',
  version: '1.0.0',
  tags: ['navigation', 'orchestration', 'routing'],
  inputSchema: {
    type: 'object',
    properties: {
      goal: { type: 'string' },
      currentState: { type: 'object' },
    },
  },
  outputSchema: {
    type: 'object',
    properties: {
      eye: { type: 'string' },
      code: { type: 'string' },
      verdict: { enum: ['APPROVED', 'REJECTED', 'NEEDS_INPUT'] },
      summary: { type: 'string' },
      metadata: {
        type: 'object',
        properties: {
          recommendedEye: { type: 'string' },
          reasoning: { type: 'string' },
        },
      },
    },
  },
});

/**
 * Helper to get all tools as JSON-serializable format
 */
export function getToolsJSON(): Array<{
  name: string;
  description: string;
  inputSchema: any;
  outputSchema: any;
  version: string;
  tags?: string[];
}> {
  return toolRegistry.getAllTools().map((tool) => ({
    name: tool.name,
    description: tool.description,
    inputSchema: tool.inputSchema,
    outputSchema: tool.outputSchema,
    version: tool.version,
    tags: tool.tags,
  }));
}

/**
 * Public API exports for registry operations
 */

/**
 * Get all registered tools
 */
export function getAllTools(): ToolMetadata[] {
  return toolRegistry.getAllTools();
}

/**
 * Get a specific tool by name
 */
export function getTool(name: string): ToolMetadata | undefined {
  return toolRegistry.getTool(name);
}

/**
 * Register a new tool
 */
export function registerTool(tool: ToolMetadata): void {
  toolRegistry.register(tool);
}

/**
 * Check if a tool exists
 */
export function hasTool(name: string): boolean {
  return toolRegistry.has(name);
}
