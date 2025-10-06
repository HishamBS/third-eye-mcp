import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { runs, sessions, personas, eyesRouting, providerKeys } from '@third-eye/db';
import { ProviderFactory, type ProviderType } from '@third-eye/providers';
import { getEye, type EyeName, type BaseEnvelope } from '@third-eye/eyes';
import { eq, and, desc } from 'drizzle-orm';

// Import WebSocket manager for real-time events
type WSManager = {
  broadcastToSession: (sessionId: string, message: any) => void;
};

let wsManager: WSManager | null = null;

// Lazy load WebSocket manager to avoid circular imports
const getWSManager = async (): Promise<WSManager | null> => {
  if (!wsManager) {
    try {
      const { wsManager: manager } = await import('../../apps/server/src/websocket');
      wsManager = manager;
    } catch (error) {
      console.debug('WebSocket manager not available:', error);
      return null;
    }
  }
  return wsManager;
};

/**
 * Eye Orchestrator
 *
 * Core orchestration engine for routing Eyes to providers and managing execution
 */
export class EyeOrchestrator {
  private db;

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
  ): Promise<BaseEnvelope> {
    const startTime = Date.now();
    const runId = nanoid();
    const actualSessionId = sessionId || nanoid();

    // Emit run started event
    const ws = await getWSManager();
    if (ws && sessionId) {
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
    }

    try {
      // 1. Get Eye implementation to access persona
      const eye = getEye(eyeName as EyeName);
      if (!eye) {
        return this.createErrorEnvelope(
          eyeName,
          `Eye not found: ${eyeName}`,
          runId,
          actualSessionId,
          startTime
        );
      }

      // 2. Load routing configuration
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

      // 3. Get provider API key
      const providerKey = await this.getProviderKey(routing.primaryProvider);
      if (!providerKey && routing.primaryProvider !== 'ollama' && routing.primaryProvider !== 'lmstudio') {
        return this.createErrorEnvelope(
          eyeName,
          `No API key configured for provider: ${routing.primaryProvider}. Add key via UI Settings or .env file.`,
          runId,
          actualSessionId,
          startTime
        );
      }

      // 4. Create provider instance
      const provider = ProviderFactory.createProvider(routing.primaryProvider as ProviderType, {
        apiKey: providerKey?.keyValue,
        baseUrl: providerKey?.baseUrl || undefined,
      });

      // 5. Call provider with Eye's persona as system prompt
      const persona = eye.getPersona();
      const response = await provider.complete({
        model: routing.primaryModel,
        messages: [
          { role: 'system', content: persona },
          { role: 'user', content: input }
        ],
        temperature: routing.temperature || 0.7,
        maxTokens: routing.maxTokens || 4096,
      });

      const latencyMs = Date.now() - startTime;

      // 6. Parse response as envelope
      let envelope: BaseEnvelope;
      try {
        envelope = JSON.parse(response.text);
      } catch (parseError) {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = response.text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
        if (jsonMatch) {
          envelope = JSON.parse(jsonMatch[1]);
        } else {
          // Response is not valid envelope, create error
          return this.createErrorEnvelope(
            eyeName,
            `LLM response is not valid JSON envelope: ${response.text.substring(0, 200)}`,
            runId,
            actualSessionId,
            startTime
          );
        }
      }

      // 7. Validate envelope with Eye's validator
      if (!eye.validate(envelope)) {
        return this.createErrorEnvelope(
          eyeName,
          `LLM response does not match Eye's envelope schema`,
          runId,
          actualSessionId,
          startTime
        );
      }

      // 8. Persist run
      await this.persistRun({
        id: runId,
        sessionId: actualSessionId,
        eye: eyeName,
        provider: routing.primaryProvider,
        model: routing.primaryModel,
        inputMd: input,
        outputJson: envelope,
        tokensIn: response.usage?.promptTokens || 0,
        tokensOut: response.usage?.completionTokens || 0,
        latencyMs,
        createdAt: new Date(),
      });

      // Emit completed event
      if (ws && sessionId) {
        ws.broadcastToSession(sessionId, {
          type: 'eye_update',
          sessionId,
          data: {
            runId,
            eye: eyeName,
            status: 'completed',
            envelope,
            metrics: {
              tokensIn: response.usage?.promptTokens || 0,
              tokensOut: response.usage?.completionTokens || 0,
              latencyMs,
              provider: routing.primaryProvider,
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

      const ws = await getWSManager();
      if (ws && sessionId) {
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
  ): Promise<BaseEnvelope[]> {
    const results: BaseEnvelope[] = [];

    for (const eyeName of eyeNames) {
      const result = await this.runEye(eyeName, input, sessionId);
      results.push(result);

      // Stop pipeline if Eye rejected
      if (result.verdict === 'REJECTED') {
        break;
      }
    }

    return results;
  }

  /**
   * Get routing configuration for an Eye
   */
  private async getEyeRouting(eye: string) {
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
  private async getProviderKey(provider: string) {
    const result = await this.db
      .select()
      .from(providerKeys)
      .where(eq(providerKeys.provider, provider))
      .limit(1);

    return result[0] || null;
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
  ): Promise<BaseEnvelope> {
    const envelope: BaseEnvelope = {
      eye,
      code: 'EYE_ERROR',
      verdict: 'NEEDS_INPUT',
      summary: message,
      details: `Error occurred during execution: ${message}`,
      confidence: 0,
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

  /**
   * Persist run to database
   */
  private async persistRun(run: any) {
    try {
      await this.db.insert(runs).values(run);
    } catch (error) {
      console.error('Failed to persist run:', error);
    }
  }

  /**
   * Create a new session
   */
  async createSession(config: any = {}): Promise<{ sessionId: string; portalUrl: string }> {
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
    const ws = await getWSManager();
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
