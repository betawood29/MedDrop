// Cart context — manages shopping cart + print order state
// Shop items persist to localStorage AND sync to server (cross-device)
// Print order: metadata persists to localStorage, File objects stored in memory

import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DELIVERY_FEE, FREE_DELIVERY_MIN } from '../utils/constants';
import { useAuth } from '../hooks/useAuth';
import { getServerCart, saveServerCart } from '../services/cartService';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const syncTimeoutRef = useRef(null);
  const isSyncingRef = useRef(false); // prevent save loop when loading from server

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem('cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Print order: metadata in state (persisted), File refs in a ref (memory only)
  const printFilesRef = useRef(null);
  const [printOrder, _setPrintOrder] = useState(() => {
    try {
      const saved = localStorage.getItem('printOrder');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

  // Persist print order metadata to localStorage
  useEffect(() => {
    if (printOrder) {
      localStorage.setItem('printOrder', JSON.stringify(printOrder));
    } else {
      localStorage.removeItem('printOrder');
    }
  }, [printOrder]);

  // --- Server sync ---

  // Load server cart when user logs in; merge with local cart
  useEffect(() => {
    if (!user) return;

    isSyncingRef.current = true;
    getServerCart()
      .then((res) => {
        const serverItems = res.data.data || [];

        setItems((localItems) => {
          if (serverItems.length === 0 && localItems.length === 0) {
            isSyncingRef.current = false;
            return localItems;
          }

          // Merge: start with server items, add any local items not already in server
          const merged = [...serverItems];
          localItems.forEach((local) => {
            const exists = merged.find((s) => s.product === local.product);
            if (!exists) merged.push(local);
          });

          // If merged differs from server, save back to server
          if (merged.length !== serverItems.length) {
            saveServerCart(merged.map((i) => ({ product: i.product, quantity: i.quantity })))
              .catch(() => {});
          }

          isSyncingRef.current = false;
          return merged;
        });
      })
      .catch(() => {
        isSyncingRef.current = false;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  // Clear local cart when user logs out
  useEffect(() => {
    if (!user) {
      setItems([]);
      localStorage.removeItem('cart');
    }
  }, [user]);

  // Debounced save to server on every cart change (only when logged in)
  useEffect(() => {
    if (!user || isSyncingRef.current) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      saveServerCart(items.map((i) => ({ product: i.product, quantity: i.quantity })))
        .catch(() => {});
    }, 800);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [items, user]);

  // --- Print order ---

  const setPrintOrder = useCallback((order) => {
    if (order) {
      printFilesRef.current = order.fileItems;
      _setPrintOrder({
        fileItems: order.fileItems.map((f) => ({
          name: f.file?.name || f.name,
          size: f.file?.size || f.size || 0,
          pages: f.pages,
          copies: f.copies,
          colorMode: f.colorMode,
          sides: f.sides,
          orientation: f.orientation,
          preview: null,
        })),
        totalPages: order.totalPages,
        totalPrice: order.totalPrice,
        deliveryFee: order.deliveryFee,
        grandTotal: order.grandTotal,
        hasFiles: true,
      });
    } else {
      printFilesRef.current = null;
      _setPrintOrder(null);
    }
  }, []);

  const getPrintOrderWithFiles = useCallback(() => {
    if (!printOrder) return null;
    if (printFilesRef.current) {
      return { ...printOrder, fileItems: printFilesRef.current };
    }
    return { ...printOrder, filesLost: true };
  }, [printOrder]);

  const clearPrintOrder = useCallback(() => {
    printFilesRef.current = null;
    _setPrintOrder(null);
    localStorage.removeItem('printOrder');
  }, []);

  // --- Cart actions ---

  const addItem = useCallback((product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.product === product._id);
      const maxQty = product.stockQty > 0 ? product.stockQty : Infinity;
      if (existing) {
        return prev.map((i) =>
          i.product === product._id
            ? { ...i, quantity: Math.min(i.quantity + qty, maxQty), stockQty: product.stockQty }
            : i
        );
      }
      return [...prev, {
        product: product._id,
        name: product.name,
        price: product.price,
        image: product.image,
        quantity: Math.min(qty, maxQty),
        stockQty: product.stockQty || 0,
      }];
    });
  }, []);

  const removeItem = useCallback((productId) => {
    setItems((prev) => prev.filter((i) => i.product !== productId));
  }, []);

  const updateQty = useCallback((productId, quantity) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.product !== productId));
    } else {
      setItems((prev) =>
        prev.map((i) => {
          if (i.product !== productId) return i;
          const maxQty = i.stockQty > 0 ? i.stockQty : Infinity;
          return { ...i, quantity: Math.min(quantity, maxQty) };
        })
      );
    }
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    clearPrintOrder();
  }, [clearPrintOrder]);

  // --- Totals ---

  const shopSubtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const printSubtotal = useMemo(() => printOrder?.totalPrice || 0, [printOrder]);
  const combinedSubtotal = shopSubtotal + printSubtotal;
  const deliveryFee = useMemo(() => {
    if (items.length === 0 && !printOrder) return 0;
    return combinedSubtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
  }, [combinedSubtotal, items.length, printOrder]);
  const total = combinedSubtotal + deliveryFee;
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const hasAnything = items.length > 0 || !!printOrder;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      subtotal: shopSubtotal, printSubtotal, deliveryFee, total, itemCount,
      printOrder, setPrintOrder, getPrintOrderWithFiles, clearPrintOrder, clearAll, hasAnything,
    }}>
      {children}
    </CartContext.Provider>
  );
};
