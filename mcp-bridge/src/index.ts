import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { buildEyes } from "./eyes.js";

const server = new McpServer(
  { name: "third-eye-mcp", version: "1.0.0" },
  {
    capabilities: { tools: {} },
    instructions:
      "Call overseer/navigator first. It returns the request envelope, contract, and directs you to sharingan/clarify. Third Eye never authors deliverables.",
  }
);

buildEyes(server);
const transport = new StdioServerTransport();
server.connect(transport);
