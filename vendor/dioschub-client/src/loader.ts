/**
 * @intrigsoft/dioschub-client — Script loader
 *
 * Injects the Diosc assistant-kit <script> tag and sets up the
 * command-queue stub on window.diosc so that commands issued before
 * the script finishes loading are buffered and replayed.
 */

import type { DioscFunction } from './globals';

/** Options for {@link loadDiosc} */
export interface LoadDioscOptions {
  /** Diosc Hub backend URL (e.g. "https://hub.diosc.ai" or "http://localhost:3000") */
  backendUrl: string;
  /** API key — when provided the loader URL is /api/embed/{apiKey}/loader.js */
  apiKey?: string;
  /** Fully-custom script URL (takes precedence over backendUrl + apiKey) */
  scriptUrl?: string;
}

/** Return value of {@link loadDiosc} */
export interface LoadDioscResult {
  /** The diosc command function (usable immediately — commands are queued) */
  diosc: DioscFunction;
  /** Resolves when the assistant-kit script has finished loading */
  ready: Promise<void>;
}

// Singleton promise so multiple calls don't inject multiple <script> tags
let pendingReady: Promise<void> | null = null;

// Singleton delegate — always forwards to the current window.diosc.
// This prevents stale references when the assistant-kit script replaces
// window.diosc after loading (the stub → real function swap).
let delegate: DioscFunction | null = null;

/**
 * Load the Diosc assistant-kit script and return a typed handle.
 *
 * Safe to call multiple times — the script is injected at most once.
 *
 * @example
 * ```ts
 * import { loadDiosc } from '@intrigsoft/dioschub-client';
 *
 * const { diosc, ready } = loadDiosc({
 *   backendUrl: 'https://hub.diosc.ai',
 *   apiKey: 'ak_xxx',
 * });
 *
 * // Commands are buffered until the script loads
 * diosc('config', { autoConnect: true });
 *
 * await ready; // optional — wait for full initialisation
 * ```
 */
export function loadDiosc(options: LoadDioscOptions): LoadDioscResult {
  // 1. Ensure the command-queue stub exists
  if (!window.diosc) {
    const queue: DioscFunction = function dioscStub(...args: unknown[]) {
      (queue.q = queue.q || []).push(args);
    } as unknown as DioscFunction;
    window.diosc = queue;
  }

  // 2. Create delegate once — always forwards to current window.diosc
  if (!delegate) {
    delegate = ((...args: Parameters<DioscFunction>) => {
      return (window.diosc as DioscFunction)(...args);
    }) as DioscFunction;
  }

  // 3. Already loaded — return immediately
  if (window.__DIOSC_ASSISTANT_LOADED__) {
    return { diosc: delegate, ready: Promise.resolve() };
  }

  // 4. Script injection (once)
  if (!pendingReady) {
    pendingReady = new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src =
        options.scriptUrl ??
        (options.apiKey
          ? `${options.backendUrl}/api/embed/${options.apiKey}/loader.js`
          : `${options.backendUrl}/embed/components/assistant-kit/assistant-kit.esm.js`);

      script.onload = () => {
        window.__DIOSC_ASSISTANT_LOADED__ = true;
        resolve();
      };
      script.onerror = () =>
        reject(new Error(`Failed to load Diosc script from ${script.src}`));

      document.head.appendChild(script);
    });
  }

  return { diosc: delegate, ready: pendingReady };
}
