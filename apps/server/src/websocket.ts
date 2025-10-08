import type { ServerWebSocket } from 'bun';
import { registerWebSocketBridge } from '@third-eye/core';

type IntervalHandle = ReturnType<typeof setInterval>;
type TimeoutHandle = ReturnType<typeof setTimeout>;

interface WebSocketHandler {
  fetch: (req: Request, server: { upgrade: (req: Request, options: { data: { sessionId: string; userId?: string } }) => boolean }) => Response | undefined;
  websocket: {
    open: (ws: ServerWebSocket<{ sessionId: string; userId?: string }>) => void;
    message: (ws: ServerWebSocket<{ sessionId: string; userId?: string }>, message: string | ArrayBufferLike | ArrayBufferView) => void;
    close: (ws: ServerWebSocket<{ sessionId: string; userId?: string }>) => void;
    error: (ws: ServerWebSocket<{ sessionId: string; userId?: string }>, error: Error) => void;
  };
}

const textDecoder = new TextDecoder();

function decodeMessage(input: string | ArrayBufferLike | ArrayBufferView): string {
  if (typeof input === 'string') {
    return input;
  }

  if (ArrayBuffer.isView(input)) {
    const bytes = new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    return textDecoder.decode(bytes);
  }

  const bytes = new Uint8Array(input);
  return textDecoder.decode(bytes);
}

export interface WSMessage {
  type: 'session_update' | 'run_started' | 'run_completed' | 'error' | 'ping' | 'pong' | 'routing_updated' | 'routing_deleted' | 'persona_activated' | 'session_created' | 'pipeline_event';
  sessionId?: string;
  data?: unknown;
  timestamp: number;
}

export interface ConnectionInfo {
  ws: ServerWebSocket<{ sessionId: string; userId?: string }>;
  sessionId: string;
  userId?: string;
  connectedAt: number;
  lastPong?: number;
  pingInterval?: IntervalHandle;
  pongTimeout?: TimeoutHandle;
  retryAttempt?: number;
}

/**
 * WebSocket Connection Manager
 *
 * Manages real-time connections for session monitoring
 */
export class WSConnectionManager {
  private connections = new Map<string, ConnectionInfo>();
  private sessionConnections = new Map<string, Set<string>>();
  private static readonly RETRY_BACKOFF_MS = [
    1000,
    2000,
    4000,
    8000,
    12000,
    16000,
    20000,
    24000,
  ] as const;

  /**
   * Register new WebSocket connection
   */
  addConnection(connectionId: string, ws: ServerWebSocket<{ sessionId: string; userId?: string }>, sessionId: string, userId?: string) {
    const connection: ConnectionInfo = {
      ws,
      sessionId,
      userId,
      connectedAt: Date.now(),
      lastPong: Date.now(),
      retryAttempt: 0,
    };

    this.connections.set(connectionId, connection);

    // Track by session
    if (!this.sessionConnections.has(sessionId)) {
      this.sessionConnections.set(sessionId, new Set());
    }
    this.sessionConnections.get(sessionId)!.add(connectionId);

    // Start heartbeat ping interval (every 30 seconds)
    connection.pingInterval = setInterval(() => {
      try {
        const pingMessage: WSMessage = {
          type: 'ping',
          timestamp: Date.now()
        };
        ws.send(JSON.stringify(pingMessage));

        // Set timeout to close if no pong received within 10 seconds
        connection.pongTimeout = setTimeout(() => {
          const attempt = (connection.retryAttempt ?? 0) + 1;
          connection.retryAttempt = attempt;
          const backoff = WSConnectionManager.RETRY_BACKOFF_MS[Math.min(attempt - 1, WSConnectionManager.RETRY_BACKOFF_MS.length - 1)];
          const jitter = Math.floor(Math.random() * 500);
          const retryInMs = backoff + jitter;

          console.log(`❌ No pong received from ${connectionId}, closing connection (retry in ${retryInMs}ms)`);

          try {
            const retryMessage: WSMessage = {
              type: 'error',
              sessionId: connection.sessionId,
              data: {
                reason: 'heartbeat_timeout',
                retry_in_ms: retryInMs,
                attempt,
              },
              timestamp: Date.now(),
            };
            ws.send(JSON.stringify(retryMessage));
          } catch (sendError) {
            console.error(`Failed to send retry hint for ${connectionId}:`, sendError);
          }

          try {
            ws.close(4000, `retry=${retryInMs}`);
          } catch (closeError) {
            console.error(`Failed to close WebSocket ${connectionId}:`, closeError);
          }

          this.removeConnection(connectionId);
        }, 10000);
      } catch (error) {
        console.error(`Failed to send ping to ${connectionId}:`, error);
        this.removeConnection(connectionId);
      }
    }, 30000);

    console.log(`📡 WebSocket connected: ${connectionId} → session:${sessionId}`);
  }

  /**
   * Remove WebSocket connection
   */
  removeConnection(connectionId: string) {
    const connection = this.connections.get(connectionId);
    if (!connection) return;

    // Clear heartbeat timers
    if (connection.pingInterval) {
      clearInterval(connection.pingInterval);
    }
    if (connection.pongTimeout) {
      clearTimeout(connection.pongTimeout);
    }

    // Remove from session tracking
    const sessionConnections = this.sessionConnections.get(connection.sessionId);
    if (sessionConnections) {
      sessionConnections.delete(connectionId);
      if (sessionConnections.size === 0) {
        this.sessionConnections.delete(connection.sessionId);
      }
    }

    this.connections.delete(connectionId);
    console.log(`📡 WebSocket disconnected: ${connectionId}`);
  }

  /**
   * Broadcast message to all connections for a session
   */
  broadcastToSession(sessionId: string, message: WSMessage) {
    const connectionIds = this.sessionConnections.get(sessionId);
    if (!connectionIds) return;

    const messageStr = JSON.stringify(message);
    let sentCount = 0;

    for (const connectionId of connectionIds) {
      const connection = this.connections.get(connectionId);
      if (connection) {
        try {
          connection.ws.send(messageStr);
          sentCount++;
        } catch (error) {
          console.error(`Failed to send message to connection ${connectionId}:`, error);
          // Connection might be dead, remove it
          this.removeConnection(connectionId);
        }
      }
    }

    if (sentCount > 0) {
      console.log(`📡 Broadcasted ${message.type} to ${sentCount} connections for session:${sessionId}`);
    }
  }

  /**
   * Broadcast to all connections
   */
  broadcast(message: any) {
    const wsMessage: WSMessage = {
      ...message,
      timestamp: message.timestamp || Date.now()
    };

    const messageStr = JSON.stringify(wsMessage);
    let sentCount = 0;

    for (const [connectionId, connection] of this.connections) {
      try {
        connection.ws.send(messageStr);
        sentCount++;
      } catch (error) {
        console.error(`Failed to send message to connection ${connectionId}:`, error);
        this.removeConnection(connectionId);
      }
    }

    if (sentCount > 0) {
      console.log(`📡 Broadcasted ${wsMessage.type} to ${sentCount} total connections`);
    }
  }

  /**
   * Broadcast to all connections (alias)
   */
  broadcastToAll(message: WSMessage) {
    this.broadcast(message);
  }

  /**
   * Get connection stats
   */
  getStats() {
    return {
      totalConnections: this.connections.size,
      activeSessions: this.sessionConnections.size,
      sessionBreakdown: Array.from(this.sessionConnections.entries()).map(([sessionId, connections]) => ({
        sessionId,
        connectionCount: connections.size
      })),
      recommendedRetryDelaysMs: Array.from(WSConnectionManager.RETRY_BACKOFF_MS),
    };
  }

  /**
   * Cleanup stale connections (optional heartbeat)
   */
  cleanup() {
    const now = Date.now();
    const staleThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [connectionId, connection] of this.connections) {
      if (now - connection.connectedAt > staleThreshold) {
        console.log(`🧹 Cleaning up stale connection: ${connectionId}`);
        this.removeConnection(connectionId);
      }
    }
  }
}

// Global connection manager instance
export const wsManager = new WSConnectionManager();
registerWebSocketBridge(wsManager);

/**
 * WebSocket upgrade handler for Bun
 */
export function createWebSocketHandler(): WebSocketHandler {
  return {
    fetch(
      req: Request,
      server: Parameters<WebSocketHandler['fetch']>[1]
    ) {
      const url = new URL(req.url);

      if (url.pathname === '/ws/monitor') {
        const sessionId = url.searchParams.get('sessionId');

        // Allow connections without sessionId - they'll receive global broadcasts
        // This enables the Monitor page to connect before a session is selected
        const success = server.upgrade(req, {
          data: { sessionId: sessionId || 'global' }
        });

        if (success) {
          return undefined; // Upgrade successful
        }

        return new Response('WebSocket upgrade failed', { status: 400 });
      }

      return new Response('Not found', { status: 404 });
    },

    websocket: {
      open(ws: ServerWebSocket<{ sessionId: string; userId?: string }>) {
        const connectionId = crypto.randomUUID();
        const { sessionId, userId } = ws.data;

        wsManager.addConnection(connectionId, ws, sessionId, userId);

        // Send welcome message
        const welcomeMessage: WSMessage = {
          type: 'session_update',
          sessionId,
          data: { message: 'Connected to session monitor', connectionId },
          timestamp: Date.now()
        };

        ws.send(JSON.stringify(welcomeMessage));
      },

      message(
        ws: ServerWebSocket<{ sessionId: string; userId?: string }>,
        message: string | ArrayBufferLike | ArrayBufferView
      ) {
        try {
          const data = JSON.parse(decodeMessage(message)) as WSMessage;

          // Handle ping/pong for connection health
          if (data.type === 'ping') {
            const pongMessage: WSMessage = {
              type: 'pong',
              timestamp: Date.now()
            };
            ws.send(JSON.stringify(pongMessage));
          } else if (data.type === 'pong') {
            // Client responded to our ping, clear the pong timeout
            for (const [connectionId, connection] of wsManager['connections']) {
              if (connection.ws === ws) {
                connection.lastPong = Date.now();
                if (connection.pongTimeout) {
                  clearTimeout(connection.pongTimeout);
                  connection.pongTimeout = undefined;
                }
                connection.retryAttempt = 0;
                break;
              }
            }
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      },

      close(ws: ServerWebSocket<{ sessionId: string; userId?: string }>) {
        // Find and remove connection
        for (const [connectionId, connection] of wsManager['connections']) {
          if (connection.ws === ws) {
            wsManager.removeConnection(connectionId);
            break;
          }
        }
      },

      error(ws: ServerWebSocket<{ sessionId: string; userId?: string }>, error: Error) {
        console.error('WebSocket error:', error);

        // Find and remove connection
        for (const [connectionId, connection] of wsManager['connections']) {
          if (connection.ws === ws) {
            wsManager.removeConnection(connectionId);
            break;
          }
        }
      }
    }
  };
}
