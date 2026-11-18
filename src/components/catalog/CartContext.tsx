"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  clearCartSession,
  countCartItems,
  loadCartFromSession,
  parseStoreCheckoutConfig,
  removeCartItemByKey,
  saveCartToSession,
  setCartItemQuantity,
  sumCartSubtotalCents,
  upsertCartItem,
  type CartItem,
} from "@/lib/catalog/cart";
import {
  isProductPriceVisible,
  type CatalogProduct,
  type Cents,
  type StoreCheckoutConfig,
  type StorePublic,
} from "@/types/catalog";

interface CartContextValue {
  store: StorePublic;
  checkoutConfig: StoreCheckoutConfig;
  items: CartItem[];
  itemCount: number;
  subtotalCents: Cents;
  isCartOpen: boolean;
  lastAddedLabel: string | null;
  addNonce: number;
  /** Global toggle: whether prices are shown by default (false in initial Demo Catalog mode). */
  showPrices: boolean;
  setShowPrices: (visible: boolean) => void;
  /** Per-product overrides for showing/hiding prices individually on each of the 3 cakes. */
  productPriceOverrides: Record<string, boolean>;
  setProductPriceVisible: (productKey: string, visible: boolean) => void;
  /** Helper to check if price should be shown for a specific product or slug. */
  isPriceVisibleFor: (
    target:
      | CatalogProduct
      | { slug?: string; id?: string; attributes?: Record<string, unknown> }
      | string,
  ) => boolean;
  /** Whether online payment via Stripe Mexico (MXN) is active (false in initial Demo Catalog mode). */
  stripeEnabled: boolean;
  setStripeEnabled: (enabled: boolean) => void;
  openCart: () => void;
  closeCart: () => void;
  addItem: (item: Omit<CartItem, "key">) => void;
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({
  store,
  children,
}: {
  store: StorePublic;
  children: ReactNode;
}) {
  const initialGlobalShowPrices = Boolean(
    store.theme_config &&
      typeof store.theme_config === "object" &&
      (store.theme_config as Record<string, unknown>).show_prices === true,
  );

  const [items, setItems] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [lastAddedLabel, setLastAddedLabel] = useState<string | null>(null);
  const [addNonce, setAddNonce] = useState(0);
  const [showPrices, setShowPricesState] = useState<boolean>(initialGlobalShowPrices);
  const [productPriceOverrides, setProductPriceOverrides] = useState<Record<string, boolean>>({});
  const [stripeEnabled, setStripeEnabled] = useState<boolean>(
    store.payment_provider === "STRIPE",
  );
  const toastTimerRef = useRef<number | null>(null);

  const checkoutConfig = useMemo(() => parseStoreCheckoutConfig(store), [store]);

  useEffect(() => {
    const saved = loadCartFromSession(store.slug);
    if (saved.length > 0) {
      setItems(saved);
    }
    return () => {
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [store.slug]);

  const setShowPrices = useCallback((visible: boolean) => {
    setShowPricesState(visible);
    // Clear individual overrides when flipping the master switch so all 3 products follow suit
    setProductPriceOverrides({});
  }, []);

  const setProductPriceVisible = useCallback((productKey: string, visible: boolean) => {
    setProductPriceOverrides((prev) => ({
      ...prev,
      [productKey]: visible,
    }));
  }, []);

  const isPriceVisibleFor = useCallback(
    (
      target:
        | CatalogProduct
        | { slug?: string; id?: string; attributes?: Record<string, unknown> }
        | string,
    ): boolean => {
      if (typeof target === "string") {
        if (target in productPriceOverrides) {
          return Boolean(productPriceOverrides[target]);
        }
        return showPrices;
      }
      return isProductPriceVisible(target, showPrices, productPriceOverrides);
    },
    [showPrices, productPriceOverrides],
  );

  const openCart = useCallback(() => setIsCartOpen(true), []);
  const closeCart = useCallback(() => setIsCartOpen(false), []);

  const addItem = useCallback(
    (incoming: Omit<CartItem, "key">) => {
      setItems((prev) => {
        const next = upsertCartItem(prev, incoming);
        saveCartToSession(store.slug, next);
        return next;
      });
      setAddNonce((n) => n + 1);
      setIsCartOpen(true);
      setLastAddedLabel(
        incoming.presentationLabel
          ? `${incoming.name} (${incoming.presentationLabel})`
          : incoming.name,
      );
      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
      toastTimerRef.current = window.setTimeout(() => {
        setLastAddedLabel(null);
      }, 3200);
    },
    [store.slug],
  );

  const updateQuantity = useCallback(
    (key: string, quantity: number) => {
      setItems((prev) => {
        const next = setCartItemQuantity(prev, key, quantity);
        saveCartToSession(store.slug, next);
        return next;
      });
    },
    [store.slug],
  );

  const removeItem = useCallback(
    (key: string) => {
      setItems((prev) => {
        const next = removeCartItemByKey(prev, key);
        saveCartToSession(store.slug, next);
        return next;
      });
    },
    [store.slug],
  );

  const clearCart = useCallback(() => {
    setItems([]);
    clearCartSession(store.slug);
  }, [store.slug]);

  const itemCount = useMemo(() => countCartItems(items), [items]);
  const subtotalCents = useMemo(() => sumCartSubtotalCents(items), [items]);

  const value = useMemo<CartContextValue>(
    () => ({
      store,
      checkoutConfig,
      items,
      itemCount,
      subtotalCents,
      isCartOpen,
      lastAddedLabel,
      addNonce,
      showPrices,
      setShowPrices,
      productPriceOverrides,
      setProductPriceVisible,
      isPriceVisibleFor,
      stripeEnabled,
      setStripeEnabled,
      openCart,
      closeCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    }),
    [
      store,
      checkoutConfig,
      items,
      itemCount,
      subtotalCents,
      isCartOpen,
      lastAddedLabel,
      addNonce,
      showPrices,
      setShowPrices,
      productPriceOverrides,
      setProductPriceVisible,
      isPriceVisibleFor,
      stripeEnabled,
      openCart,
      closeCart,
      addItem,
      updateQuantity,
      removeItem,
      clearCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useOptionalCart(): CartContextValue | null {
  return useContext(CartContext);
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return ctx;
}
