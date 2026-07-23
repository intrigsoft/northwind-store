/**
 * @intrigsoft/dioschub-client — createDiosc()
 *
 * A typed, namespaced instance over the gtag-style `window.diosc(command, …)`
 * global. This is the supported integration entry point; the global remains for
 * the bare script-tag path.
 *
 * Design: docs/v2/client-library-design.md. Surface is staged into a tiny CORE
 * (what every integrator touches) plus three namespaces:
 *   - `ui`       — drive the widget shell (open/close/position + change listeners)
 *   - `extend`   — give the AI host capabilities (tools, mentions, browser, approval, navigation)
 *   - `identity` — BYOA bind (no auth-header API; that model is retired)
 *
 * There is no headless mode and no host session/approval-decision API: the kit
 * owns the chat UI (FAB / embed). Short-lived AI triggers (one-shot, non-chat
 * calls) are explicitly out of scope; when introduced they will ship as UI
 * components, not as a bare client method. See docs/v2/client-library-design.md §4.
 */

import type { DioscFunction } from './globals';
import { loadDiosc } from './loader';
import type {
  DioscConfig,
  BrowserToolHandler,
  BrowserAdapter,
  MentionQuery,
  ApprovalHandler,
  NavigationObserverCallback,
  ProtocolEventName,
  EventHandler,
  WildcardEventHandler,
  Unsubscribe,
} from './types';

export type WidgetPosition = 'bottom-left' | 'bottom-right';

/** Options for {@link createDiosc} — the engine config plus how to load the kit. */
export interface CreateDioscOptions extends DioscConfig {
  /**
   * Fully-custom kit script URL. Defaults to the embed loader derived from
   * `backendUrl` + `apiKey` (see {@link loadDiosc}).
   */
  scriptUrl?: string;
  /**
   * Inject the kit `<script>` automatically. Default `true`. Set `false` if the
   * page already includes the loader (the instance then just attaches to the
   * existing `window.diosc`).
   */
  autoLoad?: boolean;
}

/** What you send with a message. */
export interface SendOptions {
  /** Arbitrary page context attached to this turn. */
  pageContext?: unknown;
  /**
   * File attachments. NOTE: not wired end-to-end yet — the `invoke` command
   * drops attachments (engine gap, see design doc §7). Passing this today is a
   * no-op; kept in the signature so host code doesn't change when it lands.
   */
  attachments?: unknown[];
}

/** Drive the widget shell. */
export interface DioscUi {
  open(): void;
  close(): void;
  toggle(): void;
  setPosition(position: WidgetPosition): void;
  /** Fires immediately with the current value, then on every change. */
  onOpenChange(listener: (isOpen: boolean) => void): Unsubscribe;
  /** Fires immediately with the current value, then on every change. */
  onPositionChange(listener: (position: WidgetPosition) => void): Unsubscribe;
}

/** Give the AI host-provided capabilities (the extension plane). */
export interface DioscExtend {
  /** Register a browser-tool handler the AI may call. */
  tool(name: string, handler: BrowserToolHandler): void;
  /** Set (or clear with `null`) the composer `@`-mention resolver. */
  mentions(provider: MentionQuery | null): void;
  /** Set (or clear with `null`) the page snapshot + intent surface. */
  browser(adapter: BrowserAdapter | null): void;
  /**
   * Render a custom approval UI. `pattern` matches the prefixed runtime tool
   * name (e.g. `acme-helpdesk_create_ticket`). Returns an unregister fn.
   */
  onApproval(pattern: string | RegExp, handler: ApprovalHandler): Unsubscribe;
  /** Register an SPA navigation observer. */
  observeNavigation(observer: NavigationObserverCallback): () => void;
}

/** BYOA identity binding. No auth-header / token data API by design. */
export interface DioscIdentity {
  /** Extra-headers factory for the host bind endpoint (`null` clears). */
  setBindHeaders(
    factory: (() => Record<string, string> | Promise<Record<string, string>>) | null,
  ): void;
  /** Re-run the host bind on the live connection (anon→auth in place). */
  reauth(): void;
}

/** The typed instance returned by {@link createDiosc}. */
export interface DioscInstance {
  /** Resolves once the kit script has loaded (init + auto-connect proceed from config). */
  readonly ready: Promise<void>;

  // ── core ───────────────────────────────────────────────────────────────
  connect(): Promise<void>;
  disconnect(): void;
  /** Send a user message (auto-creates a session). */
  send(text: string, options?: SendOptions): Promise<void>;
  /** Drain the in-flight stream (drain, not abort). */
  cancelStream(): void;
  /** Subscribe to one protocol event. Returns an unsubscribe fn. */
  on<T = unknown>(event: ProtocolEventName | (string & {}), handler: EventHandler<T>): Unsubscribe;
  /** Wildcard subscribe (event name + payload). */
  onAny(handler: WildcardEventHandler): Unsubscribe;
  /** Re-fetch public assistant config. */
  fetchAssistantConfig(): Promise<void>;

  // ── namespaces ───────────────────────────────────────────────────────────
  readonly ui: DioscUi;
  readonly extend: DioscExtend;
  readonly identity: DioscIdentity;

  /** Raw command doorway. Escape hatch — prefer the typed methods above. */
  readonly raw: DioscFunction;
}

/**
 * Create a typed Diosc instance.
 *
 * @example
 * ```ts
 * const diosc = createDiosc({ apiKey: 'ak_…', backendUrl: 'https://hub.example.com' });
 * await diosc.ready;
 * diosc.on('stream:chunk', (c) => render(c));
 * diosc.send('Hello');
 * ```
 */
export function createDiosc(options: CreateDioscOptions): DioscInstance {
  if (typeof window === 'undefined') {
    throw new Error('createDiosc() must run in a browser environment.');
  }

  const { scriptUrl, autoLoad = true, ...config } = options;

  // Defaults: the happy path should "just connect". Host can override.
  const resolvedConfig: DioscConfig = { autoConnect: true, ...config };

  // 1. Ensure the kit is loading and we have a delegate that always forwards to
  //    the current window.diosc (handles the stub → real-function swap at boot).
  let ready: Promise<void>;
  let raw: DioscFunction;
  if (autoLoad) {
    const loaded = loadDiosc({
      backendUrl: config.backendUrl ?? '',
      apiKey: config.apiKey,
      scriptUrl,
    });
    raw = loaded.diosc;
    ready = loaded.ready;
  } else {
    // Attach to an already-present global (or its pre-load stub).
    raw = ((...args: Parameters<DioscFunction>) =>
      (window.diosc as DioscFunction)(...args)) as DioscFunction;
    ready = window.__DIOSC_ASSISTANT_LOADED__ ? Promise.resolve() : waitForKit();
  }

  // 2. Configure (buffered if the engine hasn't initialised yet).
  raw('config', resolvedConfig);

  const ui: DioscUi = {
    open: () => void raw('open'),
    close: () => void raw('close'),
    toggle: () => void raw('toggle'),
    setPosition: (position) => void raw('setPosition', position),
    // onOpenChange / onPositionChange are real commands now (no longer
    // engine-only), so they forward through the doorway like everything else.
    onOpenChange: (listener) => raw('onOpenChange', listener),
    onPositionChange: (listener) => raw('onPositionChange', listener),
  };

  const extend: DioscExtend = {
    tool: (name, handler) => void raw('tool', name, handler),
    mentions: (provider) => void raw('mentionProvider', provider),
    browser: (adapter) => void raw('browserAdapter', adapter),
    onApproval: (pattern, handler) => raw('approvalHandler', pattern, handler),
    observeNavigation: (observer) => raw('observe', 'navigation', observer),
  };

  const identity: DioscIdentity = {
    setBindHeaders: (factory) => void raw('bindHeaders', factory),
    reauth: () => void raw('reauth'),
  };

  return {
    ready,
    connect: () => raw('connect'),
    disconnect: () => void raw('disconnect'),
    send: (text, opts) => raw('invoke', text, opts?.pageContext),
    cancelStream: () => void raw('cancelStream'),
    on: (event, handler) => raw('on', event, handler as EventHandler),
    onAny: (handler) => raw('onAny', handler),
    fetchAssistantConfig: () => raw('fetchAssistantConfig'),
    ui,
    extend,
    identity,
    raw,
  };
}

/** Resolve once the kit script has set the loaded flag (poll, no script injection). */
function waitForKit(): Promise<void> {
  return new Promise((resolve) => {
    if (window.__DIOSC_ASSISTANT_LOADED__) return resolve();
    const id = setInterval(() => {
      if (window.__DIOSC_ASSISTANT_LOADED__) {
        clearInterval(id);
        resolve();
      }
    }, 50);
  });
}
