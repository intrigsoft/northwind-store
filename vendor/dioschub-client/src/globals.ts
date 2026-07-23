/**
 * @intrigsoft/dioschub-client — Global type augmentations
 *
 * Provides typed overloads for window.diosc() and JSX support for <diosc-chat>.
 * Import this file (or the package entry point) to get global augmentations.
 *
 * Synced with DioscEngine.processCommand() in modules/assistant-kit/src/engine/index.ts.
 */

import type {
  DioscConfig,
  BrowserToolHandler,
  ApprovalHandler,
  NavigationObserverCallback,
  ProtocolEventName,
  EventHandler,
  WildcardEventHandler,
  Unsubscribe,
  BrowserAdapter,
  MentionQuery,
} from './types';

/**
 * Fully-typed overloads for the diosc() command-queue function.
 *
 * Each overload corresponds to a command in DioscEngine.processCommand().
 */
export interface DioscFunction {
  // ── Configuration ──────────────────────────────────────────────────────
  // Auth artifacts arrive via the host's `bindEndpoint` (see DioscConfig). The
  // kit does not expose `diosc('auth', ...)` any more — see
  // docs/v2/auth-binding.md §7.
  (command: 'config', config: DioscConfig): void;

  /**
   * Register an extra-headers factory for the host bind endpoint. Use this
   * when the host's auth lives in JS (e.g. Bearer-in-localStorage) and you
   * cannot rely on cookies alone. The factory runs on every bind cycle,
   * synchronously or asynchronously. `null` clears it.
   */
  (command: 'bindHeaders', factory: (() => Record<string, string> | Promise<Record<string, string>>) | null): void;

  // ── Tools ──────────────────────────────────────────────────────────────
  (command: 'tool', name: string, handler: BrowserToolHandler): void;

  // ── Browser adapter (host-declared intent surface) ─────────────────────
  /** Push the current adapter (or null to clear). See browser-adapter-design.md. */
  (command: 'browserAdapter', adapter: BrowserAdapter | null): void;

  // ── Mentions (host-declared @-popover provider) ────────────────────────
  /**
   * Register a mention resolver, or null to clear. Called with the current
   * needle (text after `@`); return matching items sync or async. See
   * composer-mentions-design.md.
   */
  (command: 'mentionProvider', query: MentionQuery | null): void;

  // ── Custom approval UI ─────────────────────────────────────────────────
  /** Register a custom approval handler. Returns an unregister fn. */
  (command: 'approvalHandler', pattern: string | RegExp, handler: ApprovalHandler): Unsubscribe;

  // ── Observers ──────────────────────────────────────────────────────────
  (command: 'observe', type: 'navigation', observer: NavigationObserverCallback): () => void;

  // ── Messaging ──────────────────────────────────────────────────────────
  (command: 'invoke', input: string, pageContext?: any): Promise<void>;

  // ── Event listeners ────────────────────────────────────────────────────
  (command: 'on', event: ProtocolEventName | string, handler: EventHandler): Unsubscribe;
  (command: 'onAny', handler: WildcardEventHandler): Unsubscribe;
  (command: 'once', event: ProtocolEventName | string, handler: EventHandler): Unsubscribe;

  // ── UI-state listeners ─────────────────────────────────────────────────
  /** Fires immediately with the current value, then on every change. */
  (command: 'onOpenChange', listener: (isOpen: boolean) => void): Unsubscribe;
  /** Fires immediately with the current value, then on every change. */
  (command: 'onPositionChange', listener: (position: 'bottom-left' | 'bottom-right') => void): Unsubscribe;

  // ── Connection ─────────────────────────────────────────────────────────
  (command: 'connect'): Promise<void>;
  (command: 'disconnect'): void;
  /**
   * Re-run the host bind flow on the current connection (no reconnect). Call
   * after host auth state changes — e.g. an anonymous visitor signs in — so
   * dioschub promotes the live anonymous session in-place to the authenticated
   * identity. No-op when not connected.
   */
  (command: 'reauth'): void;
  (command: 'fetchAssistantConfig'): Promise<void>;

  // ── UI ─────────────────────────────────────────────────────────────────
  (command: 'open'): void;
  (command: 'close'): void;
  (command: 'toggle'): void;
  /** Flip the FAB anchor side at runtime (animated corner-to-corner slide).
   *  Use when the host's own UI (e.g. a cart drawer) covers the bottom-right. */
  (command: 'setPosition', position: 'bottom-left' | 'bottom-right'): void;

  // ── Approvals ──────────────────────────────────────────────────────────
  // Approval decisions are NOT host commands (Responsibility-First). To render
  // a custom approval surface, register `diosc('approvalHandler', pattern, fn)`;
  // the handler receives bound `actions` ({ approve, editAndApprove, reject })
  // it calls when a human decides. The built-in consensus dialog handles the
  // default case. There is no global `diosc('approve')`.

  // ── Stream control ─────────────────────────────────────────────────────
  (command: 'cancelStream'): void;

  // ── Session management ─────────────────────────────────────────────────
  (command: 'fetchSessionList', options?: { limit?: number; cursor?: string }): void;
  (command: 'fetchSessionListViaREST', options?: { limit?: number; cursor?: string; status?: string }): Promise<void>;
  (command: 'searchSessions', options: { query: string; limit?: number; status?: string }): Promise<void>;
  (command: 'clearSessionSearch'): Promise<void>;
  (command: 'loadSession', sessionId: string): void;
  (command: 'startNewSession'): void;
  (command: 'renameSession', sessionId: string, name: string): void;
  (command: 'pinSession', sessionId: string, isPinned: boolean): void;

  // ── Internal: command queue buffer ─────────────────────────────────────
  q?: unknown[][];

  /**
   * Escape hatch to the live DioscEngine, set by the kit at boot
   * (`engine/index.ts`). Exposes engine-only listeners that have no command
   * (onOpenChange / onPositionChange / once). The typed `createDiosc()` instance
   * is the supported consumer; direct host use is discouraged and slated to be
   * locked down — see docs/v2/client-library-design.md §6.
   */
  engine?: () => DioscEngineHandle;
  /** Force engine initialization (set by the kit at boot). */
  init?: () => void;
}

/**
 * Minimal structural view of the parts of the live engine the client SDK uses.
 * The kit owns the real `DioscEngine`; we only need its no-command listeners.
 */
export interface DioscEngineHandle {
  onOpenChange(listener: (isOpen: boolean) => void): Unsubscribe;
  onPositionChange(listener: (position: 'bottom-left' | 'bottom-right') => void): Unsubscribe;
  once(event: string, handler: EventHandler): Unsubscribe;
}

// ── Window augmentation ──────────────────────────────────────────────────
declare global {
  interface Window {
    diosc: DioscFunction;
    __DIOSC_ASSISTANT_LOADED__?: boolean;
  }
}
