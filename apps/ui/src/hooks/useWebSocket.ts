"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { WS_BASE_URL } from "@/consts/api";

export interface WSMessage {
  type: string;
  sessionId?: string;
  data?: Record<string, unknown>;
  timestamp: number;
}

export interface UseWebSocketOptions {
  sessionId?: string;
  onMessage?: (message: WSMessage) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  onClose?: () => void;
  autoReconnect?: boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const {
    sessionId,
    onMessage,
    onError,
    onOpen,
    onClose,
    autoReconnect = true,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<
    "connected" | "disconnected" | "reconnecting"
  >("disconnected");
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const missedEventsRef = useRef<WSMessage[]>([]);
  const subscribersRef = useRef<Array<(message: WSMessage) => void>>([]);
  const lastPongRef = useRef<number>(Date.now());
  const healthCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  // FIX 3: Track which sessionId we're currently connected to
  const connectedSessionIdRef = useRef<string | undefined>(undefined);

  // Configuration constants
  const MAX_RECONNECT_ATTEMPTS = 10;
  const HEALTH_CHECK_INTERVAL = 45000; // 45 seconds
  const STALE_CONNECTION_THRESHOLD = 90000; // 90 seconds without pong = stale

  const getReconnectDelay = () => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, 32s (max)
    const baseDelay = 1000;
    const maxDelay = 32000;
    const delay = Math.min(
      baseDelay * Math.pow(2, reconnectAttemptsRef.current),
      maxDelay,
    );
    // Add jitter (random ±20%) to prevent thundering herd
    const jitter = delay * (0.8 + Math.random() * 0.4);
    return Math.floor(jitter);
  };

  const connect = () => {
    // Don't reconnect if we've exceeded max attempts
    if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
      console.warn(
        `[WebSocket] Max reconnect attempts (${MAX_RECONNECT_ATTEMPTS}) reached, stopping`,
      );
      setConnectionStatus("disconnected");
      return;
    }

    // FIX 3: Check if we're already connected to the SAME session
    // If sessionId changed, we need to disconnect and reconnect
    if (
      wsRef.current?.readyState === WebSocket.OPEN ||
      wsRef.current?.readyState === WebSocket.CONNECTING
    ) {
      // Check if the sessionId actually changed
      if (connectedSessionIdRef.current === sessionId) {
        // Same session, keep the existing connection
        return;
      }
      // Different session - disconnect the old connection first
      console.log(
        `[WebSocket] Session changed from ${connectedSessionIdRef.current} to ${sessionId}, reconnecting...`,
      );
      disconnect();
    }

    // Clean up any existing connection before creating new one
    if (wsRef.current) {
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      if (wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
      }
      wsRef.current = null;
    }

    // Build WebSocket URL - ensure we always have /ws/monitor path for session monitoring
    const url = sessionId
      ? `${WS_BASE_URL}/ws/monitor?sessionId=${sessionId}`
      : `${WS_BASE_URL}/ws/monitor`;

    try {
      setConnectionStatus("reconnecting");
      console.log(`[WebSocket] Connecting to ${url}...`);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`[WebSocket] Connected to ${url}`);
        setIsConnected(true);
        setConnectionStatus("connected");
        reconnectAttemptsRef.current = 0;
        lastPongRef.current = Date.now(); // Reset pong timer on fresh connection
        // FIX 3: Track which sessionId this connection is for
        connectedSessionIdRef.current = sessionId;
        onOpen?.();

        // Clear any pending reconnect attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Replay missed events
        if (missedEventsRef.current.length > 0) {
          console.log(
            `[WebSocket] Replaying ${missedEventsRef.current.length} missed events`,
          );
          missedEventsRef.current.forEach((msg) => onMessage?.(msg));
          missedEventsRef.current = [];
        }

        // Start connection health monitoring
        startHealthCheck();

        // Start ping/pong heartbeat
        const heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping", timestamp: Date.now() }));
          }
        }, 30000);

        ws.addEventListener("close", () => {
          clearInterval(heartbeatInterval);
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          // Handle server ping - respond with pong immediately
          if (message.type === "ping") {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
            }
            return;
          }

          // Handle pong messages (responses to our client-initiated pings)
          if (message.type === "pong") {
            // Connection is alive - update last pong time
            lastPongRef.current = Date.now();
            return;
          }

          setLastMessage(message);
          onMessage?.(message);

          // Notify all subscribers
          subscribersRef.current.forEach((callback) => {
            try {
              callback(message);
            } catch (error) {
              console.error("[WebSocket] Subscriber callback error:", error);
            }
          });
        } catch (error) {
          console.error("[WebSocket] Failed to parse message:", error);
        }
      };

      ws.onerror = (error) => {
        // Only log/report errors if we have a session ID
        // If no session, connection errors are expected and should be silent
        if (sessionId) {
          // WebSocket errors don't contain useful error messages in the Event object
          // Log connection details instead
          console.error("[WebSocket] Connection error:", {
            url,
            readyState: ws.readyState,
            readyStateText:
              ["CONNECTING", "OPEN", "CLOSING", "CLOSED"][ws.readyState] ||
              "UNKNOWN",
            timestamp: new Date().toISOString(),
          });

          onError?.(error);
        }
      };

      ws.onclose = (event) => {
        console.log("[WebSocket] Disconnected", {
          code: event.code,
          reason: event.reason || "No reason provided",
          wasClean: event.wasClean,
        });
        setIsConnected(false);
        setConnectionStatus("disconnected");
        onClose?.();

        // Auto-reconnect with exponential backoff
        if (
          autoReconnect &&
          reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS
        ) {
          const delay = getReconnectDelay();
          reconnectAttemptsRef.current++;

          console.log(
            `[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`,
          );
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
          console.warn(
            "[WebSocket] Max reconnect attempts reached, connection abandoned",
          );
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error("[WebSocket] Failed to create connection:", {
        error: error instanceof Error ? error.message : String(error),
        url,
      });
      setConnectionStatus("disconnected");
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
      healthCheckIntervalRef.current = null;
    }

    if (wsRef.current) {
      // Clear handlers first to prevent close event from triggering reconnect
      wsRef.current.onopen = null;
      wsRef.current.onmessage = null;
      wsRef.current.onerror = null;
      wsRef.current.onclose = null;
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus("disconnected");
    reconnectAttemptsRef.current = 0;
    // FIX 3: Clear the connected session reference on disconnect
    connectedSessionIdRef.current = undefined;
  };

  /**
   * Start connection health monitoring
   * Detects stale connections that might appear connected but aren't responsive
   */
  const startHealthCheck = () => {
    if (healthCheckIntervalRef.current) {
      clearInterval(healthCheckIntervalRef.current);
    }

    healthCheckIntervalRef.current = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        const timeSincePong = Date.now() - lastPongRef.current;

        if (timeSincePong > STALE_CONNECTION_THRESHOLD) {
          console.warn(
            `[WebSocket] Connection stale (${Math.floor(timeSincePong / 1000)}s without pong), forcing reconnect`,
          );
          // Force close and reconnect
          if (wsRef.current) {
            wsRef.current.close();
          }
        }
      }
    }, HEALTH_CHECK_INTERVAL);
  };

  const send = (message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn(
        "[WebSocket] Cannot send message - not connected, storing as missed event",
      );
      // Store as missed event to replay later (if it's a non-ping message)
      if (message.type !== "ping" && message.type !== "pong") {
        missedEventsRef.current.push(message);
      }
    }
  };

  const subscribe = useCallback((callback: (message: WSMessage) => void) => {
    subscribersRef.current.push(callback);

    // Return unsubscribe function
    return () => {
      subscribersRef.current = subscribersRef.current.filter(
        (cb) => cb !== callback,
      );
    };
  }, []);

  useEffect(() => {
    connect();

    return () => {
      disconnect();
    };
  }, [sessionId]);

  return {
    isConnected,
    connectionStatus,
    lastMessage,
    send,
    connect,
    disconnect,
    subscribe,
  };
}
