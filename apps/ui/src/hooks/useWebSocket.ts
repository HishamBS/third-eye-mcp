'use client';

import { useEffect, useRef, useState } from 'react';

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
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'reconnecting'>('disconnected');
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const missedEventsRef = useRef<WSMessage[]>([]);

  const getReconnectDelay = () => {
    // Exponential backoff: 1s, 2s, 4s, 8s, 16s (max)
    const delays = [1000, 2000, 4000, 8000, 16000];
    const index = Math.min(reconnectAttemptsRef.current, delays.length - 1);
    return delays[index];
  };

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    // Build WebSocket URL - ensure we always have /ws/monitor path for session monitoring
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:7070';
    const url = sessionId ? `${wsUrl}/ws/monitor?sessionId=${sessionId}` : `${wsUrl}/ws/monitor`;

    try {
      setConnectionStatus('reconnecting');
      console.log(`[WebSocket] Connecting to ${url}...`);
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log(`[WebSocket] Connected to ${url}`);
        setIsConnected(true);
        setConnectionStatus('connected');
        reconnectAttemptsRef.current = 0;
        onOpen?.();

        // Clear any pending reconnect attempts
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Replay missed events
        if (missedEventsRef.current.length > 0) {
          console.log(`[WebSocket] Replaying ${missedEventsRef.current.length} missed events`);
          missedEventsRef.current.forEach((msg) => onMessage?.(msg));
          missedEventsRef.current = [];
        }

        // Start ping/pong heartbeat
        const heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
          }
        }, 30000);

        ws.addEventListener('close', () => {
          clearInterval(heartbeatInterval);
        });
      };

      ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data);

          // Handle pong messages
          if (message.type === 'pong') {
            // Connection is alive
            return;
          }

          setLastMessage(message);
          onMessage?.(message);
        } catch (error) {
          console.error('[WebSocket] Failed to parse message:', error);
        }
      };

      ws.onerror = (error) => {
        // Only log/report errors if we have a session ID
        // If no session, connection errors are expected and should be silent
        if (sessionId) {
          // WebSocket errors don't contain useful error messages in the Event object
          // Log connection details instead
          console.error('[WebSocket] Connection error:', {
            url,
            readyState: ws.readyState,
            readyStateText: ['CONNECTING', 'OPEN', 'CLOSING', 'CLOSED'][ws.readyState] || 'UNKNOWN',
            timestamp: new Date().toISOString()
          });

          onError?.(error);
        }
      };

      ws.onclose = (event) => {
        console.log('[WebSocket] Disconnected', {
          code: event.code,
          reason: event.reason || 'No reason provided',
          wasClean: event.wasClean
        });
        setIsConnected(false);
        setConnectionStatus('disconnected');
        onClose?.();

        // Auto-reconnect with exponential backoff
        if (autoReconnect) {
          const delay = getReconnectDelay();
          reconnectAttemptsRef.current++;

          console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, delay);
        }
      };

      wsRef.current = ws;
    } catch (error) {
      console.error('[WebSocket] Failed to create connection:', {
        error: error instanceof Error ? error.message : String(error),
        url
      });
      setConnectionStatus('disconnected');
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    setConnectionStatus('disconnected');
    reconnectAttemptsRef.current = 0;
  };

  const send = (message: Record<string, unknown>) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('[WebSocket] Cannot send message - not connected, storing as missed event');
      // Store as missed event to replay later (if it's a non-ping message)
      if (message.type !== 'ping' && message.type !== 'pong') {
        missedEventsRef.current.push(message);
      }
    }
  };

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
  };
}
