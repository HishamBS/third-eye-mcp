#!/usr/bin/env bun

/**
 * Third Eye MCP Server Entry Point
 *
 * Starts stdio-based MCP server for agent connections
 * Usage: bun run bin/mcp-server.ts
 */

import { startMCPServer } from '../packages/mcp/server.js';

await startMCPServer();
