'use client';

import { useEffect, useRef, useState } from 'react';

export interface WSMessage {
  type: string;
  sessionId?: string;
  data?: any;
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

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://127.0.0.1:7070';
    const url = sessionId ? `${wsUrl}/ws/monitor?sessionId=${sessionId}` : `${wsUrl}/ws`;

    try {
      setConnectionStatus('reconnecting');
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('[WebSocket] Connected');
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
        console.error('[WebSocket] Error:', error);
        onError?.(error);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Disconnected');
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
      console.error('[WebSocket] Failed to create connection:', error);
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

  const send = (message: any) => {
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
