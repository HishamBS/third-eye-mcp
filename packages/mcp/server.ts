import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { EyeOrchestrator } from '@third-eye/core';
import { getRegisteredEyes, getEyeTool } from '@third-eye/core';
import { z } from 'zod';

/**
 * Third Eye MCP Server
 *
 * Provides stdio-based MCP server for agent connections
 * Exposes Eyes as MCP tools with intelligent guidance
 */

const orchestrator = new EyeOrchestrator();

// Tool schemas for each Eye
const EYE_TOOLS: Record<string, Tool> = {
  guidance: {
    name: 'third_eye_get_guidance',
    description: '🎯 SMART MCP META-TOOL: Get intelligent workflow guidance. Use this when unsure which Eye to call next, or to understand optimal workflow paths. This tool analyzes your task and current state to recommend the best next Eye to use.',
    inputSchema: {
      type: 'object',
      properties: {
        task_description: {
          type: 'string',
          description: 'What you are trying to accomplish',
        },
        current_state: {
          type: 'string',
          description: 'Current workflow state (e.g., "clarified prompt", "plan approved")',
        },
        last_eye_response: {
          type: 'object',
          description: 'Response from the last Eye you called (optional)',
        },
        session_id: {
          type: 'string',
          description: 'Session ID for context tracking',
        },
      },
      required: ['task_description', 'session_id'],
    },
  },
  navigator: {
    name: 'third_eye_navigator',
    description: '🧿 NAVIGATOR: Get overview of Third Eye pipeline and available Eyes. Call this first to understand the workflow.',
    inputSchema: {
      type: 'object',
      properties: {
        context: {
          type: 'string',
          description: 'Optional context about what you are trying to accomplish',
        },
      },
    },
  },
  sharingan: {
    name: 'third_eye_sharingan_clarify',
    description: 'Ambiguity Radar & Classifier. Detects vague prompts and classifies as CODE or GENERAL. Use after navigator to validate input clarity. Automatically suggests calling prompt_helper if ambiguous.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The user prompt to analyze for ambiguity and classify',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['prompt'],
    },
  },
  helper: {
    name: 'third_eye_prompt_helper',
    description: 'Prompt Engineer. Restructures ambiguous prompts into ROLE/TASK/CONTEXT/REQUIREMENTS/OUTPUT format. Call this when Sharingan detects ambiguity.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The ambiguous prompt to restructure',
        },
        clarifications: {
          type: 'object',
          description: 'Answers to clarifying questions from Sharingan',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['prompt'],
    },
  },
  jogan: {
    name: 'third_eye_jogan_confirm_intent',
    description: 'Intent Validator. Confirms the restructured prompt contains all required sections. Call after prompt_helper to validate the refined prompt.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'The restructured prompt to validate',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['prompt'],
    },
  },
  rinnegan_requirements: {
    name: 'third_eye_rinnegan_plan_requirements',
    description: 'Plan Requirements Schema. Provides the required plan structure and example. Call this before creating implementation plans for code tasks.',
    inputSchema: {
      type: 'object',
      properties: {
        task: {
          type: 'string',
          description: 'Brief description of the task to plan',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['task'],
    },
  },
  rinnegan_review: {
    name: 'third_eye_rinnegan_plan_review',
    description: 'Plan Reviewer. Validates submitted plans against required sections and file impact tables. Call this with your implementation plan before proceeding to code.',
    inputSchema: {
      type: 'object',
      properties: {
        plan: {
          type: 'string',
          description: 'The implementation plan in markdown format',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['plan'],
    },
  },
  rinnegan_approval: {
    name: 'third_eye_rinnegan_final_approval',
    description: 'Final Approval Gate. Aggregates all phase results (plan, scaffold, impl, tests, docs) and gives go/no-go. Call this at the end with all work products.',
    inputSchema: {
      type: 'object',
      properties: {
        plan: {
          type: 'string',
          description: 'The approved plan',
        },
        scaffold: {
          type: 'string',
          description: 'The scaffold review result',
        },
        implementation: {
          type: 'string',
          description: 'The implementation review result',
        },
        tests: {
          type: 'string',
          description: 'The tests review result',
        },
        docs: {
          type: 'string',
          description: 'The docs review result',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['plan', 'scaffold', 'implementation', 'tests', 'docs'],
    },
  },
  mangekyo_scaffold: {
    name: 'third_eye_mangekyo_review_scaffold',
    description: 'Scaffold Reviewer. Validates file structure and architecture decisions. Call this with your file/folder structure before writing code.',
    inputSchema: {
      type: 'object',
      properties: {
        scaffold: {
          type: 'string',
          description: 'The proposed file structure in markdown format',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['scaffold'],
    },
  },
  mangekyo_impl: {
    name: 'third_eye_mangekyo_review_impl',
    description: 'Implementation Reviewer. Validates code diffs and reasoning. Call this with your code changes in diff format.',
    inputSchema: {
      type: 'object',
      properties: {
        diffs: {
          type: 'string',
          description: 'Code diffs in markdown fence format',
        },
        reasoning: {
          type: 'string',
          description: 'Explanation of the implementation approach',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['diffs', 'reasoning'],
    },
  },
  mangekyo_tests: {
    name: 'third_eye_mangekyo_review_tests',
    description: 'Test Reviewer. Validates test coverage against thresholds. Call this with your test files and coverage data.',
    inputSchema: {
      type: 'object',
      properties: {
        tests: {
          type: 'string',
          description: 'Test code in markdown format',
        },
        coverage: {
          type: 'object',
          description: 'Coverage metrics (lines, branches, functions)',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['tests'],
    },
  },
  mangekyo_docs: {
    name: 'third_eye_mangekyo_review_docs',
    description: 'Documentation Reviewer. Validates documentation updates and completeness. Call this with your README/docs updates.',
    inputSchema: {
      type: 'object',
      properties: {
        docs: {
          type: 'string',
          description: 'Documentation in markdown format',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['docs'],
    },
  },
  tenseigan: {
    name: 'third_eye_tenseigan_validate_claims',
    description: 'Claims Validator. Validates factual claims with citations and confidence scores. Call this to verify factual accuracy of generated content.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'Content with claims to validate',
        },
        sources: {
          type: 'array',
          items: { type: 'string' },
          description: 'Available sources for citation validation',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID for tracking (optional)',
        },
      },
      required: ['content'],
    },
  },
  byakugan: {
    name: 'third_eye_byakugan_consistency_check',
    description: 'Consistency Checker. Detects contradictions against session history. Call this to ensure new outputs are consistent with previous work.',
    inputSchema: {
      type: 'object',
      properties: {
        content: {
          type: 'string',
          description: 'New content to check for consistency',
        },
        sessionId: {
          type: 'string',
          description: 'Session ID to check history against (required)',
        },
      },
      required: ['content', 'sessionId'],
    },
  },
};

/**
 * Create and configure MCP server
 */
export function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'third-eye-mcp',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: Object.values(EYE_TOOLS),
    };
  });

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    // Handle guidance meta-tool separately
    if (name === 'third_eye_get_guidance') {
      const { getWorkflowGuidance } = await import('@third-eye/core/guidance');

      const guidance = getWorkflowGuidance({
        taskDescription: (args as any).task_description,
        currentState: (args as any).current_state,
        lastEyeResponse: (args as any).last_eye_response,
        sessionId: (args as any).session_id,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: true,
              guidance,
              meta: {
                tool: 'third_eye_get_guidance',
                message: 'Use the recommended_tool for your next action',
              },
            }, null, 2),
          },
        ],
      };
    }

    // Map tool name to Eye
    const eyeMap: Record<string, string> = {
      third_eye_navigator: 'navigator',
      third_eye_sharingan_clarify: 'sharingan',
      third_eye_prompt_helper: 'helper',
      third_eye_jogan_confirm_intent: 'jogan',
      third_eye_rinnegan_plan_requirements: 'rinnegan_requirements',
      third_eye_rinnegan_plan_review: 'rinnegan_review',
      third_eye_rinnegan_final_approval: 'rinnegan_approval',
      third_eye_mangekyo_review_scaffold: 'mangekyo_scaffold',
      third_eye_mangekyo_review_impl: 'mangekyo_impl',
      third_eye_mangekyo_review_tests: 'mangekyo_tests',
      third_eye_mangekyo_review_docs: 'mangekyo_docs',
      third_eye_tenseigan_validate_claims: 'tenseigan',
      third_eye_byakugan_consistency_check: 'byakugan',
    };

    const eyeName = eyeMap[name];
    if (!eyeName) {
      throw new Error(`Unknown tool: ${name}`);
    }

    // Extract sessionId or generate one
    const sessionId = (args as any).sessionId || `mcp_${Date.now()}`;

    // Prepare input based on Eye type
    let input: string;
    if (eyeName === 'navigator') {
      input = (args as any).context || 'General overview';
    } else if (eyeName === 'sharingan') {
      input = (args as any).prompt;
    } else if (eyeName === 'helper') {
      const clarifications = (args as any).clarifications || {};
      input = `${(args as any).prompt}\n\nClarifications: ${JSON.stringify(clarifications)}`;
    } else if (eyeName === 'jogan') {
      input = (args as any).prompt;
    } else if (eyeName.startsWith('rinnegan')) {
      input = (args as any).plan || (args as any).task || JSON.stringify(args);
    } else if (eyeName.startsWith('mangekyo')) {
      input = JSON.stringify(args);
    } else if (eyeName === 'tenseigan') {
      input = (args as any).content;
    } else if (eyeName === 'byakugan') {
      input = (args as any).content;
    } else {
      input = JSON.stringify(args);
    }

    try {
      // Call orchestrator to execute Eye with LLM
      const result = await orchestrator.runEye(eyeName, input, sessionId);

      // Return result as MCP tool response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (error: any) {
      // Return error as tool response
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              tag: eyeName,
              ok: false,
              code: 'E_EXECUTION_FAILED',
              md: `# Error\n\n${error.message}`,
              data: { error: error.message },
              next: 'RETRY',
            }, null, 2),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start MCP server with stdio transport
 */
export async function startMCPServer() {
  const server = createMCPServer();
  const transport = new StdioServerTransport();

  await server.connect(transport);

  console.error('🧿 Third Eye MCP Server running on stdio');
  console.error('📡 Ready for agent connections');
  console.error(`🔧 Available tools: ${Object.keys(EYE_TOOLS).length}`);
}
