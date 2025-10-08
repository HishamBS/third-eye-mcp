import { Buffer } from 'node:buffer';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { runs, sessions, personas, eyesRouting, providerKeys } from '@third-eye/db';
import { ProviderFactory } from '@third-eye/providers';
import type { ProviderType } from '@third-eye/providers';
import { getEye, getAllEyeNames, type EyeName, type EyeResponse, type BaseEnvelope } from '@third-eye/eyes';
import { PROVIDERS } from '@third-eye/types';
import { eq, and, desc } from 'drizzle-orm';
import { orderGuard, type OrderViolation } from './order-guard';
import { getWebSocketBridge } from './websocket-registry';
import { decryptFromStorage } from './encryption';

function isSupportedProvider(value: unknown): value is ProviderType {
  if (typeof value !== 'string') {
    return false;
  }
  return PROVIDERS.some(provider => provider === value);
}

function hasBaseUrl(value: unknown): value is { baseUrl?: unknown } {
  return typeof value === 'object' && value !== null && 'baseUrl' in value;
}

const VALID_EYE_NAMES = new Set<string>(getAllEyeNames());

function isEyeName(value: string): value is EyeName {
  return VALID_EYE_NAMES.has(value);
}

function isRejectedResponse(response: EyeResponse): boolean {
  return !response.ok && response.code.startsWith('REJECT_');
}

interface SessionBootstrapConfig {
  agentName?: string;
  model?: string | null;
  displayName?: string | null;
  [key: string]: unknown;
}

interface ProviderCredentials {
  apiKey: string | null;
  baseUrl?: string;
}

/**
 * Eye Orchestrator
 *
 * Core orchestration engine for routing Eyes to providers and managing execution
 */
export class EyeOrchestrator {
  private readonly db: ReturnType<typeof getDb>['db'];

  constructor() {
    const { db } = getDb();
    this.db = db;
  }

  /**
   * Run an Eye with AI-powered analysis
   *
   * 100% professional AI-based orchestration:
   * 1) Resolve Eye implementation (from @third-eye/eyes package)
   * 2) Load routing configuration (provider + model)
   * 3) Call LLM with Eye's persona as system prompt
   * 4) Parse and validate response envelope
   * 5) Persist run with metrics; return envelope
   */
  async runEye(
    eyeName: string,
    input: string,
    sessionId?: string
  ): Promise<EyeResponse> {
    const startTime = Date.now();
    const runId = nanoid();
    let actualSessionId = sessionId;

    if (!actualSessionId) {
      actualSessionId = nanoid();
      await this.db.insert(sessions).values({
        id: actualSessionId,
        createdAt: new Date(),
        status: 'active',
        configJson: {},
      });
    }

    if (!isEyeName(eyeName)) {
      return this.createErrorEnvelope(
        eyeName,
        `Eye not found: ${eyeName}`,
        runId,
        actualSessionId,
        startTime
      );
    }

    // Emit run started event
    const ws = getWebSocketBridge();
    if (ws && sessionId) {
      // Broadcast eye_update (backward compatibility)
      ws.broadcastToSession(sessionId, {
        type: 'eye_update',
        sessionId,
        data: {
          runId,
          eye: eyeName,
          status: 'started',
          input: input.substring(0, 200) + (input.length > 200 ? '...' : ''),
          timestamp: startTime
        },
        timestamp: startTime
      });

      // Also broadcast pipeline_event (for Monitor page)
      ws.broadcastToSession(sessionId, {
        type: 'pipeline_event',
        sessionId,
        data: {
          runId,
          eye: eyeName,
          status: 'started',
          input: input.substring(0, 200) + (input.length > 200 ? '...' : ''),
          timestamp: startTime
        },
        timestamp: startTime
      });
    }

    try {
      // 1. Validate pipeline order
      const orderViolation = orderGuard.validateOrder(actualSessionId, eyeName);
      if (orderViolation) {
        return this.createOrderViolationEnvelope(
          eyeName,
          orderViolation,
          runId,
          actualSessionId,
          startTime
        );
      }

      // 2. Get Eye implementation to access persona
      const eye = getEye(eyeName);
      if (!eye) {
        return this.createErrorEnvelope(
          eyeName,
          `Eye not found: ${eyeName}`,
          runId,
          actualSessionId,
          startTime
        );
      }

      // 3. Load routing configuration
      const routing = await this.getEyeRouting(eyeName);
      if (!routing || !routing.primaryProvider || !routing.primaryModel) {
        return this.createErrorEnvelope(
          eyeName,
          `No routing configuration found for Eye: ${eyeName}. Run migration 0004 to seed routing.`,
          runId,
          actualSessionId,
          startTime
        );
      }

      // 4. Get provider API key
      const providerType = this.resolveProviderType(routing.primaryProvider);
      if (!providerType) {
        return this.createErrorEnvelope(
          eyeName,
          `Unsupported provider configured: ${routing.primaryProvider}`,
          runId,
          actualSessionId,
          startTime
        );
      }

      const providerCredentials = await this.getProviderCredentials(providerType);
      const apiKey = providerCredentials?.apiKey ?? null;
      if (!apiKey && providerType !== 'ollama' && providerType !== 'lmstudio') {
        return this.createErrorEnvelope(
          eyeName,
          `No API key configured for provider: ${providerType}. Add key via UI Settings or .env file.`,
          runId,
          actualSessionId,
          startTime
        );
      }

      // 5. Create provider instance
      const provider = ProviderFactory.createProvider(providerType, {
        apiKey: apiKey ?? undefined,
        baseUrl: providerCredentials?.baseUrl,
      });

      // 6. Call provider with Eye's persona as system prompt
      const persona = eye.getPersona();
      const completion = await provider.complete({
        model: routing.primaryModel,
        messages: [
          { role: 'system', content: persona },
          { role: 'user', content: input }
        ],
        temperature: 0.7,
        max_tokens: 4096,
        response_format: { type: 'json_object' }, // Force JSON-only responses
      });

      const latencyMs = Date.now() - startTime;

      // Log actual LLM response for debugging
      console.log(`\n📤 ${eyeName} LLM raw response:\n${completion.content}\n`);

      // 7. Parse response as envelope
      let envelope: BaseEnvelope;
      try {
        envelope = JSON.parse(completion.content);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = completion.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          envelope = JSON.parse(jsonMatch[1]);
        } else {
          // Response is not valid envelope, create error
          return this.createErrorEnvelope(
            eyeName,
            `LLM response is not valid JSON envelope: ${completion.content.substring(0, 200)}`,
            runId,
            actualSessionId,
            startTime
          );
        }
      }

      // 8. Validate envelope with Eye's validator
      if ((envelope as any)?.next === undefined && (envelope as any)?.next_action !== undefined) {
        (envelope as any).next = (envelope as any).next_action;
      }

      if (!eye.validate(envelope)) {
        console.error(`❌ ${eyeName} validation failed. Envelope:`, JSON.stringify(envelope, null, 2));
        return this.createErrorEnvelope(
          eyeName,
          `LLM response does not match Eye's envelope schema`,
          runId,
          actualSessionId,
          startTime
        );
      }

      // 9. Record successful completion in order guard
      orderGuard.recordEyeCompletion(actualSessionId, eyeName, {
        code: envelope.code,
        metadata: envelope.data,
      });

      // 10. Persist run
      await this.persistRun({
        id: runId,
        sessionId: actualSessionId,
        eye: eyeName,
        provider: providerType,
        model: routing.primaryModel,
        inputMd: input,
        outputJson: envelope,
        tokensIn: completion.usage.prompt_tokens ?? 0,
        tokensOut: completion.usage.completion_tokens ?? 0,
        latencyMs,
        createdAt: new Date(),
      });

      // Emit completed event
      if (ws && sessionId) {
        // Broadcast eye_update (backward compatibility)
        ws.broadcastToSession(sessionId, {
          type: 'eye_update',
          sessionId,
          data: {
            runId,
            eye: eyeName,
            status: 'completed',
            envelope,
            metrics: {
              tokensIn: completion.usage.prompt_tokens ?? 0,
              tokensOut: completion.usage.completion_tokens ?? 0,
              latencyMs,
              provider: providerType,
              model: routing.primaryModel
            },
            timestamp: Date.now()
          },
          timestamp: Date.now()
        });

        // Also broadcast pipeline_event (for Monitor page)
        ws.broadcastToSession(sessionId, {
          type: 'pipeline_event',
          sessionId,
          data: {
            runId,
            eye: eyeName,
            status: 'completed',
            code: envelope.code,
            md: envelope.md,
            ...envelope,
            metrics: {
              tokensIn: completion.usage.prompt_tokens ?? 0,
              tokensOut: completion.usage.completion_tokens ?? 0,
              latencyMs,
              provider: providerType,
              model: routing.primaryModel
            },
            timestamp: Date.now()
          },
          timestamp: Date.now()
        });
      }

      return envelope;

    } catch (error) {
      const errorMessage = `AI execution error: ${error instanceof Error ? error.message : 'Unknown error'}`;

      const ws = getWebSocketBridge();
      if (ws && sessionId) {
        // Broadcast eye_update (backward compatibility)
        ws.broadcastToSession(sessionId, {
          type: 'eye_update',
          sessionId,
          data: {
            runId,
            eye: eyeName,
            status: 'error',
            error: errorMessage,
            timestamp: Date.now()
          },
          timestamp: Date.now()
        });

        // Also broadcast pipeline_event (for Monitor page)
        ws.broadcastToSession(sessionId, {
          type: 'pipeline_event',
          sessionId,
          data: {
            runId,
            eye: eyeName,
            status: 'error',
            error: errorMessage,
            timestamp: Date.now()
          },
          timestamp: Date.now()
        });
      }

      return this.createErrorEnvelope(
        eyeName,
        errorMessage,
        runId,
        actualSessionId,
        startTime
      );
    }
  }

  /**
   * Run complete pipeline (all Eyes in sequence)
   */
  async runPipeline(
    input: string,
    eyeNames: EyeName[],
    sessionId?: string
  ): Promise<EyeResponse[]> {
    const results: EyeResponse[] = [];

    for (const eyeName of eyeNames) {
      const result = await this.runEye(eyeName, input, sessionId);
      results.push(result);

      // Stop pipeline if Eye rejected
      if (isRejectedResponse(result)) {
        break;
      }
    }

    return results;
  }

  /**
   * Get routing configuration for an Eye
   */
  private async getEyeRouting(eye: string): Promise<typeof eyesRouting.$inferSelect | null> {
    const result = await this.db
      .select()
      .from(eyesRouting)
      .where(eq(eyesRouting.eye, eye))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get provider API key
   */
  private async getProviderCredentials(provider: ProviderType): Promise<ProviderCredentials | null> {
    const result = await this.db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.provider, provider))
      .limit(1);

    const row = result[0];
    if (!row) {
      return null;
    }

    const encrypted = row.encryptedKey;
    const apiKey = encrypted instanceof Uint8Array ? decryptFromStorage(Buffer.from(encrypted)) : null;

    const metadata = row.metadata;
    let baseUrl: string | undefined;

    if (typeof metadata === 'string') {
      try {
        const parsed = JSON.parse(metadata);
        if (parsed && typeof parsed.baseUrl === 'string') {
          baseUrl = parsed.baseUrl;
        }
      } catch (error) {
        console.warn('Failed to parse provider metadata JSON', error);
      }
    } else if (hasBaseUrl(metadata)) {
      const candidate = metadata.baseUrl;
      if (typeof candidate === 'string') {
        baseUrl = candidate;
      }
    }

    return { apiKey, baseUrl };
  }

  /**
   * Create order violation envelope
   * GOLDEN RULE #1: Never expose Eye names to agents - wrap in generic message
   */
  private async createOrderViolationEnvelope(
    eye: string,
    violation: OrderViolation,
    runId: string,
    sessionId: string,
    startTime: number
  ): Promise<EyeResponse> {
    // Log server-side only (for debugging)
    console.error(`[ORDER GUARD] Violation in session ${sessionId}:`, {
      attemptedEye: eye,
      violation: violation.violation,
      expectedNext: violation.expectedNext,
      fixInstructions: violation.fixInstructions,
    });

    // Generic agent-friendly message (no Eye names exposed)
    const agentMarkdown = [
      '### Your request needs more context',
      '',
      'The system detected that your request requires additional information before it can be processed.',
      '',
      '**What to do next:**',
      'Please provide more details about what you want to accomplish, or try rephrasing your request.',
      '',
      'Tip: Start with a clear description of your task, and the system will automatically route it through the correct processing pipeline.',
    ].join('\n');

    const envelope: EyeResponse = {
      tag: 'overseer', // Always return as overseer (not internal Eye name)
      ok: false,
      code: 'NEED_MORE_CONTEXT',
      md: agentMarkdown,
      data: {
        hint: 'Try providing a more complete task description',
        suggestion: 'Use the overseer tool with a freeform task description',
      },
      next_action: 'AWAIT_INPUT',
      next: 'overseer',
    };

    // Persist violation run with internal details (server-side only)
    await this.persistRun({
      id: runId,
      sessionId,
      eye,
      provider: 'order-guard',
      model: 'validation',
      inputMd: `[INTERNAL] ${violation.violation} | Expected: ${violation.expectedNext.join(', ')}`,
      outputJson: envelope,
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: Date.now() - startTime,
      createdAt: new Date(),
    });

    return envelope;
  }

  /**
   * Create error envelope
   */
  private async createErrorEnvelope(
    eye: string,
    message: string,
    runId: string,
    sessionId: string,
    startTime: number
  ): Promise<EyeResponse> {
    const envelope: EyeResponse = {
      tag: eye,
      ok: false,
      code: 'EYE_ERROR',
      md: `### Eye Execution Error\n${message}`,
      data: {
        message,
      },
      next_action: 'AWAIT_INPUT',
      next: 'AWAIT_INPUT',
    };

    // Persist error run
    await this.persistRun({
      id: runId,
      sessionId,
      eye,
      provider: 'error',
      model: 'error',
      inputMd: message,
      outputJson: envelope,
      tokensIn: 0,
      tokensOut: 0,
      latencyMs: Date.now() - startTime,
      createdAt: new Date(),
    });

    return envelope;
  }

  private resolveProviderType(value: string | null): ProviderType | null {
    if (!isSupportedProvider(value)) {
      return null;
    }
    return value;
  }

  /**
   * Persist run to database
   */
  private async persistRun(run: typeof runs.$inferInsert) {
    try {
      await this.db.insert(runs).values(run);
    } catch (error) {
      console.error('Failed to persist run:', error);
    }
  }

  /**
   * Create a new session
   */
  async createSession(config: SessionBootstrapConfig = {}): Promise<{ sessionId: string; portalUrl: string }> {
    const sessionId = nanoid();

    await this.db.insert(sessions).values({
      id: sessionId,
      createdAt: new Date(),
      status: 'active',
      configJson: config,
      agentName: config.agentName || 'Unknown Agent',
      model: config.model || null,
      displayName: config.displayName || null,
    });

    // Build portal URL
    const host = process.env.SERVER_HOST || '127.0.0.1';
    const uiPort = parseInt(process.env.UI_PORT || '3300', 10);
    const portalUrl = `http://${host}:${uiPort}/monitor?session=${sessionId}`;

    // Emit session created event
    const ws = getWebSocketBridge();
    if (ws) {
      ws.broadcastToSession(sessionId, {
        type: 'session_update',
        sessionId,
        data: {
          action: 'created',
          sessionId,
          portalUrl,
          config,
          timestamp: Date.now()
        },
        timestamp: Date.now()
      });
    }

    return { sessionId, portalUrl };
  }

  /**
   * Get session runs with pagination
   */
  async getSessionRuns(sessionId: string, limit = 50, offset = 0) {
    return await this.db
      .select()
      .from(runs)
      .where(eq(runs.sessionId, sessionId))
      .orderBy(desc(runs.createdAt))
      .limit(limit)
      .offset(offset);
  }
}
