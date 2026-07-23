'use client';

/**
 * AssistantProvider — embeds the Dioschub assistant kit into the storefront.
 *
 * Mirrors the acme-helpdesk integration, adapted for Next.js:
 *  - loads the kit via `@intrigsoft/dioschub-client`,
 *  - configures it to bind through our same-origin `/api/diosc/bind` route
 *    (cookies flow automatically, so no explicit bindHeaders are needed),
 *  - connects in anonymous-capable mode and promotes the session in place
 *    (`reauth`) when the visitor signs in — the same anon→auth flow the
 *    storefront itself uses,
 *  - registers a client-side `navigate` tool and streams route changes as
 *    page context.
 *
 * If no embed API key is configured the store still runs fully; the assistant
 * simply isn't mounted. See `.env.example`.
 */
import { useEffect, useRef, useState } from 'react';
import { loadDiosc } from '@intrigsoft/dioschub-client';
import type { DioscConfig, NavigationData } from '@intrigsoft/dioschub-client';
import { useStore } from '@/components/StoreProvider';

declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'diosc-chat': Record<string, unknown>;
    }
  }
}

interface AssistantProviderProps {
  /** Public hub URL the kit loads from + opens its WebSocket to. */
  backendUrl?: string;
  /** Embed API key. Blank ⇒ the assistant is not mounted. */
  apiKey?: string;
  /** Assistant to converse with. */
  assistantId?: string;
}

export function AssistantProvider({ backendUrl, apiKey, assistantId }: AssistantProviderProps = {}) {
  // Values come from the server layout (runtime env) so a single built image is
  // configurable per deployment; fall back to build-time NEXT_PUBLIC_* for a
  // plain local `npm run dev`.
  const BACKEND_URL = backendUrl || process.env.NEXT_PUBLIC_DIOSC_BACKEND_URL || 'http://localhost:3333';
  const API_KEY = apiKey || process.env.NEXT_PUBLIC_DIOSC_API_KEY || '';
  const ASSISTANT_ID = assistantId || process.env.NEXT_PUBLIC_DIOSC_ASSISTANT_ID || '';

  const { navigate, isAuthed, user, pathname, refreshCart, refreshWishlist, cartOpen } = useStore();

  // loadDiosc touches `window`, so it must only run in the browser. Next.js
  // server-renders client components, so guard against SSR (where window is
  // undefined) — the handle is created on the first client render instead.
  const resultRef = useRef<ReturnType<typeof loadDiosc> | null>(null);
  if (!resultRef.current && API_KEY && typeof window !== 'undefined') {
    resultRef.current = loadDiosc({ backendUrl: BACKEND_URL, apiKey: API_KEY });
  }

  const [configured, setConfigured] = useState(false);

  // Configure once the kit script is ready.
  useEffect(() => {
    const handle = resultRef.current;
    if (!handle) return;
    let cancelled = false;
    handle.ready
      .then(() => {
        if (cancelled) return;
        const { diosc } = handle;

        const config: DioscConfig = {
          backendUrl: BACKEND_URL,
          autoConnect: false,
          // Same-origin host endpoint that forwards identity + BYOA artifacts.
          bindEndpoint: '/api/diosc/bind',
          apiKey: API_KEY,
        };
        if (ASSISTANT_ID) config.assistantId = ASSISTANT_ID;
        diosc('config', config);

        // Let the assistant move the user around the store.
        diosc('tool', 'navigate', async (params: Record<string, unknown>) => {
          const dest = (params.path || params.url) as string | undefined;
          if (!dest) return { success: false, error: 'No path provided' };
          if (dest.startsWith('http')) {
            window.open(dest, '_blank');
            return { success: true, data: { navigatedTo: dest, external: true } };
          }
          navigate(dest);
          return { success: true, data: { navigatedTo: dest } };
        });

        setConfigured(true);
      })
      .catch((err: Error) => console.error('[Diosc] load error:', err));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Connect once configured (anonymous-capable; stays up across login/logout).
  useEffect(() => {
    const handle = resultRef.current;
    if (!configured || !handle) return;
    const { diosc } = handle;
    diosc('connect');
    return () => diosc('disconnect');
  }, [configured]);

  // Promote in place on sign-in; reset to a fresh anonymous session on sign-out.
  const prevAuthed = useRef(isAuthed);
  useEffect(() => {
    const handle = resultRef.current;
    if (!configured || !handle) return;
    const { diosc } = handle;
    const was = prevAuthed.current;
    prevAuthed.current = isAuthed;
    if (isAuthed && !was) {
      diosc('reauth');
    } else if (!isAuthed && was) {
      diosc('disconnect');
      diosc('connect');
    }
  }, [configured, isAuthed, user]);

  // Keep the FAB out of the cart's way. The cart drawer slides in from the
  // bottom-right — right where the assistant button lives — so flip the widget
  // to the bottom-left while the cart is open, and back to the right when it
  // closes. The kit animates the corner-to-corner slide; we just tell it which
  // side to be on. We also lift the FAB above the cart's scrim (z-index ~150)
  // via the kit's `--diosc-fab-z` knob so it stays clickable while the cart is
  // open, instead of sitting under the dimming overlay.
  useEffect(() => {
    const handle = resultRef.current;
    if (!configured || !handle) return;
    const { diosc } = handle;
    diosc('setPosition', cartOpen ? 'bottom-left' : 'bottom-right');
    document.documentElement.style.setProperty('--diosc-fab-z', cartOpen ? '200' : '');
  }, [configured, cartOpen]);

  // Stream route changes as page context.
  useEffect(() => {
    const handle = resultRef.current;
    if (!configured || !handle) return;
    const { diosc } = handle;
    const navData: NavigationData = { path: pathname, search: '', hash: '' };
    try {
      diosc('observe', 'navigation', (notify: (d: NavigationData) => void) => notify(navData));
    } catch {
      /* observe not critical */
    }
  }, [configured, pathname]);

  // Keep the storefront UI in sync with the assistant's actions. The shopping
  // tools mutate cart/wishlist/orders SERVER-SIDE (via the MCP connector), so
  // the host wouldn't otherwise know. We listen for the kit's `tool:completed`
  // event and re-pull cart + wishlist — the header badge, cart drawer, and cart
  // page all reflect the assistant's changes with no manual reload. Debounced so
  // a burst of tool calls coalesces into a single refresh.
  useEffect(() => {
    const handle = resultRef.current;
    if (!configured || !handle) return;
    const { diosc } = handle;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        void refreshCart();
        void refreshWishlist();
      }, 250);
    };
    const off = diosc('on', 'tool:completed', scheduleRefresh);
    return () => {
      if (timer) clearTimeout(timer);
      off?.();
    };
  }, [configured, refreshCart, refreshWishlist]);

  // Links the assistant renders in chat (built from the navigation sitemap,
  // e.g. /p/p1000) are same-origin. The kit intercepts left-clicks on them and
  // emits a composed `navigateRequested` event instead of letting the browser
  // do a full reload (which would tear down the widget and lose the live
  // session). It bubbles out of the web component to `window`; route it through
  // the Next.js router so navigation stays a single-page transition — exactly
  // like the assistant's own `navigate` tool.
  useEffect(() => {
    const onNavigate = (e: Event) => {
      const path = (e as CustomEvent<{ path: string }>).detail?.path;
      if (!path) return;
      e.preventDefault(); // claim it → kit suppresses the native full-page load
      navigate(path);
    };
    window.addEventListener('navigateRequested', onNavigate as EventListener);
    return () => window.removeEventListener('navigateRequested', onNavigate as EventListener);
  }, [navigate]);

  if (!API_KEY) return null;
  return <diosc-chat />;
}
