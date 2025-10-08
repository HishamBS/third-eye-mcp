#!/usr/bin/env bun

const HOST = process.env.MCP_HOST || '127.0.0.1';
const PORT = process.env.MCP_PORT || '7070';
const sessionId = process.env.MCP_WS_SESSION_ID || 'diagnostic-session';
const endpoint = `ws://${HOST}:${PORT}/ws/monitor?sessionId=${encodeURIComponent(sessionId)}`;

console.log(`🔌 Connecting to ${endpoint}`);

const MAX_ATTEMPTS = 8;
let attempt = 0;
let closedByServer = false;

function connect(delay = 0) {
  setTimeout(() => {
    attempt += 1;
    console.log(`\nAttempt ${attempt}/${MAX_ATTEMPTS}`);

    const ws = new WebSocket(endpoint);

    const start = Date.now();

    ws.onopen = () => {
      console.log('✅ Connected');
      ws.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data.toString());
        console.log('📩 Message:', data);
        if (data.type === 'error' && data.data?.reason === 'heartbeat_timeout') {
          closedByServer = true;
        }
      } catch (error) {
        console.error('Failed to parse message', error);
      }
    };

    ws.onclose = (event) => {
      const duration = Date.now() - start;
      console.log(`🔒 Closed (code=${event.code}, reason="${event.reason}", duration=${duration}ms)`);

      if (attempt < MAX_ATTEMPTS) {
        const backoff = Math.min(WS_BACKOFF[attempt - 1] ?? 24000, 24000);
        console.log(`⏳ Reconnecting in ${backoff}ms`);
        connect(backoff);
      } else {
        console.log('\nℹ️ Max attempts reached.');
        process.exit(closedByServer ? 0 : 1);
      }
    };

    ws.onerror = (event) => {
      console.error('❌ WebSocket error:', event);
    };
  }, delay);
}

const WS_BACKOFF = [1000, 2000, 4000, 8000, 12000, 16000, 20000, 24000];

connect();
