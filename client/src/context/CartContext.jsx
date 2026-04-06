// Cart context — manages shopping cart + print order state
// Shop items persist to localStorage; print order stays in memory (files can't serialize)

import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
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

  // Print order stored in memory (File objects can't be serialized)
  const [printOrder, setPrintOrder] = useState(null);

  // Persist cart to localStorage
  useEffect(() => {
    localStorage.setItem('cart', JSON.stringify(items));
  }, [items]);

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

  const clearPrintOrder = useCallback(() => {
    setPrintOrder(null);
  }, []);

  const clearAll = useCallback(() => {
    setItems([]);
    setPrintOrder(null);
  }, []);

  const subtotal = useMemo(() => items.reduce((sum, i) => sum + i.price * i.quantity, 0), [items]);
  const deliveryFee = useMemo(() => {
    const shopDelivery = items.length > 0 ? (subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE) : 0;
    return shopDelivery;
  }, [subtotal, items.length]);
  const total = useMemo(() => subtotal + deliveryFee, [subtotal, deliveryFee]);
  const itemCount = useMemo(() => items.reduce((sum, i) => sum + i.quantity, 0), [items]);

  const hasAnything = items.length > 0 || !!printOrder;

  return (
    <CartContext.Provider value={{
      items, addItem, removeItem, updateQty, clearCart,
      subtotal, deliveryFee, total, itemCount,
      printOrder, setPrintOrder, clearPrintOrder, clearAll, hasAnything,
    }}>
      {children}
    </CartContext.Provider>
  );
};
