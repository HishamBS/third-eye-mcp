#!/usr/bin/env bun

/**
 * Third Eye MCP Server Entry Point
 *
 * Starts stdio-based MCP server for agent connections
 * Usage: bun run bin/mcp-server.ts
 */

// CRITICAL: Redirect all console.log to stderr BEFORE any imports
// MCP protocol requires clean JSON-RPC on stdout - any stray logs break the protocol
const originalLog = console.log;
const originalInfo = console.info;
const originalWarn = console.warn;

console.log = (...args: unknown[]) => console.error(...args);
console.info = (...args: unknown[]) => console.error(...args);
console.warn = (...args: unknown[]) => console.error(...args);

import { startMCPServer } from "../packages/mcp/server.js";

await startMCPServer();
