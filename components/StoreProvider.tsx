'use client';

/**
 * StoreProvider — the client-side store, mirroring the prototype's `useStore()`
 * context but backed entirely by the REST API. It holds NO hardcoded catalog
 * data: categories, cart, wishlist, and the current user are all fetched from
 * the backend on mount and kept in sync after every mutation (the mutation
 * endpoints return the new state, so updates are a single round-trip).
 */
import {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { api } from '@/lib/api-client';
import type { Cart, CartLineView, Category, Me, Product, ShippingMethod } from '@/lib/types';

export const STORE_NAME = 'Northwind';

export interface ToastAction {
  label: string;
  onClick: () => void;
}
export interface Toast {
  id: number;
  msg: string;
  action?: ToastAction;
}

export interface AddOptions {
  qty?: number;
  opt?: string;
  silent?: boolean;
}

export interface StoreValue {
  storeName: string;
  ready: boolean;
  categories: Category[];

  // navigation
  navigate: (to: string) => void;
  pathname: string;

  // cart
  cart: Cart | null;
  cartLines: CartLineView[];
  cartCount: number;
  cartSubtotal: number;
  promoApplied: boolean;
  addToCart: (productId: string, opts?: AddOptions) => Promise<void>;
  updateQty: (lineId: string, qty: number) => Promise<void>;
  removeFromCart: (lineId: string) => Promise<void>;
  applyPromo: (code: string) => Promise<boolean>;
  refreshCart: (method?: ShippingMethod) => Promise<Cart | null>;

  // cart drawer
  cartOpen: boolean;
  openCart: () => void;
  closeCart: () => void;

  // wishlist
  wishlist: string[];
  wishlistItems: Product[];
  inWishlist: (id: string) => boolean;
  toggleWish: (id: string) => Promise<void>;
  refreshWishlist: () => Promise<void>;

  // auth
  user: Me;
  isAuthed: boolean;
  auth: { open: boolean; mode: 'signin' | 'signup' };
  openAuth: (mode?: 'signin' | 'signup') => void;
  closeAuth: () => void;
  signIn: (email?: string) => Promise<void>;
  signUp: (name: string, email: string) => Promise<void>;
  signOut: () => Promise<void>;

  // toasts
  toasts: Toast[];
  toast: (msg: string, opts?: { action?: ToastAction }) => void;
}

const StoreCtx = createContext<StoreValue | null>(null);

export function useStore(): StoreValue {
  const ctx = useContext(StoreCtx);
  if (!ctx) throw new Error('useStore must be used within <StoreProvider>');
  return ctx;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  const [ready, setReady] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [cart, setCart] = useState<Cart | null>(null);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [wishlistItems, setWishlistItems] = useState<Product[]>([]);
  const [user, setUser] = useState<Me>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [auth, setAuth] = useState<{ open: boolean; mode: 'signin' | 'signup' }>({
    open: false,
    mode: 'signin',
  });
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastId = useRef(0);

  // ── initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    let alive = true;
    (async () => {
      const [cats, me, c, w] = await Promise.all([
        api.getCategories().catch(() => ({ categories: [] })),
        api.me().catch(() => ({ user: null })),
        api.getCart().catch(() => null),
        api.getWishlist().catch(() => ({ productIds: [], products: [] })),
      ]);
      if (!alive) return;
      setCategories(cats.categories);
      setUser(me.user);
      if (c) setCart(c);
      setWishlist(w.productIds);
      setWishlistItems(w.products);
      setReady(true);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // ── helpers ───────────────────────────────────────────────────────────────
  const navigate = useCallback((to: string) => router.push(to), [router]);

  const toast = useCallback((msg: string, opts?: { action?: ToastAction }) => {
    const id = ++toastId.current;
    setToasts((x) => [...x, { id, msg, action: opts?.action }]);
    setTimeout(
      () => setToasts((x) => x.filter((t) => t.id !== id)),
      opts?.action ? 4000 : 2600,
    );
  }, []);

  const setWish = useCallback((w: { productIds: string[]; products: Product[] }) => {
    setWishlist(w.productIds);
    setWishlistItems(w.products);
  }, []);

  // ── cart ──────────────────────────────────────────────────────────────────
  const refreshCart = useCallback(async (method?: ShippingMethod) => {
    const c = await api.getCart(method).catch(() => null);
    if (c) setCart(c);
    return c;
  }, []);

  const addToCart = useCallback(
    async (productId: string, opts: AddOptions = {}) => {
      const c = await api.addCartItem(productId, opts.qty ?? 1, opts.opt ?? '');
      setCart(c);
      if (!opts.silent) {
        toast('Added to cart', {
          action: { label: 'View cart', onClick: () => navigate('/cart') },
        });
      }
    },
    [toast, navigate],
  );

  const updateQty = useCallback(async (lineId: string, qty: number) => {
    setCart(await api.updateCartItem(lineId, qty));
  }, []);

  const removeFromCart = useCallback(async (lineId: string) => {
    setCart(await api.removeCartItem(lineId));
  }, []);

  const applyPromo = useCallback(
    async (code: string) => {
      try {
        const c = await api.applyPromo(code);
        setCart(c);
        // The server tells us exactly what the code did (e.g. "$15 off
        // Electronics orders over $150"); fall back to a generic line.
        toast(`${code.toUpperCase()} applied — ${c.promo?.description ?? 'discount added'}`);
        return true;
      } catch (e) {
        // The promo endpoint returns a helpful reason (invalid code, or how
        // much more to spend) — surface it verbatim.
        toast(e instanceof Error ? e.message : 'Could not apply that code.');
        return false;
      }
    },
    [toast],
  );

  // ── wishlist ────────────────────────────────────────────────────────────--
  const inWishlist = useCallback((id: string) => wishlist.includes(id), [wishlist]);

  const refreshWishlist = useCallback(async () => {
    const w = await api.getWishlist().catch(() => null);
    if (w) setWish(w);
  }, [setWish]);

  const toggleWish = useCallback(
    async (id: string) => {
      // Wishlist is logged-in only — a guest's heart tap becomes a sign-in CTA.
      if (!user) {
        toast('Sign in to save items to your wishlist');
        setAuth({ open: true, mode: 'signin' });
        return;
      }
      const has = wishlist.includes(id);
      // optimistic flip for snappy heart toggles
      setWishlist((w) => (has ? w.filter((x) => x !== id) : [id, ...w]));
      try {
        setWish(has ? await api.removeWishlist(id) : await api.addWishlist(id));
        toast(has ? 'Removed from wishlist' : 'Saved to wishlist');
      } catch {
        setWishlist((w) => (has ? [id, ...w] : w.filter((x) => x !== id)));
      }
    },
    [user, wishlist, setWish, toast],
  );

  // ── auth ──────────────────────────────────────────────────────────────────
  const openAuth = useCallback((mode: 'signin' | 'signup' = 'signin') => {
    setAuth({ open: true, mode });
  }, []);
  const closeAuth = useCallback(() => setAuth((a) => ({ ...a, open: false })), []);

  const signIn = useCallback(
    async (email?: string) => {
      const { user: u } = await api.login(email ?? 'alex.morgan@example.com');
      setUser(u);
      closeAuth();
      // Wishlist is now accessible — pull the signed-in user's saved items.
      void refreshWishlist();
      toast(`Welcome back, ${u.name.split(' ')[0]}!`);
    },
    [closeAuth, refreshWishlist, toast],
  );

  const signUp = useCallback(
    async (name: string, email: string) => {
      const { user: u } = await api.signup(name, email);
      setUser(u);
      closeAuth();
      void refreshWishlist();
      toast(`Welcome to ${STORE_NAME}, ${u.name.split(' ')[0]}!`);
    },
    [closeAuth, refreshWishlist, toast],
  );

  const signOut = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUser(null);
    // Wishlist is logged-in only — drop it from client state on sign-out.
    setWishlist([]);
    setWishlistItems([]);
    toast("You've been signed out");
    navigate('/');
  }, [toast, navigate]);

  const cartLines = cart?.lines ?? [];
  const value = useMemo<StoreValue>(
    () => ({
      storeName: STORE_NAME,
      ready,
      categories,
      navigate,
      pathname,
      cart,
      cartLines,
      cartCount: cart?.count ?? 0,
      cartSubtotal: cart?.totals.subtotal ?? 0,
      promoApplied: !!cart?.promoCode,
      addToCart,
      updateQty,
      removeFromCart,
      applyPromo,
      refreshCart,
      cartOpen,
      openCart: () => setCartOpen(true),
      closeCart: () => setCartOpen(false),
      wishlist,
      wishlistItems,
      inWishlist,
      toggleWish,
      refreshWishlist,
      user,
      isAuthed: !!user,
      auth,
      openAuth,
      closeAuth,
      signIn,
      signUp,
      signOut,
      toasts,
      toast,
    }),
    [
      ready, categories, navigate, pathname, cart, cartLines, addToCart, updateQty,
      removeFromCart, applyPromo, refreshCart, cartOpen, wishlist, wishlistItems,
      inWishlist, toggleWish, refreshWishlist, user, auth, openAuth, closeAuth,
      signIn, signUp, signOut, toasts, toast,
    ],
  );

  return <StoreCtx.Provider value={value}>{children}</StoreCtx.Provider>;
}
