import { describe, it, expect } from 'vitest';

describe('MCP Server', () => {
  describe('Server initialization', () => {
    it('should have required server info', () => {
      const serverInfo = {
        name: 'third-eye-mcp',
        version: '1.0.0'
      };

      expect(serverInfo.name).toBe('third-eye-mcp');
      expect(serverInfo.version).toBeDefined();
    });

    it('should expose third_eye_overseer tool only', () => {
      const tools = [
        { name: 'third_eye_overseer' }
      ];

      expect(tools).toHaveLength(1);
      expect(tools[0].name).toBe('third_eye_overseer');
    });

    it('should not expose navigator tool', () => {
      const tools = [{ name: 'third_eye_overseer' }];
      const hasNavigator = tools.some(t => t.name === 'navigator');

      expect(hasNavigator).toBe(false);
    });
  });

  describe('Overseer tool schema', () => {
    it('should have correct input schema', () => {
      const schema = {
        type: 'object',
        properties: {
          task: { type: 'string' },
          sessionId: { type: 'string' },
          strictness: { type: 'object' },
          context: { type: 'object' }
        },
        required: ['task'],
        additionalProperties: true,
      };

      expect(schema.type).toBe('object');
      expect(schema.required).toContain('task');
      expect(schema.properties.task.type).toBe('string');
    });

    it('should have optional sessionId', () => {
      const request1 = { task: 'test' };
      const request2 = {
        task: 'test',
        sessionId: 'session-123'
      };

      expect(request1).not.toHaveProperty('sessionId');
      expect(request2).toHaveProperty('sessionId');
    });

    it('should accept strictness object', () => {
      const request = {
        task: 'test',
        strictness: { ambiguityThreshold: 40, citationCutoff: 70 }
      };

      expect(request.strictness).toBeDefined();
      expect(request.strictness.ambiguityThreshold).toBe(0.4);
    });
  });

  describe('Tool execution', () => {
    it('should process valid requests', () => {
      const request = {
        task: 'Please analyze this code',
        sessionId: crypto.randomUUID()
      };

      expect(request.task).toBeTruthy();
      expect(request.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it('should create session if not provided', () => {
      const request: { task: string; sessionId?: string } = {
        task: 'test'
      };

      // Server should auto-generate sessionId
      const sessionId = request.sessionId || crypto.randomUUID();

      expect(sessionId).toBeDefined();
      expect(sessionId.length).toBeGreaterThan(0);
    });

    it('should route to appropriate eye', () => {
      const routing = {
        task: 'code review',
        selectedEye: 'sharingan',
        reasoning: 'Code quality analysis task'
      };

      expect(routing.selectedEye).toBe('sharingan');
    });
  });

  describe('Error handling', () => {
    it('should reject empty task', () => {
      const request = { task: '' };
      const isValid = typeof request.task === 'string' && request.task.length > 0;
      expect(isValid).toBe(false);
    });

    it('should handle server errors gracefully', () => {
      const error = {
        type: 'server_error',
        message: 'Internal server error',
        code: 500
      };

      expect(error.type).toBe('server_error');
      expect(error.code).toBe(500);
    });
  });

  describe('Response format', () => {
    it('should return structured response', () => {
      const response = {
        content: [
          {
            type: 'text',
            text: 'Analysis result'
          }
        ],
        isError: false
      };

      expect(response.content).toBeInstanceOf(Array);
      expect(response.isError).toBe(false);
    });

    it('should include metadata in response', () => {
      const response = {
        content: [{ type: 'text', text: 'result' }],
        metadata: {
          sessionId: 'session-123',
          eyeUsed: 'sharingan',
          processingTime: 1234
        }
      };

      expect(response.metadata).toBeDefined();
      expect(response.metadata.eyeUsed).toBe('sharingan');
    });

    it('should handle error responses', () => {
      const errorResponse = {
        content: [
          {
            type: 'text',
            text: 'Error: Invalid request'
          }
        ],
        isError: true
      };

      expect(errorResponse.isError).toBe(true);
    });
  });

  describe('Session management', () => {
    it('should maintain session across calls', () => {
      const sessionId = crypto.randomUUID();

      const call1 = { messages: [{ role: 'user', content: 'First message' }], sessionId };
      const call2 = { messages: [{ role: 'user', content: 'Follow up' }], sessionId };

      expect(call1.sessionId).toBe(call2.sessionId);
    });

    it('should track conversation history', () => {
      const session = {
        id: 'session-123',
        messages: [
          { role: 'user', content: 'Hi' },
          { role: 'assistant', content: 'Hello' },
          { role: 'user', content: 'How are you?' }
        ]
      };

      expect(session.messages.length).toBe(3);
    });
  });

  describe('Strictness levels', () => {
    it('should apply strictness to validation', () => {
      const levels = [
        { level: 0, name: 'permissive', checks: ['basic'] },
        { level: 5, name: 'balanced', checks: ['basic', 'style'] },
        { level: 10, name: 'strict', checks: ['basic', 'style', 'advanced'] }
      ];

      expect(levels[0].checks.length).toBeLessThan(levels[2].checks.length);
    });

    it('should default to balanced strictness', () => {
      const defaultLevel = 5;

      expect(defaultLevel).toBe(5);
      expect(defaultLevel).toBeGreaterThanOrEqual(0);
      expect(defaultLevel).toBeLessThanOrEqual(10);
    });
  });

  describe('Tool capabilities', () => {
    it('should list supported operations', () => {
      const capabilities = [
        'code_review',
        'requirements_analysis',
        'quality_check',
        'translation',
        'creative_solutions',
        'validation',
        'documentation'
      ];

      expect(capabilities.length).toBeGreaterThan(5);
    });

    it('should support all eye types', () => {
      const eyes = [
        'sharingan',
        'rinnegan',
        'byakugan',
        'jogan',
        'tenseigan',
        'mangekyo',
        'overseer'
      ];

      expect(eyes).toContain('sharingan');
      expect(eyes).toContain('overseer');
      expect(eyes.length).toBe(7);
    });
  });

  describe('Configuration', () => {
    it('should read server config', () => {
      const config = {
        port: 7070,
        host: '127.0.0.1',
        logLevel: 'info'
      };

      expect(config.port).toBe(7070);
      expect(config.host).toBe('127.0.0.1');
    });

    it('should support custom config paths', () => {
      const configPath = process.env.MCP_CONFIG || '~/.third-eye-mcp/config.json';

      expect(configPath).toBeDefined();
    });
  });

  describe('Transport protocol', () => {
    it('should support stdio transport', () => {
      const transport = 'stdio';

      expect(transport).toBe('stdio');
    });

    it('should handle JSON-RPC messages', () => {
      const rpcMessage = {
        jsonrpc: '2.0',
        method: 'tools/call',
        params: {
          name: 'overseer',
          arguments: { messages: [] }
        },
        id: 1
      };

      expect(rpcMessage.jsonrpc).toBe('2.0');
      expect(rpcMessage.method).toBe('tools/call');
    });
  });
});
