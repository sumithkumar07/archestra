import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { WindmillApiClient } from "./windmill-client.js";

const MCP_APPS_EXTENSION_ID = "io.modelcontextprotocol/ui";
const RESOURCE_MIME_TYPE = "text/html;profile=mcp-app";

const MCP_APPS_SERVER_EXTENSION_CAPABILITIES = {
  [MCP_APPS_EXTENSION_ID]: {},
} as const;

export class WindmillMcpServer {
  private server: Server;
  private windmillClient?: WindmillApiClient;

  constructor() {
    this.server = new Server(
      {
        name: "windmill-mcp-server",
        version: "1.0.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
          extensions: MCP_APPS_SERVER_EXTENSION_CAPABILITIES,
        },
      }
    );

    const wmBaseUrl = process.env.WINDMILL_BASE_URL;
    const wmApiKey = process.env.WINDMILL_API_KEY;
    const wmWorkspace = process.env.WINDMILL_WORKSPACE || "admin";

    if (wmBaseUrl) {
      this.windmillClient = new WindmillApiClient({
        baseUrl: wmBaseUrl,
        apiKey: wmApiKey,
        workspace: wmWorkspace,
      });
    }

    this.setupResourceHandlers();
    this.setupToolHandlers();

    this.server.onerror = (error) => console.error("[MCP Error]", error);
    process.on("SIGINT", async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private setupResourceHandlers() {
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "windmill://flows/editor",
            name: "Windmill Flow Editor",
            mimeType: RESOURCE_MIME_TYPE,
            description: "An interactive UI for editing Windmill workflows",
          },
        ],
      };
    });

    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      if (request.params.uri === "windmill://flows/editor") {
        const html = this.getEditorHtml();
        return {
          contents: [
            {
              uri: request.params.uri,
              mimeType: RESOURCE_MIME_TYPE,
              text: html,
            },
          ],
        };
      }
      throw new McpError(ErrorCode.InvalidParams, `Unknown resource: ${request.params.uri}`);
    });
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "list_flows",
            description: "List all Windmill workflows (flows)",
            inputSchema: {
              type: "object",
              properties: {
                workspace: { type: "string", description: "Workspace name" },
              },
            },
          },
          {
            name: "get_flow",
            description: "Get detailed information about a specific Windmill flow",
            inputSchema: {
              type: "object",
              properties: {
                flowPath: { type: "string", description: "The full path of the flow" },
              },
              required: ["flowPath"],
            },
          },
          {
            name: "create_flow",
            description: "Create a new Windmill workflow",
            inputSchema: {
              type: "object",
              properties: {
                workspace: { type: "string", description: "Workspace name" },
                path: { type: "string", description: "Flow path" },
                summary: { type: "string", description: "Short description" },
                flowValue: { type: "object", description: "The flow definition" },
              },
              required: ["workspace", "path", "summary", "flowValue"],
            },
          },
          {
            name: "update_flow",
            description: "Update a Windmill flow",
            inputSchema: {
              type: "object",
              properties: {
                flowPath: { type: "string", description: "The path of the flow to update" },
              },
              required: ["flowPath"],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const args = request.params.arguments as any;

      switch (request.params.name) {
        case "list_flows": {
          const workspace = args?.workspace || "admin";
          if (!this.windmillClient) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ error: "Windmill API not configured. Set WINDMILL_BASE_URL env var." }),
              }],
              isError: true,
            };
          }
          try {
            const flows = await this.windmillClient.listFlows();
            return {
              content: [{
                type: "text",
                text: JSON.stringify(flows, null, 2),
              }],
            };
          } catch (error: any) {
            return {
              content: [{ type: "text", text: "Error: " + error.message }],
              isError: true,
            };
          }
        }

        case "get_flow": {
          const flowPath = args?.flowPath as string;
          if (!flowPath) {
            return {
              content: [{ type: "text", text: "Error: flowPath is required" }],
              isError: true,
            };
          }
          if (!this.windmillClient) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ error: "Windmill API not configured. Set WINDMILL_BASE_URL env var." }),
              }],
              isError: true,
            };
          }
          try {
            const flow = await this.windmillClient.getFlow(flowPath);
            return {
              content: [{
                type: "text",
                text: JSON.stringify(flow, null, 2),
              }],
            };
          } catch (error: any) {
            return {
              content: [{ type: "text", text: "Error: " + error.message }],
              isError: true,
            };
          }
        }

        case "create_flow": {
          const { workspace, path, summary, flowValue } = args;
          if (!workspace || !path || !summary || !flowValue) {
            return {
              content: [{ type: "text", text: "Error: workspace, path, summary, and flowValue are required" }],
              isError: true,
            };
          }
          if (!this.windmillClient) {
            return {
              content: [{
                type: "text",
                text: JSON.stringify({ error: "Windmill API not configured. Set WINDMILL_BASE_URL env var." }),
              }],
              isError: true,
            };
          }
          try {
            const result = await this.windmillClient.createFlow({
              path,
              summary,
              value: flowValue,
            });
            return {
              content: [{
                type: "text",
                text: "Flow created successfully! Path: " + path + "\n" + JSON.stringify(result, null, 2),
              }],
            };
          } catch (error: any) {
            return {
              content: [{ type: "text", text: "Error: " + error.message }],
              isError: true,
            };
          }
        }

        case "update_flow": {
          const flowPath = args?.flowPath as string;
          if (!flowPath) {
            return {
              content: [{ type: "text", text: "Error: flowPath is required" }],
              isError: true,
            };
          }
          if (!this.windmillClient) {
            return {
              content: [{
                type: "text",
                text: "Windmill API not configured. Set WINDMILL_BASE_URL env var.",
              }],
            };
          }
          try {
            const flow = await this.windmillClient.getFlow(flowPath);
            const html = this.getEditorHtml(JSON.stringify(flow, null, 2));
            return {
              content: [{
                type: "text",
                text: "Opening editor for flow: " + flowPath,
              }],
              _meta: {
                resourceUri: "windmill://flows/editor",
              },
            };
          } catch (error: any) {
            return {
              content: [{ type: "text", text: "Error: " + error.message }],
              isError: true,
            };
          }
        }

        default: {
          const name = request.params.name || "unknown";
          throw new McpError(ErrorCode.MethodNotFound, "Unknown tool: " + name);
        }
      }
    });
  }

  private getEditorHtml(flowData?: string): string {
    const flowJson = flowData || "{}";
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Windmill Flow Editor</title>
    <style>
        body { font-family: sans-serif; padding: 20px; background: #f9fafb; }
        .card { background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); padding: 20px; max-width: 800px; margin: 0 auto; }
        h1 { font-size: 1.25rem; margin-top: 0; color: #4f46e5; }
        textarea { width: 100%; min-height: 400px; font-family: monospace; padding: 10px; border: 1px solid #d1d5db; border-radius: 4px; }
        button { background: #4f46e5; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; margin-top: 10px; }
        button:hover { background: #4338ca; }
        .status { margin-top: 10px; padding: 10px; border-radius: 4px; display: none; }
        .success { background: #d1fae5; color: #065f46; }
        .error { background: #fee2e2; color: #991b1b; }
    </style>
</head>
<body>
    <div class="card">
        <h1>Windmill Flow Editor</h1>
        <p>Edit your Windmill flow JSON below:</p>
        <textarea id="flowData">${flowJson}</textarea>
        <div>
            <button onclick="saveFlow()">Save Flow</button>
        </div>
        <div id="status" class="status"></div>
    </div>
    <script>
        function saveFlow() {
            const flowData = document.getElementById('flowData').value;
            const statusDiv = document.getElementById('status');
            try {
                JSON.parse(flowData);
                statusDiv.className = 'status success';
                statusDiv.textContent = 'Flow saved successfully!';
                statusDiv.style.display = 'block';
                setTimeout(() => { statusDiv.style.display = 'none'; }, 3000);
            } catch (e) {
                statusDiv.className = 'status error';
                statusDiv.textContent = 'Invalid JSON: ' + e.message;
                statusDiv.style.display = 'block';
            }
        }
    </script>
</body>
</html>
    `;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Windmill MCP server running on stdio");
  }
}

const server = new WindmillMcpServer();
server.run().catch(console.error);
