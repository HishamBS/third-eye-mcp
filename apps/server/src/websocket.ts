import type { ServerWebSocket } from 'bun';

export interface WSMessage {
  type: 'session_update' | 'run_started' | 'run_completed' | 'error' | 'ping' | 'pong' | 'routing_updated' | 'routing_deleted' | 'persona_activated' | 'session_created' | 'pipeline_event';
  sessionId?: string;
  data?: any;
  timestamp: number;
}

export interface ConnectionInfo {
  ws: ServerWebSocket<{ sessionId: string; userId?: string }>;
  sessionId: string;
  userId?: string;
  connectedAt: number;
  lastPong?: number;
  pingInterval?: Timer;
  pongTimeout?: Timer;
}

/**
 * WebSocket Connection Manager
 *
 * Manages real-time connections for session monitoring
 */
export class WSConnectionManager {
  private connections = new Map<string, ConnectionInfo>();
  private sessionConnections = new Map<string, Set<string>>();

  /**
   * Register new WebSocket connection
   */
  addConnection(connectionId: string, ws: ServerWebSocket<{ sessionId: string; userId?: string }>, sessionId: string, userId?: string) {
    const connection: ConnectionInfo = {
      ws,
      sessionId,
      userId,
      connectedAt: Date.now(),
      lastPong: Date.now()
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
          console.log(`❌ No pong received from ${connectionId}, closing connection`);
          this.removeConnection(connectionId);
          ws.close();
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
      }))
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

/**
 * WebSocket upgrade handler for Bun
 */
export function createWebSocketHandler() {
  return {
    fetch(req: Request, server: any) {
      const url = new URL(req.url);

      if (url.pathname === '/ws/monitor') {
        const sessionId = url.searchParams.get('sessionId');

        if (!sessionId) {
          return new Response('Missing sessionId parameter', { status: 400 });
        }

        const success = server.upgrade(req, {
          data: { sessionId }
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

      message(ws: ServerWebSocket<{ sessionId: string; userId?: string }>, message: string | Buffer) {
        try {
          const data = JSON.parse(message.toString()) as WSMessage;

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