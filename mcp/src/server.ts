import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { northwindTools } from './tools.js';
import { StorefrontApiClient } from './api-client.js';
import { ToolHandlers } from './tool-handlers.js';
import { extractRequestContext, extractRequestContextFromHeaders, RequestContext } from './request-context.js';

const app = express();
// Railway injects $PORT; fall back to MCP_PORT for local dev, then the default.
const PORT = process.env.PORT || process.env.MCP_PORT || 3011;
const API_BASE = process.env.NORTHWIND_API_URL || 'http://localhost:3010';

app.use(cors());
app.use(express.json());

/** Build handlers bound to a forwarded request context. */
function handlersFor(context: RequestContext): ToolHandlers {
  const api = new StorefrontApiClient();
  api.setContext(context);
  return new ToolHandlers(api);
}

// ── User resolver ─────────────────────────────────────────────────────────--
// Dioschub can call this to resolve identity from a forwarded session cookie.
// Auth artifacts arrive prefixed with `X-User-Auth-`; we replay the cookie
// against the storefront's /api/auth/me.
app.post('/api/resolve-user', async (req: Request, res: Response) => {
  const cookie =
    (req.headers['x-user-auth-cookie'] as string) || (req.headers['cookie'] as string);
  if (!cookie) return res.status(401).json({ error: 'No session cookie' });

  try {
    const r = await fetch(`${API_BASE}/api/auth/me`, { headers: { cookie } });
    if (!r.ok) return res.status(401).json({ error: 'Invalid session' });
    const { user } = (await r.json()) as { user: any };
    if (!user) return res.status(401).json({ error: 'Anonymous session' });
    return res.json({
      userId: user.id,
      displayName: user.name,
      email: user.email,
      roles: [user.isNew ? 'member' : 'customer'],
    });
  } catch (e) {
    return res.status(500).json({ error: 'Resolver error', details: String(e) });
  }
});

// ── MCP Streamable HTTP transport ─────────────────────────────────────────--
// Stateless: a fresh Server + transport per request (connect-per-call). DioscHub
// sends the visitor's auth (the `nw_sid` session cookie) as the request's HTTP
// headers (MCP spec 2025-11-25); we read them from `extra.requestInfo.headers`
// and replay them against the storefront so every tool acts *as the visitor* —
// credential-blind: the model never sees the cookie, it rides on the transport.
app.post('/mcp', async (req: Request, res: Response) => {
  const server = new Server(
    { name: 'northwind-storefront', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: northwindTools }));

  server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
    const { name, arguments: args } = request.params;
    const context = extractRequestContextFromHeaders(
      extra?.requestInfo?.headers as Record<string, string | string[] | undefined> | undefined,
    );
    const result = await handlersFor(context).handle(name, args || {});
    return result as any;
  });

  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  res.on('close', () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

// ── Test / introspection endpoints ────────────────────────────────────────--
app.get('/api/tools', (_req: Request, res: Response) => res.json({ tools: northwindTools }));

// Direct tool call for local testing. Pass the session cookie either as a normal
// `Cookie` header or `{ "cookie": "nw_sid=..." }` in the body's `_meta`.
app.post('/api/tools/call', async (req: Request, res: Response) => {
  const { name, arguments: args, cookie } = req.body ?? {};
  if (!name) return res.status(400).json({ error: 'Missing tool name' });
  const context = extractRequestContext({
    headers: { cookie: cookie || (req.headers['cookie'] as string) || '' },
  });
  try {
    const result = await handlersFor(context).handle(name, args || {});
    return res.json(result);
  } catch (e) {
    return res.status(500).json({ error: 'Tool execution failed', details: String(e) });
  }
});

app.get('/health', (_req: Request, res: Response) =>
  res.json({ status: 'healthy', service: 'northwind-mcp', tools: northwindTools.length }),
);

app.get('/', (_req: Request, res: Response) =>
  res.json({
    name: 'Northwind Storefront MCP Server',
    version: '1.0.0',
    description: 'Session-authorized MCP adapter over the Northwind storefront REST API.',
    apiBackend: API_BASE,
    endpoints: { mcp: '/mcp', resolveUser: '/api/resolve-user', listTools: '/api/tools', callTool: '/api/tools/call', health: '/health' },
    authentication: { type: 'byoa', artifact: 'nw_sid session cookie forwarded as the request HTTP Cookie header' },
    tools: northwindTools.map((t) => ({ name: t.name, description: t.description })),
  }),
);

app.listen(PORT, () => {
  console.log(`Northwind MCP server → http://localhost:${PORT}  (backend: ${API_BASE}, ${northwindTools.length} tools)`);
});
