export interface WebSocketBridge {
    broadcastToSession: (sessionId: string, message: unknown) => void;
}
export declare function registerWebSocketBridge(instance: WebSocketBridge): void;
export declare function clearWebSocketBridge(): void;
export declare function getWebSocketBridge(): WebSocketBridge | null;
//# sourceMappingURL=websocket-registry.d.ts.map