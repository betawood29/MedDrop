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
const isAndroid = /android/i.test(navigator.userAgent);
const isMobileDevice = isIOS || isAndroid;
const isInStandaloneMode =
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

const OrderNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socketRef = useRef(null);
  const { supported, permission, subscribed, loading, enable } = usePushNotifications();
  const [showPrompt, setShowPrompt] = useState(false);
  const [showIOSHint, setShowIOSHint] = useState(false);
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const deferredPromptRef = useRef(null);

  // Capture Android/desktop "Add to Home Screen" browser event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Show the right prompt once per session to logged-in users
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(PROMPT_KEY)) return;

    const timer = setTimeout(() => {
      if (isIOS && !isInStandaloneMode) {
        // iOS in Safari — must install first to get push
        setShowIOSHint(true);
      } else if (isMobileDevice && !isInStandaloneMode && deferredPromptRef.current) {
        // Android — native install banner available (desktop skips this, goes to push prompt directly)
        setShowAndroidInstall(true);
      } else if (supported && permission !== 'granted' && permission !== 'denied' && !subscribed) {
        // Already installed (standalone) or browser that supports push directly
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
    setShowIOSHint(false);
    setShowAndroidInstall(false);
    sessionStorage.setItem(PROMPT_KEY, '1');
  };

  const handleAndroidInstall = async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    deferredPromptRef.current = null;
    setShowAndroidInstall(false);
    if (outcome === 'accepted') sessionStorage.setItem(PROMPT_KEY, '1');
  };

  // Socket — real-time in-app toasts
  useEffect(() => {
    if (!user?._id) return;

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-user', user._id);
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

      // After delivery — nudge for a review (delay slightly so order toast clears first)
      if (data.status === 'delivered') {
        setTimeout(() => {
          toast(
            (t) => (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>🌟 How was your experience?</div>
                <div style={{ fontSize: '0.82rem', color: '#666' }}>
                  Tell us how Order #{data.orderId} went — it takes 10 seconds!
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={() => { toast.dismiss(t.id); navigate(`/orders/${data.orderId}`); }}
                    style={{
                      flex: 1, padding: '6px 0', borderRadius: 8,
                      background: '#7c3aed', color: 'white',
                      border: 'none', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer',
                    }}
                  >
                    Rate Now
                  </button>
                  <button
                    onClick={() => toast.dismiss(t.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 8,
                      background: '#f1f5f9', color: '#475569',
                      border: 'none', fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
                    }}
                  >
                    Later
                  </button>
                </div>
              </div>
            ),
            { duration: 10000, style: { padding: '14px 16px', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.15)', border: '2px solid #7c3aed', maxWidth: '360px' } }
          );
        }, 6000);
      }
    });

    return () => socket.disconnect();
  }, [user?._id, navigate]);

  if (!showPrompt && !showIOSHint && !showAndroidInstall) return null;

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

  if (showAndroidInstall) {
    return (
      <div className="push-prompt">
        <div className="push-prompt-icon">📲</div>
        <div className="push-prompt-text">
          <strong>Add MedDrop to Home Screen</strong>
          <span>Install for faster access and order notifications</span>
        </div>
        <div className="push-prompt-actions">
          <button className="btn-primary push-prompt-btn" onClick={handleAndroidInstall}>Install</button>
          <button className="push-prompt-dismiss" onClick={handleDismiss}>Not now</button>
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
