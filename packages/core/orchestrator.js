import { nanoid } from 'nanoid';
import { getDb } from '@third-eye/db';
import { runs, sessions, eyesRouting, providerKeys } from '@third-eye/db';
import { ProviderFactory } from '@third-eye/providers';
import { getEye } from '@third-eye/eyes';
import { eq, desc } from 'drizzle-orm';
import { orderGuard } from './order-guard';
let wsManager = null;
// Lazy load WebSocket manager to avoid circular imports
const getWSManager = async () => {
    if (!wsManager) {
        try {
            // Try to load from apps/server first
            const { wsManager: manager } = await import('../../apps/server/src/websocket');
            wsManager = manager;
        }
        catch (error) {
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
    db;
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
    async runEye(eyeName, input, sessionId) {
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
            // 1. Validate pipeline order
            const orderViolation = orderGuard.validateOrder(actualSessionId, eyeName);
            if (orderViolation) {
                return this.createOrderViolationEnvelope(eyeName, orderViolation, runId, actualSessionId, startTime);
            }
            // 2. Get Eye implementation to access persona
            const eye = getEye(eyeName);
            if (!eye) {
                return this.createErrorEnvelope(eyeName, `Eye not found: ${eyeName}`, runId, actualSessionId, startTime);
            }
            // 3. Load routing configuration
            const routing = await this.getEyeRouting(eyeName);
            if (!routing || !routing.primaryProvider || !routing.primaryModel) {
                return this.createErrorEnvelope(eyeName, `No routing configuration found for Eye: ${eyeName}. Run migration 0004 to seed routing.`, runId, actualSessionId, startTime);
            }
            // 4. Get provider API key
            const providerKey = await this.getProviderKey(routing.primaryProvider);
            if (!providerKey && routing.primaryProvider !== 'ollama' && routing.primaryProvider !== 'lmstudio') {
                return this.createErrorEnvelope(eyeName, `No API key configured for provider: ${routing.primaryProvider}. Add key via UI Settings or .env file.`, runId, actualSessionId, startTime);
            }
            // 5. Create provider instance
            const provider = ProviderFactory.create(routing.primaryProvider, {
                apiKey: providerKey?.keyValue,
                baseUrl: providerKey?.baseUrl || undefined,
            });
            // 6. Call provider with Eye's persona as system prompt
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
            // 7. Parse response as envelope
            let envelope;
            try {
                envelope = JSON.parse(response.text);
            }
            catch (parseError) {
                // Try to extract JSON from markdown code blocks
                const jsonMatch = response.text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
                if (jsonMatch) {
                    envelope = JSON.parse(jsonMatch[1]);
                }
                else {
                    // Response is not valid envelope, create error
                    return this.createErrorEnvelope(eyeName, `LLM response is not valid JSON envelope: ${response.text.substring(0, 200)}`, runId, actualSessionId, startTime);
                }
            }
            // 8. Validate envelope with Eye's validator
            if (!eye.validate(envelope)) {
                return this.createErrorEnvelope(eyeName, `LLM response does not match Eye's envelope schema`, runId, actualSessionId, startTime);
            }
            // 9. Record successful completion in order guard
            orderGuard.recordEyeCompletion(actualSessionId, eyeName, envelope);
            // 10. Persist run
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
        }
        catch (error) {
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
            return this.createErrorEnvelope(eyeName, errorMessage, runId, actualSessionId, startTime);
        }
    }
    /**
     * Run complete pipeline (all Eyes in sequence)
     */
    async runPipeline(input, eyeNames, sessionId) {
        const results = [];
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
    async getEyeRouting(eye) {
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
    async getProviderKey(provider) {
        const result = await this.db
            .select()
            .from(providerKeys)
            .where(eq(providerKeys.provider, provider))
            .limit(1);
        return result[0] || null;
    }
    /**
     * Create order violation envelope
     */
    async createOrderViolationEnvelope(eye, violation, runId, sessionId, startTime) {
        const envelope = {
            eye,
            code: violation.code,
            verdict: 'NEEDS_INPUT',
            summary: violation.violation,
            details: `${violation.fixInstructions}\n\nExpected next Eyes: ${violation.expectedNext.join(', ')}`,
            confidence: 100,
        };
        // Persist violation run
        await this.persistRun({
            id: runId,
            sessionId,
            eye,
            provider: 'order-guard',
            model: 'validation',
            inputMd: violation.violation,
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
    async createErrorEnvelope(eye, message, runId, sessionId, startTime) {
        const envelope = {
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
    async persistRun(run) {
        try {
            await this.db.insert(runs).values(run);
        }
        catch (error) {
            console.error('Failed to persist run:', error);
        }
    }
    /**
     * Create a new session
     */
    async createSession(config = {}) {
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
    async getSessionRuns(sessionId, limit = 50, offset = 0) {
        return await this.db
            .select()
            .from(runs)
            .where(eq(runs.sessionId, sessionId))
            .orderBy(desc(runs.createdAt))
            .limit(limit)
            .offset(offset);
    }
}
//# sourceMappingURL=orchestrator.js.map