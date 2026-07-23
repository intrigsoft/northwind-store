# Tutorial material

Bulk copy-paste files for the DioscHub tutorial — code you should **copy, not
type**. The tutorial itself lives in the DioscHub docs; it tells you when to
copy each file and where to put it. Small, conceptual code (the MCP server
skeleton, an example tool) is written by hand in the tutorial text — only the
long mechanical files live here.

| Directory | Contents | Copied to |
| --- | --- | --- |
| `step-2-embed/` | `AssistantProvider.tsx` (the kit-loading provider) and `vendor/` (a snapshot of the `@intrigsoft/dioschub-client` SDK, used until the package is on npm) | `components/assistant/` and `vendor/` |
| `step-3-mcp/` | `tools.ts` (full tool catalog), `tool-handlers.ts`, `api-client.ts` — the bulk of the MCP server | `mcp/src/` |
| `step-4-auth/` | `auth-broker.ts` (the MCP server as JWT issuer — caches the visitor's session, mints audience-bound tokens per MCP spec 2025-11-25) and `bind-route.ts` (the storefront's bind endpoint that hands sessions to the broker) | `mcp/src/` and `app/api/diosc/bind/route.ts` |
| `step-5-hub/` | `ASSISTANT-PROMPT.md` — the assistant system prompt to paste into the hub admin portal | (hub configuration, not a repo file) |

This directory is excluded from the app build (`tsconfig.json` +
`Dockerfile.dockerignore`). The authoritative, running version of every file
here is on the [`production`](../../tree/production) branch — if the two ever
disagree, `production` wins.
