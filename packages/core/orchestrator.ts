import { Buffer } from 'node:buffer';
import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { runs, sessions, personas, eyesRouting, providerKeys, providerFailovers } from '@third-eye/db';
import { ProviderFactory, type CompletionResponse } from '@third-eye/providers';
import type { ProviderType } from '@third-eye/providers';
import { getEye, getAllEyeNames, type EyeName, type EyeResponse, type BaseEnvelope, type PersonaPrompt } from '@third-eye/eyes';
import { PROVIDERS } from '@third-eye/types';
import { eq, and, desc } from 'drizzle-orm';
import { orderGuard, type OrderViolation } from './order-guard';
import { getWebSocketBridge } from './websocket-registry';
import { decryptFromStorage } from './encryption';
import { ensureEyeBehavior, EyeBehaviorError } from './persona-guards';
import { renderPersonaPrompt, getPersonaBlueprint } from '@third-eye/eyes';
import { getStageTemplate } from '@third-eye/constants';
import { EyeStageToken } from '@third-eye/constants';
import { capabilityProgress } from './capability-progress';
import { retryWithThrow } from './provider-retry';
import { RETRY_CONFIG, FALLBACK_CONFIG, FALLBACK_EVENT_TYPE, categorizeRetryReason } from '@third-eye/constants';

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

interface EyeRunProviderOverride {
  provider: ProviderType;
  model: string;
  label?: string;
}

interface EyeRunOptions {
  providerOverride?: EyeRunProviderOverride;
  temperature?: number;
  maxTokens?: number;
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
    sessionId?: string,
    options: EyeRunOptions = {}
  ): Promise<EyeResponse> {
    const startTime = Date.now();
    const runId = nanoid();
    let actualSessionId = sessionId;

    if (!actualSessionId) {
      actualSessionId = nanoid();
      const createdAt = new Date();
      const agentLabel = 'Third Eye Pipeline';
      const displayLabel = `Manual Session (${eyeName})`;
      await this.db.insert(sessions).values({
        id: actualSessionId,
        createdAt,
        status: 'active',
        configJson: JSON.stringify({
          agentName: agentLabel,
          displayName: displayLabel,
          origin: 'orchestrator',
          firstEye: eyeName,
        }),
        agentName: agentLabel,
        model: null,
        displayName: displayLabel,
        lastActivity: createdAt,
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

      // Emit eye_started event
      try {
        const wsManager = getWebSocketBridge();
        if (wsManager && 'emitEyeStarted' in wsManager && typeof (wsManager as { emitEyeStarted?: unknown }).emitEyeStarted === 'function') {
          const eyeIcon = this.getEyeIcon(eyeName);
          (wsManager as { emitEyeStarted: (sessionId: string, eyeName: string, ui: Record<string, unknown>) => void }).emitEyeStarted(actualSessionId, eyeName, {
            title: `${eye.name} Started`,
            summary: `Analyzing request...`,
            details: `Eye ${eyeName} is processing the input`,
            icon: eyeIcon,
            color: 'info'
          });
        }
      } catch (e) {
        console.debug('WebSocket broadcast skipped:', e);
      }

      const providerOverride = options.providerOverride;

      // 3. Load routing configuration (with optional override)
      const routing = providerOverride
        ? {
            eye: eyeName,
            primaryProvider: providerOverride.provider,
            primaryModel: providerOverride.model,
            fallbackProvider: null,
            fallbackModel: null,
          }
        : await this.getEyeRouting(eyeName);

      if (!routing || !routing.primaryProvider || !routing.primaryModel) {
        return this.createErrorEnvelope(
          eyeName,
          `No routing configuration found for Eye: ${eyeName}. Run migration 0004 to seed routing.`,
          runId,
          actualSessionId,
          startTime
        );
      }

      // 4. Build provider chain (primary + fallback if configured)
      interface ProviderConfig {
        provider: string;
        model: string;
        isPrimary: boolean;
      }

      const providerChain: ProviderConfig[] = [
        {
          provider: routing.primaryProvider,
          model: routing.primaryModel,
          isPrimary: true,
        },
      ];

      // Add fallback provider if configured and fallback is enabled
      if (
        FALLBACK_CONFIG.ENABLED &&
        routing.fallbackProvider &&
        routing.fallbackModel &&
        providerChain.length < FALLBACK_CONFIG.MAX_PROVIDERS_TO_TRY
      ) {
        providerChain.push({
          provider: routing.fallbackProvider,
          model: routing.fallbackModel,
          isPrimary: false,
        });
      }

      // Track which providers we've tried
      let lastError: unknown = null;
      let providerAttemptIndex = 0;

      // 5. Build persona prompt using blueprint renderer (done once, used for all providers)
      const blueprint = getPersonaBlueprint(eyeName);
      if (!blueprint) {
        return this.createErrorEnvelope(
          eyeName,
          `No blueprint found for Eye: ${eyeName}`,
          runId,
          actualSessionId,
          startTime
        );
      }

      // Variables to hold successful results
      let envelope: BaseEnvelope | null = null;
      let completion: CompletionResponse | null = null;
      let latencyMs = 0;
      let successfulProviderType: ProviderType | null = null;
      let successfulModel: string | null = null;
      let providerLabel = '';

      // 6. **FALLBACK LOOP**: Try each provider in chain until one succeeds
      for (const providerConfig of providerChain) {
        const targetProvider = providerConfig.provider;
        const targetModel = providerConfig.model;
        const isPrimary = providerConfig.isPrimary;

        // Skip if we already succeeded
        if (envelope !== null) {
          break;
        }

        console.log(`\n🔄 Attempting ${isPrimary ? 'primary' : 'fallback'} provider: ${targetProvider}/${targetModel}`);

        try {
          // Resolve provider type
          const providerType = this.resolveProviderType(targetProvider);
          if (!providerType) {
            throw new Error(`Unsupported provider configured: ${targetProvider}`);
          }

          // Get credentials
          const providerCredentials = await this.getProviderCredentials(providerType);
          const apiKey = providerCredentials?.apiKey ?? null;
          if (!apiKey && providerType !== 'ollama' && providerType !== 'lmstudio') {
            throw new Error(`No API key configured for provider: ${providerType}`);
          }

          providerLabel = providerOverride?.label ?? providerType;

          // Create provider instance
          const provider = ProviderFactory.createProvider(providerType, {
            apiKey: apiKey ?? undefined,
            baseUrl: providerCredentials?.baseUrl,
          });

          // Determine stage based on pipeline state
          const stage = EyeStageToken.GUIDANCE; // TODO: Get actual stage from context

          // Retry loop for persona guard validation
          const MAX_PERSONA_RETRIES = RETRY_CONFIG.MAX_PERSONA_RETRIES;
          let attempt = 0;
          let enrichedInput = input;

          // **DYNAMIC ROUTING**: If this is the Overseer eye, load capabilities from DB
          let dynamicRouterPersona: string | null = null;
          if (eyeName === 'overseer') {
            try {
              const { loadDynamicCapabilities, buildRouterPersona, extractUserNeeds } = await import('./capability-loader');
              const { getDb } = await import('@third-eye/db');
              const { db } = getDb();

              const capabilityRegistry = await loadDynamicCapabilities(db);
              dynamicRouterPersona = buildRouterPersona(capabilityRegistry);

              // Enrich input with user needs analysis
              const userNeeds = extractUserNeeds(input);
              enrichedInput = `${input}\n\n[User Needs Detected: ${userNeeds.join(', ')}]`;

              console.log('[Orchestrator] Dynamic capabilities loaded for Overseer routing');
              console.log(`[Orchestrator] Capability Registry:`, Object.keys(capabilityRegistry));
            } catch (error) {
              console.error('[Orchestrator] Failed to load dynamic capabilities:', error);
              // Continue with static blueprint as fallback
            }
          }

          // Persona validation retry loop
          while (attempt < MAX_PERSONA_RETRIES) {
            attempt++;
            const attemptStartTime = Date.now();

            // Build persona prompt (may include reminder on retries)
            // Use dynamic router persona for Overseer, otherwise use blueprint
            let personaPrompt: PersonaPrompt;
            if (dynamicRouterPersona && eyeName === 'overseer') {
              personaPrompt = {
                systemPrompt: dynamicRouterPersona,
                userMessage: enrichedInput,
                config: {
                  temperature: 0,
                  top_p: 1,
                  response_format: { type: 'json_object' as const },
                },
              };
            } else {
              personaPrompt = renderPersonaPrompt(blueprint, stage, enrichedInput);
            }

            // 7. Call provider with persona as system prompt (with retry logic)
            try {
              completion = (await retryWithThrow<CompletionResponse>(
                async () => provider.complete({
                  model: targetModel,
                  messages: [
                    { role: 'system', content: personaPrompt.systemPrompt },
                    { role: 'user', content: personaPrompt.userMessage }
                  ],
                  temperature: options.temperature ?? personaPrompt.config.temperature,
                  max_tokens: options.maxTokens ?? 4096,
                  response_format: personaPrompt.config.response_format,
                }),
                {
                  context: `${providerType}/${targetModel} API call for ${eyeName} Eye`,
                  onRetry: (attemptNum, maxAttempts, delayMs, error) => {
                    console.warn(`🔄 Retrying ${eyeName} provider call (${attemptNum}/${maxAttempts}) after ${delayMs}ms`);
                  },
                }
              )) as CompletionResponse;

              latencyMs = Date.now() - attemptStartTime;

              // Log actual LLM response for debugging
              console.log(`\n📤 ${eyeName} LLM raw response (attempt ${attempt}/${MAX_PERSONA_RETRIES}):\n${completion.content}\n`);

              // 8. Parse response as envelope
              try {
                envelope = JSON.parse(completion.content);
              } catch (parseError) {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = completion.content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                if (jsonMatch) {
                  envelope = JSON.parse(jsonMatch[1]);
                } else {
                  // Response is not valid envelope
                  if (attempt < MAX_PERSONA_RETRIES) {
                    console.warn(`⚠️  ${eyeName} attempt ${attempt}/${MAX_PERSONA_RETRIES}: Invalid JSON response`);
                    enrichedInput = `${input}\n\n🔴 IMPORTANT REMINDER (Attempt ${attempt + 1}):\nYour previous response was not valid JSON. You MUST return a valid JSON object matching the envelope schema.`;
                    continue;
                  } else {
                    throw new Error(`LLM response is not valid JSON envelope after ${MAX_PERSONA_RETRIES} attempts`);
                  }
                }
              }

              // 9. Validate envelope with Eye's validator
              // Handle legacy next_action field (some Eyes may still use it)
              if (envelope && 'next' in envelope && envelope.next === undefined && 'next_action' in envelope && envelope.next_action) {
                (envelope as BaseEnvelope & { next: string | string[] }).next = envelope.next_action;
              }

              if (!eye.validate(envelope)) {
                if (attempt < MAX_PERSONA_RETRIES) {
                  console.warn(`⚠️  ${eyeName} attempt ${attempt}/${MAX_PERSONA_RETRIES}: Schema validation failed`);
                  enrichedInput = `${input}\n\n🔴 IMPORTANT REMINDER (Attempt ${attempt + 1}):\nYour previous response failed schema validation. Review the envelope schema in your prompt and ensure all required fields are present with correct types.`;
                  envelope = null;
                  continue;
                } else {
                  throw new Error(`LLM response does not match Eye's envelope schema after ${MAX_PERSONA_RETRIES} attempts`);
                }
              }

              // 10. Persona guard validation with retry logic
              const { ensureEyeBehavior, buildReminderMessage } = await import('@third-eye/eyes');
              const guardResult = ensureEyeBehavior(blueprint, envelope);

              if (!guardResult.valid) {
                console.warn(`⚠️  ${eyeName} attempt ${attempt}/${MAX_PERSONA_RETRIES}: Persona contract violated`);

                if (attempt < MAX_PERSONA_RETRIES) {
                  // Build targeted reminder from violations
                  const reminder = buildReminderMessage(guardResult.violations);
                  enrichedInput = `${input}\n\n🔴 IMPORTANT REMINDER (Attempt ${attempt + 1}):\n${reminder}`;
                  envelope = null;
                  continue;
                } else {
                  throw new Error(`Persona contract violated after ${MAX_PERSONA_RETRIES} attempts: ${guardResult.violations.map((v: { message: string }) => v.message).join('; ')}`);
                }
              }

              // Success! Break out of retry loop
              break;

            } catch (error) {
              // LLM call failed
              if (attempt < MAX_PERSONA_RETRIES) {
                console.warn(`⚠️  ${eyeName} attempt ${attempt}/${MAX_PERSONA_RETRIES}: LLM call failed:`, error);
                continue;
              } else {
                throw error;
              }
            }
          } // End of persona validation while loop

          // Successfully got valid envelope from this provider
          successfulProviderType = providerType;
          successfulModel = targetModel;
          console.log(`✅ Successfully received valid response from ${providerType}/${targetModel}`);

          // Break out of fallback loop
          break;

        } catch (providerError) {
          // This provider (after all retries) failed
          lastError = providerError;
          providerAttemptIndex++;

          const errorReason = categorizeRetryReason(providerError);
          const isLastProvider = providerAttemptIndex >= providerChain.length;

          if (isLastProvider) {
            // All providers exhausted - fail
            console.error(`❌ All ${providerChain.length} provider(s) exhausted for ${eyeName}`);
            throw providerError;
          } else {
            // Log failover event to database
            if (FALLBACK_CONFIG.LOG_FAILOVER_EVENTS && !isPrimary) {
              try {
                await this.db.insert(providerFailovers).values({
                  id: nanoid(),
                  sessionId: actualSessionId,
                  eye: eyeName,
                  primaryProvider: providerChain[0].provider,
                  primaryModel: providerChain[0].model,
                  failedReason: errorReason,
                  fallbackProvider: targetProvider,
                  fallbackModel: targetModel,
                  fallbackSuccess: false,
                  errorDetails: JSON.stringify({ error: String(providerError) }),
                  createdAt: new Date(),
                });
              } catch (dbError) {
                console.error('Failed to log failover event:', dbError);
              }
            }

            console.warn(`⚠️  Provider ${targetProvider}/${targetModel} failed. Trying next provider in chain...`);
            // Continue to next provider in chain
          }
        }
      } // End of fallback loop

      // Ensure we have a valid envelope after fallback loop
      if (!envelope || !successfulProviderType || !successfulModel || !completion) {
        return this.createErrorEnvelope(
          eyeName,
          `Failed to get valid response from any provider in chain. Last error: ${lastError}`,
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
        provider: successfulProviderType,
        model: successfulModel,
        inputMd: input,
        outputJson: envelope,
        tokensIn: completion.usage.prompt_tokens ?? 0,
        tokensOut: completion.usage.completion_tokens ?? 0,
        latencyMs,
        createdAt: new Date(),
      });

      // 11. Persist pipeline event for Monitor page
      const { pipelineEvents } = await import('@third-eye/db');

      // Extract next action (can be string or array from Overseer)
      const nextAction = envelope.next || envelope.next_action;
      const nextActionStr = Array.isArray(nextAction) ? nextAction[0] : nextAction;

      const eventData = envelope.data && typeof envelope.data === 'object'
        ? {
            ...envelope.data,
            provider: successfulProviderType,
            providerLabel,
            model: successfulModel,
          }
        : {
            provider: successfulProviderType,
            providerLabel,
            model: successfulModel,
          };

      await this.db.insert(pipelineEvents).values({
        id: nanoid(),
        sessionId: actualSessionId,
        eye: eyeName,
        type: 'eye_call',
        code: envelope.code,
        md: envelope.md,
        dataJson: eventData,
        nextAction: nextActionStr,
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
              provider: successfulProviderType,
              providerLabel,
              model: successfulModel
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
            ...envelope,
            runId,
            eye: eyeName,
            status: 'completed',
            metrics: {
              tokensIn: completion.usage.prompt_tokens ?? 0,
              tokensOut: completion.usage.completion_tokens ?? 0,
              latencyMs,
              provider: successfulProviderType,
              providerLabel,
              model: successfulModel
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
   * Get Eye icon for UI display
   */
  private getEyeIcon(eyeName: string): string {
    const iconMap: Record<string, string> = {
      overseer: '🧿',
      sharingan: '👁️',
      'kyuubi': '✨',
      jogan: '🔮',
      rinnegan: '🌀',
      mangekyo: '⚡',
      tenseigan: '💫',
      byakugan: '👀',
    };
    return iconMap[eyeName] || '👁️';
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
   * Fetch active persona from database (single source of truth)
   */
  private async getActivePersona(eyeName: string): Promise<string> {
    const { personas } = await import('@third-eye/db/schema');
    const { eq, and } = await import('drizzle-orm');

    const persona = await this.db
      .select()
      .from(personas)
      .where(and(
        eq(personas.eye, eyeName),
        eq(personas.active, true)
      ))
      .get();

    if (!persona) {
      const { seedDefaults, DEFAULT_PERSONA_MAP } = await import('@third-eye/db/defaults');
      await seedDefaults({ subsets: { personas: true }, log: () => {} });

      const fallback = DEFAULT_PERSONA_MAP[eyeName];
      if (fallback) {
        console.warn(`⚠️ No active persona found for ${eyeName}. Loaded default from persona catalog.`);
        return fallback.content;
      }

      throw new Error(
        `No active persona found for Eye: ${eyeName}. Run 'bun run scripts/seed-defaults.ts --force --only=personas' to restore defaults.`
      );
    }

    console.log(`📖 Loaded persona from database for Eye: ${eyeName} (v${persona.version})`);
    return persona.content;
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
    const portalUrl = `http://${host}:${uiPort}/monitor?sessionId=${sessionId}`;

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
