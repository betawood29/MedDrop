// Socket.io hook for real-time order tracking

import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { SOCKET_URL } from '../utils/constants';

export const useSocket = (orderId, onUpdate) => {
  const socketRef = useRef(null);
  const onUpdateRef = useRef(onUpdate);

  // Keep callback ref fresh without causing reconnect
  useEffect(() => {
    onUpdateRef.current = onUpdate;
  }, [onUpdate]);

  useEffect(() => {
    if (!orderId) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-order', orderId);
    });

    socket.on('order-update', (data) => {
      if (onUpdateRef.current) onUpdateRef.current(data);
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  return socketRef.current;
};

// Hook for shop pages — live product updates (stock, price changes from admin)
export const useShopSocket = (onProductUpdate) => {
  const socketRef = useRef(null);
  const callbackRef = useRef(onProductUpdate);

  useEffect(() => {
    callbackRef.current = onProductUpdate;
  }, [onProductUpdate]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-shop');
    });

    socket.on('product-update', (data) => {
      if (callbackRef.current) callbackRef.current(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
};

// Hook for admin — listens for new orders AND product updates (stock changes from user purchases)
export const useAdminSocket = (onNewOrder, onProductUpdate) => {
  const socketRef = useRef(null);
  const onNewOrderRef = useRef(onNewOrder);
  const onProductUpdateRef = useRef(onProductUpdate);

  useEffect(() => {
    onNewOrderRef.current = onNewOrder;
  }, [onNewOrder]);

  useEffect(() => {
    onProductUpdateRef.current = onProductUpdate;
  }, [onProductUpdate]);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-admin');
    });

    socket.on('new-order', (data) => {
      if (onNewOrderRef.current) onNewOrderRef.current(data);
    });

    socket.on('product-update', (data) => {
      if (onProductUpdateRef.current) onProductUpdateRef.current(data);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return socketRef.current;
};
