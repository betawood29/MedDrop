// Global order notifications — listens for real-time order updates on any page
// Connects to user-specific socket room and shows toast for status changes

import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { ORDER_STATUSES } from '../../utils/constants';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5002';

const STATUS_ICONS = {
  confirmed: '✅',
  packed: '📦',
  out: '🚀',
  gate: '📍',
  delivered: '🎉',
  cancelled: '❌',
};

const OrderNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  useEffect(() => {
    if (!user?.id) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-user', user.id);
    });

    socket.on('order-update', (data) => {
      const statusInfo = ORDER_STATUSES[data.status];
      if (!statusInfo) return;

      const icon = STATUS_ICONS[data.status] || '📋';

      toast(
        (t) => (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => {
              toast.dismiss(t.id);
              navigate(`/orders/${data.orderId}`);
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{icon}</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>
                Order #{data.orderId}
              </div>
              <div style={{ fontSize: '0.82rem', color: '#666' }}>
                {statusInfo.label}
                {data.status === 'gate' && ' — Pick up now!'}
                {data.status === 'delivered' && ' — Enjoy!'}
                {data.status === 'out' && ' — On its way!'}
              </div>
            </div>
          </div>
        ),
        {
          duration: 5000,
          style: {
            padding: '12px 16px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
            border: `2px solid ${statusInfo.color}`,
            maxWidth: '360px',
          },
        }
      );
    });

    return () => {
      socket.disconnect();
    };
  }, [user?.id, navigate]);

  return null; // This component only handles side effects
};

export default OrderNotifications;
