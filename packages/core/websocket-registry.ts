export interface WebSocketBridge {
  broadcastToSession: (sessionId: string, message: unknown) => void;
}

let bridge: WebSocketBridge | null = null;

export function registerWebSocketBridge(instance: WebSocketBridge): void {
  bridge = instance;
}

export function clearWebSocketBridge(): void {
  bridge = null;
}

export function getWebSocketBridge(): WebSocketBridge | null {
  return bridge;
}
