import express, { Request, Response } from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { northwindTools } from './tools.js';
import { StorefrontApiClient } from './api-client.js';
import { ToolHandlers } from './tool-handlers.js';
import { extractRequestContext, RequestContext } from './request-context.js';
import { mintSessionToken, resolveSessionHeaders, sessionCount } from './auth-broker.js';

const app = express();
// Railway injects $PORT; fall back to MCP_PORT for local dev, then the default.
const PORT = process.env.PORT || process.env.MCP_PORT || 3011;
const API_BASE = process.env.NORTHWIND_API_URL || 'http://localhost:3010';

// Hub bind — this MCP server (not the storefront) registers the session with
// the hub, so the admin `auth:bind` capability key lives HERE, server-side.
const HUB_URL = (process.env.DIOSC_HUB_URL || 'http://localhost:3333').replace(/\/$/, '');
const HUB_API_KEY = process.env.DIOSC_HUB_API_KEY || '';
// Shared secret the storefront must present to /auth/bind. Without it, anyone
// who can reach this server could mint bindings for arbitrary identities.
const BIND_SECRET = process.env.MCP_BIND_SECRET || '';
if (!BIND_SECRET) {
  console.warn('[auth] MCP_BIND_SECRET not set — /auth/bind is unauthenticated (dev only)');
}

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

// ── Bind endpoint (storefront → MCP server) ───────────────────────────────--
// The storefront POSTs the visitor's identity + auth headers here at bind time.
// We cache the headers, mint the audience-bound JWT that references them, and
// register the session with the hub ourselves. The visitor's credentials never
// reach the hub — the hub only ever holds the JWT.
app.post('/auth/bind', async (req: Request, res: Response) => {
  if (BIND_SECRET && req.headers['x-bind-secret'] !== BIND_SECRET) {
    return res.status(401).json({ error: 'Invalid bind secret' });
  }
  const { wsId, identity, headers } = (req.body ?? {}) as {
    wsId?: string;
    identity?: { userId: string; username: string; role?: { id: string; name: string } } | null;
    headers?: Record<string, string>;
  };
  if (!wsId) return res.status(400).json({ error: 'wsId is required' });
  if (!headers || Object.keys(headers).length === 0) {
    return res.status(400).json({ error: 'headers (the visitor auth artifacts) are required' });
  }

  const jwt = await mintSessionToken(identity?.userId ?? 'anonymous', headers);

  try {
    const hubRes = await fetch(`${HUB_URL}/api/auth/bind`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': HUB_API_KEY },
      body: JSON.stringify({
        wsId,
        identity: identity ?? null,
        authArtifacts: { headers: { Authorization: `Bearer ${jwt}` } },
      }),
    });
    if (!hubRes.ok) {
      const text = await hubRes.text().catch(() => '');
      console.error(`[auth] hub bind failed (${hubRes.status}): ${text.slice(0, 200)}`);
      return res.status(502).json({ error: `hub bind failed: ${hubRes.status}` });
    }
  } catch (err) {
    console.error('[auth] could not reach the hub:', err);
    return res.status(502).json({ error: 'could not reach the hub' });
  }
  return res.json({ ok: true });
});

// ── MCP Streamable HTTP transport ─────────────────────────────────────────--
// Stateless transport: a fresh Server + transport per request (connect-per-call).
// Per the MCP authorization spec (2025-11-25), tool calls carry an access token
// as `Authorization: Bearer <jwt>` — a token THIS server issued at bind time.
// We validate it (signature, audience, expiry) and exchange it for the cached
// visitor headers; the token itself is never forwarded upstream. An invalid or
// expired token gets HTTP 401 + WWW-Authenticate, which the hub surfaces as a
// re-auth interrupt so the host can re-bind.
app.post('/mcp', async (req: Request, res: Response) => {
  const rpc = req.body as { method?: string } | undefined;
  let context: RequestContext = { headers: {}, cookies: {} };

  if (rpc?.method === 'tools/call') {
    const sessionHeaders = await resolveSessionHeaders(req.headers['authorization']);
    if (!sessionHeaders) {
      res
        .status(401)
        .set('WWW-Authenticate', 'Bearer resource="northwind-mcp", error="invalid_token"')
        .json({ error: 'Missing, invalid, or expired access token' });
      return;
    }
    context = { headers: sessionHeaders, cookies: {} };
  }

  const server = new Server(
    { name: 'northwind-storefront', version: '1.0.0' },
    { capabilities: { tools: {} } },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: northwindTools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
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
  res.json({
    status: 'healthy',
    service: 'northwind-mcp',
    tools: northwindTools.length,
    boundSessions: sessionCount(),
  }),
);

app.get('/', (_req: Request, res: Response) =>
  res.json({
    name: 'Northwind Storefront MCP Server',
    version: '1.0.0',
    description: 'Session-authorized MCP adapter over the Northwind storefront REST API.',
    apiBackend: API_BASE,
    endpoints: { mcp: '/mcp', bind: '/auth/bind', resolveUser: '/api/resolve-user', listTools: '/api/tools', callTool: '/api/tools/call', health: '/health' },
    authentication: {
      type: 'oauth-style bearer (MCP spec 2025-11-25)',
      artifact:
        'HS256 JWT issued by this server at bind time (aud=northwind-mcp); exchanged per tool call for the cached visitor session headers',
    },
    tools: northwindTools.map((t) => ({ name: t.name, description: t.description })),
  }),
);

app.listen(PORT, () => {
  console.log(`Northwind MCP server → http://localhost:${PORT}  (backend: ${API_BASE}, ${northwindTools.length} tools)`);
});
