let bridge = null;
export function registerWebSocketBridge(instance) {
    bridge = instance;
}
export function clearWebSocketBridge() {
    bridge = null;
}
export function getWebSocketBridge() {
    return bridge;
}
//# sourceMappingURL=websocket-registry.js.map