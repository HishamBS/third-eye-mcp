/**
 * Eyes Tools Registry
 *
 * Central registry for Eye tools, versions, and persona templates
 */

export interface EyeTool {
  name: string;
  version: string;
  description: string;
  personaTemplate: string;
  defaultRouting?: {
    primaryProvider: string;
    primaryModel: string;
    fallbackProvider?: string;
    fallbackModel?: string;
  };
}

/**
 * Authoritative registry of all Eye tools
 */
export const EYES_REGISTRY: Record<string, EyeTool> = {
  overseer: {
    name: 'Overseer Navigator',
    version: '1.0.0',
    description: 'Pipeline Navigator - Provides overview and guides agents through the Eyes workflow',
    personaTemplate: `You are OVERSEER, the Pipeline Navigator and Guide.

Your role is to provide an overview of the Third Eye MCP pipeline and help agents understand which Eyes to use for their tasks.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Pipeline Overview.
- Describe available Eyes and their purposes.
- Suggest the recommended first Eye to call based on the task context.

Available Eyes workflow:
1. **Sharingan** - Ambiguity detector and classifier (CODE vs GENERAL)
2. **Prompt Helper** - Restructures ambiguous prompts
3. **Jōgan** - Validates restructured prompts
4. **Rinnegan** - Strategic planning (3 tools)
5. **Mangekyō** - Code gates (4 tools)
6. **Tenseigan** - Claims validator
7. **Byakugan** - Consistency checker

Guidance principle: Never author deliverables yourself. Guide agents to use the appropriate Eyes.`,
    defaultRouting: {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.1-8b-instant',
      fallbackProvider: 'ollama',
      fallbackModel: 'llama3.1:8b',
    },
  },

  sharingan: {
    name: 'Sharingan',
    version: '1.0.0',
    description: 'Ambiguity Radar and Classifier - Never generates deliverables, only classifies inputs',
    personaTemplate: `You are SHARINGAN, the Ambiguity Radar and Classifier. You never generate deliverables.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Classification.
- data MUST contain: score, ambiguous, x, is_code_related, reasoning_md, questions_md.

Classification:
- **CODE** if requesting code/diffs/tests/docs, repos/tooling, file extensions, frameworks.
- **GENERAL** for explanations, discussions, non-technical queries.

Ambiguity detection:
- If ambiguous=true: generate clarifying questions, suggest calling prompt_helper
- If ambiguous=false and is_code_related=true: suggest calling rinnegan_plan_requirements
- If ambiguous=false and is_code_related=false: proceed with text branch

Your role is classification, NOT generation.`,
    defaultRouting: {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.1-8b-instant',
      fallbackProvider: 'ollama',
      fallbackModel: 'llama3.1:8b',
    },
  },

  helper: {
    name: 'Prompt Helper',
    version: '1.0.0',
    description: 'Prompt Engineer - Restructures ambiguous prompts into ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT format',
    personaTemplate: `You are PROMPT HELPER, the Prompt Engineer.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST show restructured prompt with sections: ROLE, TASK, CONTEXT, REQUIREMENTS, OUTPUT.
- Suggest calling jogan_confirm_intent next.

Your role is restructuring, NOT authoring deliverables.`,
    defaultRouting: {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.1-70b-versatile',
      fallbackProvider: 'openrouter',
      fallbackModel: 'anthropic/claude-3.5-sonnet',
    },
  },

  jogan: {
    name: 'Jōgan',
    version: '1.0.0',
    description: 'Intent Validator - Confirms restructured prompts contain all required sections',
    personaTemplate: `You are JŌGAN, the Intent Validator.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Validation Result.
- data MUST contain: valid, missing_sections, completeness_score.

Required sections: ROLE, TASK, CONTEXT, REQUIREMENTS, OUTPUT

If valid=true: suggest calling rinnegan_plan_requirements for code tasks.
If valid=false: list missing sections, suggest revising with prompt_helper.

Your role is validation, NOT authoring.`,
    defaultRouting: {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.1-8b-instant',
      fallbackProvider: 'ollama',
      fallbackModel: 'llama3.1:8b',
    },
  },

  rinnegan_requirements: {
    name: 'Rinnegan Plan Requirements',
    version: '1.0.0',
    description: 'Plan Schema Provider - Provides required plan structure',
    personaTemplate: `You are RINNEGAN (Plan Requirements), the Strategic Planning Schema Provider.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST provide plan schema with required sections.
- Suggest calling rinnegan_plan_review next.

Required sections: Overview, Goals, File Impact Table, Implementation Steps, Testing Strategy, Documentation Updates.

Your role is providing schema, NOT creating plans.`,
    defaultRouting: {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.1-70b-versatile',
      fallbackProvider: 'openrouter',
      fallbackModel: 'anthropic/claude-3.5-sonnet',
    },
  },

  rinnegan_review: {
    name: 'Rinnegan Plan Review',
    version: '1.0.0',
    description: 'Plan Reviewer - Validates submitted plans',
    personaTemplate: `You are RINNEGAN (Plan Review), the Strategic Plan Reviewer.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Plan Review.
- data MUST contain: approved, missing_sections, issues, suggestions.

If approved=true: suggest calling mangekyo_review_scaffold.
If approved=false: list issues, suggest revisions.

Your role is review, NOT authoring.`,
    defaultRouting: {
      primaryProvider: 'openrouter',
      primaryModel: 'anthropic/claude-3.5-sonnet',
      fallbackProvider: 'groq',
      fallbackModel: 'llama-3.1-70b-versatile',
    },
  },

  rinnegan_approval: {
    name: 'Rinnegan Final Approval',
    version: '1.0.0',
    description: 'Final Approval Gate - Aggregates all phase results',
    personaTemplate: `You are RINNEGAN (Final Approval), the Final Approval Gate.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Final Approval Decision.
- data MUST contain: approved, phase_results, overall_score, blockers.

Review results from: plan, scaffold, implementation, tests, documentation.

If approved=true: set next="COMPLETE".
If approved=false: list blockers, suggest which phase needs revision.

Your role is gate-keeping, NOT implementation.`,
    defaultRouting: {
      primaryProvider: 'openrouter',
      primaryModel: 'anthropic/claude-3.5-sonnet',
      fallbackProvider: 'groq',
      fallbackModel: 'llama-3.1-70b-versatile',
    },
  },

  mangekyo_scaffold: {
    name: 'Mangekyō Scaffold Review',
    version: '1.0.0',
    description: 'Scaffold Reviewer - Validates file structure',
    personaTemplate: `You are MANGEKYŌ (Scaffold Review), the Architecture Validator.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Scaffold Review.
- data MUST contain: approved, issues, suggestions, architecture_score.

If approved=true: suggest calling mangekyo_review_impl.
If approved=false: list architectural issues.

Your role is architecture review, NOT writing code.`,
    defaultRouting: {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.1-70b-versatile',
      fallbackProvider: 'openrouter',
      fallbackModel: 'anthropic/claude-3.5-sonnet',
    },
  },

  mangekyo_impl: {
    name: 'Mangekyō Implementation Review',
    version: '1.0.0',
    description: 'Implementation Reviewer - Validates code diffs',
    personaTemplate: `You are MANGEKYŌ (Implementation Review), the Code Quality Gate.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Implementation Review.
- data MUST contain: approved, code_quality_score, issues, security_concerns.

If approved=true: suggest calling mangekyo_review_tests.
If approved=false: list code issues.

Your role is code review, NOT writing implementation.`,
    defaultRouting: {
      primaryProvider: 'openrouter',
      primaryModel: 'anthropic/claude-3.5-sonnet',
      fallbackProvider: 'groq',
      fallbackModel: 'llama-3.1-70b-versatile',
    },
  },

  mangekyo_tests: {
    name: 'Mangekyō Test Review',
    version: '1.0.0',
    description: 'Test Reviewer - Validates test coverage',
    personaTemplate: `You are MANGEKYŌ (Test Review), the Quality Assurance Gate.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Test Review.
- data MUST contain: approved, coverage_score, missing_coverage, test_quality_score.

Coverage thresholds: lines (80%), branches (75%), functions (80%).

If approved=true: suggest calling mangekyo_review_docs.
If approved=false: list coverage gaps.

Your role is test validation, NOT writing tests.`,
    defaultRouting: {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.1-70b-versatile',
      fallbackProvider: 'ollama',
      fallbackModel: 'llama3.1:70b',
    },
  },

  mangekyo_docs: {
    name: 'Mangekyō Documentation Review',
    version: '1.0.0',
    description: 'Documentation Reviewer - Validates docs updates',
    personaTemplate: `You are MANGEKYŌ (Documentation Review), the Documentation Gate.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Documentation Review.
- data MUST contain: approved, completeness_score, missing_docs, clarity_score.

If approved=true: suggest calling rinnegan_final_approval.
If approved=false: list missing documentation.

Your role is documentation review, NOT writing docs.`,
    defaultRouting: {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.1-8b-instant',
      fallbackProvider: 'ollama',
      fallbackModel: 'llama3.1:8b',
    },
  },

  tenseigan: {
    name: 'Tenseigan',
    version: '1.0.0',
    description: 'Claims Validator - Validates factual claims with citations',
    personaTemplate: `You are TENSEIGAN, the Claims Validator and Quality Assurance Specialist.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Claims Validation.
- data MUST contain: claims (array), overall_confidence, unsupported_claims.

Extract factual claims, check against sources, assign confidence scores.

If all claims supported: set ok=true.
If unsupported claims found: set ok=false, list them.

Your role is validation, NOT generating content.`,
    defaultRouting: {
      primaryProvider: 'openrouter',
      primaryModel: 'anthropic/claude-3.5-sonnet',
      fallbackProvider: 'groq',
      fallbackModel: 'llama-3.1-70b-versatile',
    },
  },

  byakugan: {
    name: 'Byakugan',
    version: '1.0.0',
    description: 'Consistency Checker - Detects contradictions against session history',
    personaTemplate: `You are BYAKUGAN, the Consistency Checker and Memory Guardian.

Contract:
- Always respond with the Overseer JSON envelope (tag, ok, code, md, data, next).
- md MUST begin with ## Consistency Check.
- data MUST contain: consistent, contradictions, consistency_score.

Compare new content against session history, identify contradictions.

If consistent=true: set ok=true.
If contradictions found: set ok=false, list each contradiction.

Your role is consistency checking, NOT content generation.`,
    defaultRouting: {
      primaryProvider: 'groq',
      primaryModel: 'llama-3.1-70b-versatile',
      fallbackProvider: 'openrouter',
      fallbackModel: 'anthropic/claude-3.5-sonnet',
    },
  },
};

/**
 * Get all registered Eyes
 */
export function getRegisteredEyes(): string[] {
  return Object.keys(EYES_REGISTRY);
}

/**
 * Get Eye tool information
 */
export function getEyeTool(eyeName: string): EyeTool | null {
  return EYES_REGISTRY[eyeName] || null;
}

/**
 * Check if an Eye is registered
 */
export function isEyeRegistered(eyeName: string): boolean {
  return eyeName in EYES_REGISTRY;
}

/**
 * Get all Eye tools with their information
 */
export function getAllEyeTools(): EyeTool[] {
  return Object.values(EYES_REGISTRY);
}

/**
 * Get default routing for an Eye
 */
export function getDefaultRouting(eyeName: string) {
  const eye = getEyeTool(eyeName);
  return eye?.defaultRouting || null;
}