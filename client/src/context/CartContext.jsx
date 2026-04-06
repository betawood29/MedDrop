// Cart context — manages shopping cart + print order state
// Shop items persist to localStorage
// Print order: metadata persists to localStorage, File objects stored in memory

import { createContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { DELIVERY_FEE, FREE_DELIVERY_MIN } from '../utils/constants';

export const CartContext = createContext(null);

export const CartProvider = ({ children }) => {
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

  const setPrintOrder = useCallback((order) => {
    if (order) {
      // Store File objects separately in memory
      printFilesRef.current = order.fileItems;
      // Store serializable metadata
      _setPrintOrder({
        fileItems: order.fileItems.map((f) => ({
          // Serializable fields only
          name: f.file?.name || f.name,
          size: f.file?.size || f.size || 0,
          pages: f.pages,
          copies: f.copies,
          colorMode: f.colorMode,
          sides: f.sides,
          orientation: f.orientation,
          preview: null, // Can't serialize blob URLs
        })),
        totalPages: order.totalPages,
        totalPrice: order.totalPrice,
        deliveryFee: order.deliveryFee,
        grandTotal: order.grandTotal,
        hasFiles: true, // Files are in memory
      });
    } else {
      printFilesRef.current = null;
      _setPrintOrder(null);
    }
  }, []);

  // Get print order with File objects attached (for submission and edit)
  const getPrintOrderWithFiles = useCallback(() => {
    if (!printOrder) return null;
    if (printFilesRef.current) {
      return { ...printOrder, fileItems: printFilesRef.current };
    }
    // Files lost (page refresh) — return metadata with flag
    return { ...printOrder, filesLost: true };
  }, [printOrder]);

  const clearPrintOrder = useCallback(() => {
    printFilesRef.current = null;
    _setPrintOrder(null);
    localStorage.removeItem('printOrder');
  }, []);

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

  // Combined totals — delivery is based on total order value
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
