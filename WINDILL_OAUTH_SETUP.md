# Windmill OAuth Setup Instructions

## Overview
Windmill supports OAuth 2.0 for authentication. To enable OAuth for the Windmill MCP server in Archestra, follow these steps:

## Windmill OAuth Configuration

### 1. Create OAuth App in Windmill
1. Log into your Windmill instance
2. Go to **Settings** → **OAuth Apps** (or **API Keys** depending on version)
3. Create a new OAuth application with:
   - **Name**: Archestra Platform
   - **Redirect URI**: `https://your-archestra-instance.com/api/oauth/callback`
   - **Scopes**: `read:flows`, `write:flows` (or appropriate scopes)

### 2. Configure Catalog Item in Archestra
When creating/editing the Windmill catalog item in Archestra's admin panel, configure the OAuth settings:

```json
{
  "oauthConfig": {
    "server_url": "https://your-windmill-instance.com",
    "supports_resource_metadata": true,
    "auth_server_url": "https://your-windmill-instance.com/oauth",
    "resource_metadata_url": "https://your-windmill-instance.com/.well-known/oauth-authorization-server",
    "scopes": ["read:flows", "write:flows"],
    "client_id": "your-client-id",
    "client_secret": "your-client-secret"
  },
  "serverType": "windmill"
}
```

### 3. How It Works
The Archestra backend OAuth routes (`platform/backend/src/routes/oauth.ts`) already support Windmill's OAuth flow:

1. **Resource Parameter** (RFC 8707): The code at lines 842-847 automatically includes the `resource` parameter in the authorization URL, which Windmill requires to identify the protected resource.

2. **Discovery**: The OAuth flow supports both resource metadata discovery and standard OAuth discovery.

3. **Token Exchange**: Supports both proxy mode (using MCP SDK's `exchangeAuthorization`) and standard OAuth token exchange.

### 4. Frontend Configuration
The frontend client config (`platform/frontend/src/app/connection/clients.ts`) has been updated to support both token and OAuth authentication:
- `supportedAuth: "both"` - supports both token and OAuth
- `preferredAuth: "token"` - defaults to token auth for simplicity

### 5. Testing OAuth Flow
1. In Archestra, go to **Connections** → **Add Connection**
2. Select **Windmill**
3. Choose **OAuth** as the authentication method
4. Click **Connect** - you'll be redirected to Windmill's OAuth authorization page
5. Authorize the application
6. You'll be redirected back to Archestra with an access token

## MCP Apps Extension Support
The Windmill MCP server includes the `io.modelcontextprotocol/ui` extension, which enables the interactive Flow Editor UI. The backend MCP proxy (`platform/backend/src/routes/mcp-proxy.ts`) already supports this extension through the generic `MCP_APPS_SERVER_EXTENSION_CAPABILITIES` configuration.

## Notes
- The `resource` parameter is automatically included in the authorization URL (see `oauth.ts` lines 842-847)
- Windmill's OAuth implementation follows RFC 8707 for resource indicators
- The current implementation supports dynamic client registration if `client_id` is not provided
