/**
 * Type declarations for @modelcontextprotocol/sdk modules
 * 
 * TypeScript's bundler moduleResolution doesn't properly resolve package.json exports
 * in composite projects. This file provides explicit module declarations so TypeScript
 * can resolve the imports even though the module resolution fails.
 */

declare module "@modelcontextprotocol/sdk/server/index" {
  export * from "@modelcontextprotocol/sdk/server";
}

declare module "@modelcontextprotocol/sdk/server/stdio" {
  import { StdioServerTransport as _StdioServerTransport } from "../../../node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js";
  export { _StdioServerTransport as StdioServerTransport };
}

declare module "@modelcontextprotocol/sdk/types" {
  // Import all exports from the types module
  type TypesModule = typeof import("../../../node_modules/@modelcontextprotocol/sdk/dist/esm/types.js");
  export const InitializeRequestSchema: TypesModule["InitializeRequestSchema"];
  export const ListToolsRequestSchema: TypesModule["ListToolsRequestSchema"];
  export const CallToolRequestSchema: TypesModule["CallToolRequestSchema"];
  export type Tool = TypesModule["Tool"];
}

