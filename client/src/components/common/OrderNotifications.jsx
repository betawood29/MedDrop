// Global order notifications — real-time toast updates + Web Push permission prompt

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { ORDER_STATUSES, SOCKET_URL } from '../../utils/constants';

const STATUS_ICONS = {
  confirmed: '✅',
  packed: '📦',
  out: '🚀',
  gate: '📍',
  delivered: '🎉',
  cancelled: '❌',
};

const PROMPT_KEY = 'push-prompt-dismissed';
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isInStandaloneMode = window.navigator.standalone === true;

const OrderNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const { supported, permission, subscribed, loading, enable } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);

  // Show push permission prompt once per session to logged-in users
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(PROMPT_KEY)) return;

    const timer = setTimeout(() => {
      if (isIOS && !isInStandaloneMode) {
        // iPhone in Safari — show "add to home screen" hint instead
        setShowIOSHint(true);
      } else if (supported && permission !== 'granted' && permission !== 'denied' && !subscribed) {
        setShowPrompt(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [user, supported, permission, subscribed]);

  const handleEnable = async () => {
    setShowPrompt(false);
    await enable();
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    sessionStorage.setItem(PROMPT_KEY, '1');
  };

  // Socket — real-time in-app toasts
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

    return () => socket.disconnect();
  }, [user?.id, navigate]);

  if (!showPrompt && !showIOSHint) return null;

  if (showIOSHint) {
    return (
      <div className="push-prompt">
        <div className="push-prompt-icon">📲</div>
        <div className="push-prompt-text">
          <strong>Get order notifications on iPhone</strong>
          <span>Tap <b>Share</b> → <b>Add to Home Screen</b> to enable push notifications</span>
        </div>
        <div className="push-prompt-actions">
          <button className="push-prompt-dismiss" onClick={handleDismiss}>Got it</button>
        </div>
      </div>
    );
  }

  return (
    <div className="push-prompt">
      <div className="push-prompt-icon">🔔</div>
      <div className="push-prompt-text">
        <strong>Stay updated on your orders</strong>
        <span>Get notified even when you're not on the site</span>
      </div>
      <div className="push-prompt-actions">
        <button className="btn-primary push-prompt-btn" onClick={handleEnable} disabled={loading}>
          {loading ? 'Enabling...' : 'Enable'}
        </button>
        <button className="push-prompt-dismiss" onClick={handleDismiss}>Not now</button>
      </div>
    </div>
  );
};

export default OrderNotifications;
