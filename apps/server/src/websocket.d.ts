import type { ServerWebSocket } from 'bun';
type IntervalHandle = ReturnType<typeof setInterval>;
type TimeoutHandle = ReturnType<typeof setTimeout>;
interface WebSocketHandler {
    fetch: (req: Request, server: {
        upgrade: (req: Request, options: {
            data: {
                sessionId: string;
                userId?: string;
            };
        }) => boolean;
    }) => Response | undefined;
    websocket: {
        open: (ws: ServerWebSocket<{
            sessionId: string;
            userId?: string;
        }>) => void;
        message: (ws: ServerWebSocket<{
            sessionId: string;
            userId?: string;
        }>, message: string | ArrayBufferLike | ArrayBufferView) => void;
        close: (ws: ServerWebSocket<{
            sessionId: string;
            userId?: string;
        }>) => void;
        error: (ws: ServerWebSocket<{
            sessionId: string;
            userId?: string;
        }>, error: Error) => void;
    };
}
export interface WSMessage {
    type: 'session_update' | 'run_started' | 'run_completed' | 'error' | 'ping' | 'pong' | 'routing_updated' | 'routing_deleted' | 'persona_activated' | 'session_created' | 'pipeline_event';
    sessionId?: string;
    data?: any;
    timestamp: number;
}
export interface ConnectionInfo {
    ws: ServerWebSocket<{
        sessionId: string;
        userId?: string;
    }>;
    sessionId: string;
    userId?: string;
    connectedAt: number;
    lastPong?: number;
    pingInterval?: IntervalHandle;
    pongTimeout?: TimeoutHandle;
}
/**
 * WebSocket Connection Manager
 *
 * Manages real-time connections for session monitoring
 */
export declare class WSConnectionManager {
    private connections;
    private sessionConnections;
    /**
     * Register new WebSocket connection
     */
    addConnection(connectionId: string, ws: ServerWebSocket<{
        sessionId: string;
        userId?: string;
    }>, sessionId: string, userId?: string): void;
    /**
     * Remove WebSocket connection
     */
    removeConnection(connectionId: string): void;
    /**
     * Broadcast message to all connections for a session
     */
    broadcastToSession(sessionId: string, message: WSMessage): void;
    /**
     * Broadcast to all connections
     */
    broadcast(message: any): void;
    /**
     * Broadcast to all connections (alias)
     */
    broadcastToAll(message: WSMessage): void;
    /**
     * Get connection stats
     */
    getStats(): {
        totalConnections: number;
        activeSessions: number;
        sessionBreakdown: {
            sessionId: string;
            connectionCount: number;
        }[];
    };
    /**
     * Cleanup stale connections (optional heartbeat)
     */
    cleanup(): void;
}
export declare const wsManager: WSConnectionManager;
/**
 * WebSocket upgrade handler for Bun
 */
export declare function createWebSocketHandler(): WebSocketHandler;
export {};
//# sourceMappingURL=websocket.d.ts.map