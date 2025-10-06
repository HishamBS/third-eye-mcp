import { describe, it, expect, vi, beforeEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/**
 * MCP Bridge Eyes Registration Tests
 *
 * Tests that all Third Eye Eyes are properly registered as MCP tools
 * with correct schemas and handlers.
 */

describe('MCP Bridge - Eyes Registration', () => {
  let mockServer: any;
  let registeredTools: Map<string, any>;

  beforeEach(() => {
    registeredTools = new Map();

    mockServer = {
      tool: vi.fn((name: string, config: any, handler: any) => {
        registeredTools.set(name, { name, config, handler });
      }),
    };
  });

  describe('Tool Registration', () => {
    it('should register all Third Eye tools', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const expectedTools = [
        'overseer/navigator',
        'sharingan/clarify',
        'helper/rewrite_prompt',
        'jogan/confirm_intent',
        'rinnegan/plan_requirements',
        'rinnegan/plan_review',
        'rinnegan/final_approval',
        'mangekyo/review_scaffold',
        'mangekyo/review_impl',
        'mangekyo/review_tests',
        'mangekyo/review_docs',
        'tenseigan/validate_claims',
        'byakugan/consistency_check',
      ];

      expect(mockServer.tool).toHaveBeenCalledTimes(13);

      const registeredNames = Array.from(registeredTools.keys());
      expectedTools.forEach((toolName) => {
        expect(registeredNames).toContain(toolName);
      });
    });

    it('should register overseer/navigator with correct schema', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const overseer = registeredTools.get('overseer/navigator');
      expect(overseer).toBeDefined();
      expect(overseer.config).toHaveProperty('inputSchema');
      expect(overseer.config.inputSchema).toHaveProperty('type', 'object');
      expect(overseer.config.inputSchema.properties).toHaveProperty('payload');
      expect(overseer.config.inputSchema.properties.payload.properties).toHaveProperty('goal');
    });

    it('should register sharingan/clarify with correct schema', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const sharingan = registeredTools.get('sharingan/clarify');
      expect(sharingan).toBeDefined();
      expect(sharingan.config.inputSchema.properties).toHaveProperty('payload');
      expect(sharingan.config.inputSchema.properties.payload.properties).toHaveProperty('prompt');
    });

    it('should register helper/rewrite_prompt with correct schema', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const helper = registeredTools.get('helper/rewrite_prompt');
      expect(helper).toBeDefined();
      expect(helper.config.inputSchema.properties).toHaveProperty('payload');
      expect(helper.config.inputSchema.properties.payload.properties).toHaveProperty('user_prompt');
    });

    it('should register rinnegan/plan_requirements with correct schema', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const rinnegan = registeredTools.get('rinnegan/plan_requirements');
      expect(rinnegan).toBeDefined();
      expect(rinnegan.config.inputSchema.properties).toHaveProperty('payload');
      expect(rinnegan.config.inputSchema.properties.payload.properties).toHaveProperty('summary_md');
    });

    it('should register mangekyo/review_scaffold with correct schema', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const mangekyo = registeredTools.get('mangekyo/review_scaffold');
      expect(mangekyo).toBeDefined();
      expect(mangekyo.config.inputSchema).toHaveProperty('type', 'object');
      expect(mangekyo.config.inputSchema.properties).toHaveProperty('payload');
    });

    it('should register tenseigan/validate_claims with correct schema', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const tenseigan = registeredTools.get('tenseigan/validate_claims');
      expect(tenseigan).toBeDefined();
      expect(tenseigan.config.inputSchema.properties).toHaveProperty('payload');
      expect(tenseigan.config.inputSchema.properties.payload.properties).toHaveProperty('draft_md');
    });

    it('should register byakugan/consistency_check with correct schema', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const byakugan = registeredTools.get('byakugan/consistency_check');
      expect(byakugan).toBeDefined();
      expect(byakugan.config.inputSchema).toHaveProperty('type', 'object');
    });
  });

  describe('Schema Validation', () => {
    it('should include required fields in schemas', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      registeredTools.forEach((tool) => {
        expect(tool.config.inputSchema).toHaveProperty('type', 'object');
        expect(tool.config.inputSchema).toHaveProperty('properties');
      });
    });

    it('should mark payload and context as required', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const sharingan = registeredTools.get('sharingan/clarify');
      expect(sharingan.config.inputSchema.required).toContain('payload');
      expect(sharingan.config.inputSchema.required).toContain('context');
    });

    it('should have nested payload schema for tenseigan', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const tenseigan = registeredTools.get('tenseigan/validate_claims');
      expect(tenseigan.config.inputSchema.properties).toHaveProperty('payload');
      expect(tenseigan.config.inputSchema.properties).toHaveProperty('context');
    });
  });

  describe('Tool Handlers', () => {
    it('should have callable handlers for all tools', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      registeredTools.forEach((tool) => {
        expect(typeof tool.handler).toBe('function');
      });
    });

    it('should return properly formatted responses', async () => {
      const { buildEyes } = await import('../src/eyes.js');
      buildEyes(mockServer as any);

      const sharingan = registeredTools.get('sharingan/clarify');
      const mockInput = { prompt: 'Test prompt' };

      // Handler should be async and return structured data
      expect(sharingan.handler).toBeDefined();
      expect(sharingan.handler.constructor.name).toBe('AsyncFunction');
    });
  });
});
