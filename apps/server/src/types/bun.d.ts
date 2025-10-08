/// <reference types="bun-types" />

declare module 'bun' {
  interface ServerWebSocket<Data = unknown> extends WebSocket {
    readonly data: Data;
    send(data: string | ArrayBufferLike | ArrayBufferView): void;
    close(code?: number, reason?: string): void;
  }
}
