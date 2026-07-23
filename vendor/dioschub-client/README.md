# @intrigsoft/dioschub-client

The official client SDK for the **Diosc AI Assistant Kit** — a typed, namespaced
API for embedding and driving the Diosc chat assistant on your web app.

Zero runtime dependencies. Framework-agnostic (React, Vue, Angular, vanilla).

---

## Mental model (read this first)

A few things shape the entire API:

- **The kit owns the chat UI.** When you embed Diosc, the assistant-kit web
  components are loaded from **Diosc Hub** at runtime and render the whole chat
  experience. You don't build a chat UI; you configure one and wire it to your app.
- **Two display layouts, one widget.** The same `<diosc-chat>` renders either as a
  **FAB** (floating bubble, default) or **embed** (inline panel). There is **no
  headless mode** — the SDK never asks you to render messages, sessions, or
  approvals yourself.
- **Two planes of integration:**
  - *Control* — drive the widget (connect, send, open/close).
  - *Extend* — give the AI host capabilities (tools, mentions, page context,
    custom approval UI, navigation).
- **Identity is BYOA (Bring Your Own Auth).** Diosc never sees your credentials.
  Your app authenticates the user and *binds* that identity to the connection
  server-to-server. There is **no auth-header / token API** in this SDK by design.

This package gives you two entry points:

| Entry point | Use when |
|---|---|
| **`createDiosc()`** | The supported, fully-typed instance API. Use this. |
| **`loadDiosc()`** | Lower-level script injector + raw command queue. Use only if you need the gtag-style global directly. |

---

## Installation

```bash
npm install @intrigsoft/dioschub-client
```

---

## Quick start

```ts
import { createDiosc } from '@intrigsoft/dioschub-client';

const diosc = createDiosc({
  apiKey: 'ak_xxx',                       // public embed key (like a Maps key)
  backendUrl: 'https://hub.example.com',
});

await diosc.ready;                        // optional — resolves when the kit loads

diosc.on('stream:chunk', (c) => console.log(c));
diosc.send('Hello!');
```

Then render the widget anywhere in your page:

```html
<diosc-chat></diosc-chat>
```

That's the whole happy path. Everything below is opt-in.

---

## The widget element

The kit auto-mounts `<diosc-chat>`. You can configure it via `createDiosc(...)`
(recommended) or with attributes:

```html
<!-- FAB (default) -->
<diosc-chat></diosc-chat>

<!-- Inline embed panel -->
<diosc-chat mode="embed"></diosc-chat>

<!-- Fully attribute-driven (no JS) -->
<diosc-chat
  api-key="ak_xxx"
  backend-url="https://hub.example.com"
  bind-endpoint="/api/diosc/bind">
</diosc-chat>
```

| Attribute | Maps to |
|---|---|
| `api-key` | `apiKey` |
| `backend-url` | `backendUrl` |
| `assistant-id` | `assistantId` (auto-detected if omitted) |
| `bind-endpoint` | `bindEndpoint` (see [Identity](#identity--byoa)) |
| `mode` | `"embed"` for inline; omit for FAB |

---

## The instance API

`createDiosc(options)` returns a `DioscInstance` with a small **core** plus three
namespaces: **`ui`**, **`extend`**, **`identity`**.

### `createDiosc(options)`

`options` is your `DioscConfig` plus two loader controls:

| Option | Type | Default | Notes |
|---|---|---|---|
| `apiKey` | `string` | — | Public embed key. |
| `backendUrl` | `string` | — | Diosc Hub URL. |
| `assistantId` | `string` | auto | Resolved from config fetch if omitted. |
| `bindEndpoint` | `string` | — | Your server endpoint for BYOA bind. |
| `autoConnect` | `boolean` | `true` | Connect on init. |
| `verbose` | `boolean` | `false` | Verbose logging. |
| `reconnectAttempts` / `reconnectDelay` / `reconnectDelayMax` / `connectionTimeout` | `number` | — | Transport tuning. |
| `scriptUrl` | `string` | derived | Custom kit script URL. |
| `autoLoad` | `boolean` | `true` | Set `false` if the loader `<script>` is already on the page. |

### Core

```ts
await diosc.ready;                         // Promise<void> — kit script loaded

await diosc.connect();                     // open the connection (no-op if autoConnect)
diosc.disconnect();

await diosc.send('Summarize my order', { pageContext: { orderId } });
diosc.cancelStream();                      // drain the in-flight response

const off = diosc.on('stream:chunk', (chunk) => render(chunk));
off();                                     // unsubscribe

diosc.onAny((event, payload) => log(event, payload));

await diosc.fetchAssistantConfig();        // re-fetch public assistant config
```

> **Attachments caveat:** `send(text, { attachments })` accepts an `attachments`
> field for forward-compatibility, but it is **not wired end-to-end yet** — today
> it is a no-op (file sends go through the composer UI). See
> [Known gaps](#known-gaps).

### `ui` — drive the widget shell

```ts
diosc.ui.open();
diosc.ui.close();
diosc.ui.toggle();
diosc.ui.setPosition('bottom-left');       // 'bottom-left' | 'bottom-right'

// Change listeners (fire immediately with the current value, then on change):
const offOpen = diosc.ui.onOpenChange((isOpen) => syncMyButton(isOpen));
const offPos  = diosc.ui.onPositionChange((pos) => layout(pos));
```

### `extend` — give the AI host capabilities

This is the high-value plane. Everything here is optional.

#### Tools — let the AI call your code

```ts
diosc.extend.tool('navigate', async (params) => {
  router.push(params.path);
  return { navigatedTo: params.path };
});
```

#### Mentions — populate the composer `@`-popover

The host filter is **authoritative** — return exactly what the popover should
show. Selecting an item serializes to the wire format `@[Name](kind:id)`, where
`id` is what the LLM sees.

```ts
const people = [{ id: 'u_1', name: 'Ada', kind: 'user' }];

diosc.extend.mentions((needle) =>
  people.filter((p) => p.name.toLowerCase().includes(needle.toLowerCase())),
);

diosc.extend.mentions(null);               // clear
```

#### Browser adapter — expose page state + actionable intents

The adapter gives the AI a fresh page snapshot each turn plus a set of *intents*
it may invoke. Each intent can declare a **client-local approval gate** that the
AI cannot bypass.

```ts
diosc.extend.browser({
  read: async () => ({ url: location.href, title: document.title, data: getState() }),
  intents: [
    {
      name: 'apply_coupon',
      description: 'Apply a discount coupon to the cart',
      schema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
      handler: async ({ code }) => {
        await cart.applyCoupon(code);
        return { success: true, data: { code } };
      },
      // Optional: gate behind a local approval dialog before running
      approval: {
        severity: 'medium',
        summary: ({ code }) => `Apply coupon ${code}?`,
      },
    },
  ],
});
```

#### Custom approval UI

The kit ships a built-in approval dialog. To render **your own**, register a
handler. `pattern` matches the prefixed runtime tool name (e.g.
`acme-helpdesk_create_ticket`). The handler receives the request plus bound
`actions` it calls when a human decides:

```ts
const off = diosc.extend.onApproval(/acme-helpdesk_/, (approval, actions) => {
  myModal.open(approval, {
    onApprove: () => actions.approve(),
    onEdit:    (args) => actions.editAndApprove(args),
    onReject:  (reason) => actions.reject(reason),
  });
});
```

> There is intentionally **no** `diosc.approve()` / `reject()` global. Approval
> decisions only resolve from a surface that received the request — the built-in
> dialog or your registered handler. This preserves the human-in-the-loop
> (Responsibility-First) guarantee.

#### Navigation observer — push SPA route changes into chat

```ts
diosc.extend.observeNavigation((notify) => {
  const stop = router.afterEach((route) => notify({ path: route.path }));
  return stop;                             // return a cleanup fn (optional)
});
```

### `identity` — BYOA

Diosc never receives your credentials. Your app authenticates the user and binds
that identity to the live connection **server-to-server**.

**Flow:**
1. You set `bindEndpoint` (a route on *your* server).
2. When the connection needs identity, the kit `POST`s `{ wsId }` to your
   `bindEndpoint` with `credentials: 'include'` (so your auth cookie rides along).
3. Your endpoint authenticates the user and forwards the identity to Diosc Hub's
   `POST /auth/bind`. The bound identity (and feature flags) flow back to the kit.

```ts
const diosc = createDiosc({
  apiKey: 'ak_xxx',
  backendUrl: 'https://hub.example.com',
  bindEndpoint: '/api/diosc/bind',
});

// If your auth lives in JS (e.g. a Bearer token) rather than a cookie,
// supply extra headers for the bind request:
diosc.identity.setBindHeaders(() => ({ Authorization: `Bearer ${getToken()}` }));

// After the user signs in (e.g. anonymous → authenticated), rebind in place:
diosc.identity.reauth();
```

A minimal `bindEndpoint` on your server:

```ts
// POST /api/diosc/bind   body: { wsId: string }
app.post('/api/diosc/bind', requireAuth, async (req, res) => {
  const { wsId } = req.body;
  // Forward the authenticated identity to Diosc Hub.
  await fetch(`${HUB_URL}/auth/bind`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      wsId,
      identity: { userId: req.user.id, username: req.user.name, role: req.user.role },
    }),
  });
  res.sendStatus(204);
});
```

> See `docs/v2/auth-binding.md` in the Diosc Hub repo for the authoritative
> protocol, including feature flags and REST-token rotation.

### Events

Subscribe with `diosc.on(event, handler)` (typed) or `diosc.onAny(handler)`.

| Event | Payload (shape) | Meaning |
|---|---|---|
| `stream:start` | `{ … }` | Assistant began responding |
| `stream:chunk` | `{ … }` | Streamed content delta |
| `stream:end` | `{ … }` | Response complete |
| `tool:started` | `{ toolCallId, toolName, toolParameters }` | A tool call started |
| `tool:completed` | `{ toolCallId, toolName, durationMs, resultSummary }` | Tool call finished |
| `tool:failed` | `{ toolCallId, toolName, errorMessage }` | Tool call failed |
| `approval:request` | `{ toolCalls, … }` | A human decision is required |
| `content_blocked` | `{ reason, message }` | Output guardrail tripped |
| `session:started` / `joined` / `loaded` / `restored` | `{ session, … }` | Session lifecycle |
| `session:renamed` / `pinned` | `{ sessionId, … }` | Session list change |
| `auth:refreshed` / `auth:failed` | `{ … }` | Identity bind lifecycle |
| `files:updated` | `{ fileId?, files? }` | File set changed |
| `browser:read_page` | `{ … }` | Kit requested a page snapshot |

`ProtocolEventName` is the full typed union; `on()` also accepts any string for
forward-compat.

> **Short-lived AI triggers** (one-shot, non-chat calls like *generate a
> description from the selected items*) are **out of scope** for this SDK. Today
> they belong on your backend. If introduced later, they will ship as **UI
> components**, not as a bare client method. See
> `docs/v2/client-library-design.md` §4.

---

## Framework examples

### React

```tsx
import { useEffect, useRef } from 'react';
import { createDiosc, type DioscInstance } from '@intrigsoft/dioschub-client';

export function Assistant() {
  const ref = useRef<DioscInstance>();

  useEffect(() => {
    const diosc = createDiosc({
      apiKey: import.meta.env.VITE_DIOSC_KEY,
      backendUrl: import.meta.env.VITE_DIOSC_URL,
      bindEndpoint: '/api/diosc/bind',
    });
    ref.current = diosc;

    diosc.extend.tool('navigate', async ({ path }) => {
      window.history.pushState({}, '', path);
      return { navigatedTo: path };
    });

    const off = diosc.on('approval:request', () => toast('Action needs approval'));
    return () => off();
  }, []);

  return <diosc-chat />;
}
```

### Vue

```vue
<template><diosc-chat /></template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { createDiosc } from '@intrigsoft/dioschub-client';

onMounted(() => {
  const diosc = createDiosc({
    apiKey: import.meta.env.VITE_DIOSC_KEY,
    backendUrl: import.meta.env.VITE_DIOSC_URL,
  });
  diosc.extend.observeNavigation((notify) =>
    router.afterEach((r) => notify({ path: r.path })),
  );
});
</script>
```

### Angular

```ts
import { Injectable } from '@angular/core';
import { createDiosc, type DioscInstance } from '@intrigsoft/dioschub-client';

@Injectable({ providedIn: 'root' })
export class DioscService {
  readonly diosc: DioscInstance = createDiosc({
    apiKey: environment.dioscKey,
    backendUrl: environment.dioscUrl,
    bindEndpoint: '/api/diosc/bind',
  });

  constructor() {
    this.diosc.identity.setBindHeaders(() => ({
      Authorization: `Bearer ${this.auth.token}`,
    }));
  }
}
```

### Vanilla JS

```html
<script type="module">
  import { createDiosc } from 'https://esm.sh/@intrigsoft/dioschub-client';

  const diosc = createDiosc({ apiKey: 'ak_xxx', backendUrl: 'https://hub.example.com' });
  diosc.ui.setPosition('bottom-left');
</script>

<diosc-chat></diosc-chat>
```

---

## Lower-level: `loadDiosc` + the raw command doorway

If you need the gtag-style global directly (or are migrating older code),
`loadDiosc()` injects the script and returns the raw command function and a
`ready` promise. The raw doorway is also reachable via `instance.raw`.

```ts
import { loadDiosc } from '@intrigsoft/dioschub-client';

const { diosc, ready } = loadDiosc({ backendUrl: 'https://hub.example.com', apiKey: 'ak_xxx' });
diosc('config', { autoConnect: true });    // commands buffered until the script loads
await ready;
```

`createDiosc()` is built on top of `loadDiosc()` — prefer the instance API; reach
for the raw doorway only as an escape hatch.

---

## What this SDK intentionally does **not** have

These omissions are deliberate design decisions, not gaps:

- **No headless mode.** The kit renders the chat UI (FAB/embed). You never build
  message lists, session pickers, or the approval dialog yourself.
- **No host session API.** `loadSession` / `startNewSession` / `renameSession` /
  etc. are driven by the kit's own session-history panel, not host code.
- **No `approve` / `reject` global.** Approval decisions resolve only from a UI
  surface that received the request (built-in dialog or your `onApproval`
  handler) — Responsibility-First.
- **No auth-header / token API.** Identity is bound server-to-server via
  `bindEndpoint`. The credential-blind principle means Diosc never sees tokens.

See `docs/v2/client-library-design.md` for the full rationale.

---

## Known gaps

| Gap | Status |
|---|---|
| `send(text, { attachments })` | `attachments` is accepted but a no-op (engine `invoke` doesn't forward it yet). |

---

## Exported types

`DioscInstance`, `CreateDioscOptions`, `DioscUi`, `DioscExtend`, `DioscIdentity`,
`SendOptions`, `WidgetPosition`, `DioscConfig`, `BoundIdentity`, `BoundRole`,
`NavigationData`, `NavigationObserverCallback`, `BrowserToolHandler`,
`BrowserAdapter`, `PageSnapshot`, `IntentDefinition`, `IntentApproval`,
`IntentResult`, `JsonSchema`, `MentionItem`, `MentionQuery`, `ApprovalRequest`,
`ApprovalToolCall`, `ApprovalActions`, `ApprovalValidationError`,
`ApprovalHandler`, `SessionEventName`, `ServerEventName`, `ProtocolEventName`,
`EventHandler`, `WildcardEventHandler`, `Unsubscribe`, `DioscCommand`,
`DioscFunction`, `DioscEngineHandle`, `LoadDioscOptions`, `LoadDioscResult`.

---

## License

MIT
