# Windmill MCP Server Integration - Walkthrough

## Overview
This implementation adds Windmill workflow automation to Archestra through the Model Context Protocol (MCP). Users can list, view, create, and edit Windmill flows directly from the Archestra interface.

## What Was Built

### 1. Windmill MCP Server (`platform/mcp-servers/windmill/`)
A complete MCP server implementing the Windmill API integration:

- **Tools exposed:**
  - `list_flows` - List all Windmill workflows
  - `get_flow` - Get details of a specific flow
  - `create_flow` - Create new Windmill workflows
  - `update_flow` - Update existing flows (opens editor UI)

- **Resources:**
  - `windmill://flows/editor` - Interactive flow editor UI

- **Features:**
  - Real Windmill API integration using axios
  - Environment variable configuration (WINDMILL_BASE_URL, WINDMILL_API_KEY, WINDMILL_WORKSPACE)
  - Functional flow editor UI with JSON editing and validation
  - MCP Apps extension support for interactive UI

### 2. Frontend Integration (`platform/frontend/src/app/connection/clients.ts`)
Added Windmill client configuration:
- Server URL: `http://localhost:8000/windmill-mcp`
- Supports stdio transport via npx
- Configurable API key, base URL, and workspace

### 3. Backend Support (`platform/backend/src/types/mcp-catalog.ts`)
Added "windmill" as a valid server type in the `InternalMcpCatalogServerTypeSchema` enum.

## Setup Instructions

### Prerequisites
- Windmill instance running (self-hosted or cloud)
- Windmill API key with appropriate permissions
- Node.js 18+ and pnpm

### Installation

1. **Install dependencies:**
```bash
cd platform/mcp-servers/windmill
pnpm install
```

2. **Build the server:**
```bash
pnpm run build
```

3. **Configure environment variables:**
```bash
export WINDMILL_BASE_URL="https://your-windmill-instance.com"
export WINDMILL_API_KEY="your-api-key"
export WINDMILL_WORKSPACE="admin"  # or your workspace name
```

4. **Run the server:**
```bash
pnpm start
```

### Connecting to Archestra

1. In Archestra, go to **Connections** → **Add Connection**
2. Select **Windmill** from the available clients
3. Configure the connection:
   - **Base URL**: Your Windmill instance URL
   - **API Key**: Your Windmill API key
   - **Workspace**: Your workspace name (default: "admin")
4. Test the connection and save

## Using the Tools

### List Flows
```
Use the list_flows tool to see all available workflows in your Windmill workspace.
```

### Create a Flow
```
Use create_flow with:
- workspace: "admin"
- path: "my-workflow"
- summary: "My new workflow"
- flowValue: { "modules": [...], "value": {...} }
```

### Edit a Flow
```
Use update_flow with flowPath to open the interactive editor UI.
The editor allows you to modify the flow JSON and save changes.
```

## Example: Create a "Confluence → Email" Flow

```json
{
  "path": "confluence-to-email",
  "summary": "Fetch Confluence page and send via email",
  "flowValue": {
    "modules": [
      {
        "input_transform": {
          "type": "javascript",
          "path": "confluence_page_id"
        }
      }
    ],
    "value": {
      "summary": "Fetch Confluence page and send via email"
    }
  }
}
```

## Architecture

```
Archestra Frontend → MCP Protocol → Windmill MCP Server → Windmill API
                                    ↓
                            Flow Editor UI (MCP App)
```

## Files Modified/Created

### New Files
- `platform/mcp-servers/windmill/package.json`
- `platform/mcp-servers/windmill/src/index.ts`
- `platform/mcp-servers/windmill/src/windmill-client.ts`
- `platform/mcp-servers/windmill/src/index.test.ts`
- `platform/mcp-servers/windmill/tsconfig.json`

### Modified Files
- `platform/frontend/src/app/connection/clients.ts` - Added Windmill client config
- `platform/backend/src/types/mcp-catalog.ts` - Added "windmill" to server type enum
- `platform/pnpm-workspace.yaml` - Added mcp-servers/* to workspace

## Testing

Run the test suite:
```bash
cd platform/mcp-servers/windmill
pnpm test
```

## Troubleshooting

### Build Errors
If you encounter TypeScript errors, ensure:
- All dependencies are installed (`pnpm install`)
- Node.js version is 18+ but less than 25 (required by pnpm engine config)

### API Connection Issues
- Verify WINDMILL_BASE_URL is correct (include https://)
- Check API key has proper permissions
- Ensure workspace name is correct

### Flow Editor Not Loading
- Check that the MCP client supports MCP Apps extensions
- Verify the resource URI `windmill://flows/editor` is accessible

## Bounty Requirements Checklist

- [x] Windmill MCP server with real API integration
- [x] Tools: list_flows, get_flow, create_flow, update_flow
- [x] Interactive flow editor UI (MCP App)
- [x] Frontend client configuration
- [x] Backend type system support
- [x] Test suite
- [x] Documentation (this file)
- [ ] OAuth integration (pending backend build environment)
- [ ] Full end-to-end testing (requires running backend)

## Next Steps

1. Complete OAuth integration in `platform/backend/src/routes/oauth.ts`
2. Add Windmill routing to `platform/backend/src/routes/mcp-proxy.ts`
3. Perform full end-to-end testing with a live Windmill instance
4. Submit PR to Archestra repository
