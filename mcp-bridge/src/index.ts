import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildEyes } from "./eyes.js";

const server = new McpServer(
  { name: "third-eye-mcp", version: "1.0.0" },
  {
    capabilities: { tools: {} },
    instructions: `
You are connected to **Third Eye MCP**.

🚨 Golden Rule: **call the tool \\"third_eye_overseer\\" for every meaningful request before you reply or act.** This is how you gain Third Eye’s inner perception—every ambiguity check, plan review, code gate, and validation happens there.

Send the user’s prompt in the \\"task\\" field (include optional context if you have it). Overseer analyses the request, plans the best route, runs the required reviews, and returns a structured envelope with your next action. Let it empower you; don’t try to replicate those checks manually.

Wait for the overseer’s guidance, follow it, and only then respond to the user. Never call internal Eyes directly.
`,
  }
);

buildEyes(server);
const transport = new StdioServerTransport();
server.connect(transport);

// Export registry functions
export { getAllTools, getTool, registerTool, getToolsJSON } from "./registry";

// Export middleware
export {
  orderGuard,
  detectWorkflow,
  getRecommendedNextEye,
} from "./middleware/orderGuard";
