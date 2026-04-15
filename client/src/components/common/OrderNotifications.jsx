// Global order notifications — real-time toast updates + Web Push permission prompt

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { ORDER_STATUSES, SOCKET_URL } from '../../utils/constants';

const STATUS_LABELS = {
  confirmed: { icon: '✅', extra: '' },
  packed:    { icon: '📦', extra: '' },
  out:       { icon: '🚀', extra: ' — On its way!' },
  gate:      { icon: '📍', extra: ' — Pick up now!' },
  delivered: { icon: '🎉', extra: '' },
  cancelled: { icon: '❌', extra: '' },
};

const PROMPT_KEY = 'push-prompt-dismissed';
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isAndroid = /android/i.test(navigator.userAgent);
const isMobileDevice = isIOS || isAndroid;
const isInStandaloneMode =
  window.navigator.standalone === true ||
  window.matchMedia('(display-mode: standalone)').matches;

// ─── Feedback modal ───────────────────────────────────────────────────────────
const FeedbackModal = ({ orderId, onRate, onDismiss }) => (
  <div
    className="modal-overlay"
    style={{ zIndex: 1500 }}
    onClick={onDismiss}
  >
    <div
      className="modal"
      style={{ maxWidth: 360, textAlign: 'center', padding: '32px 24px' }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>⭐</div>
      <h3 style={{ margin: '0 0 8px', fontSize: '1.1rem', fontWeight: 700 }}>
        How was your delivery?
      </h3>
      <p style={{ margin: '0 0 20px', fontSize: '0.85rem', color: '#6b7280' }}>
        Order #{orderId} has arrived! It takes just 10 seconds to leave a review.
      </p>
      <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
        <button
          className="btn-primary"
          style={{ padding: '10px 22px', fontSize: '0.9rem' }}
          onClick={onRate}
        >
          Leave a Review
        </button>
        <button
          onClick={onDismiss}
          style={{
            padding: '10px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
            background: '#f8fafc', color: '#6b7280', fontWeight: 600,
            fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          Maybe Later
        </button>
      </div>
    </div>
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

const OrderNotifications = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  // Stable ref — always has the latest navigate without causing socket reconnects
  const navigateRef = useRef(navigate);
  const socketRef   = useRef(null);

  useEffect(() => { navigateRef.current = navigate; });

  const { supported, permission, subscribed, loading, enable } = usePushNotifications();

  const [showPrompt, setShowPrompt]             = useState(false);
  const [showIOSHint, setShowIOSHint]           = useState(false);
  const [showAndroidInstall, setShowAndroidInstall] = useState(false);
  const deferredPromptRef = useRef(null);

  // Feedback modal state
  const [feedbackOrder, setFeedbackOrder] = useState(null); // orderId string | null

  // Capture Android/desktop "Add to Home Screen" browser event
  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  // Show the right push-permission prompt once per session
  useEffect(() => {
    if (!user) return;
    if (sessionStorage.getItem(PROMPT_KEY)) return;
    const timer = setTimeout(() => {
      if (isIOS && !isInStandaloneMode) {
        setShowIOSHint(true);
      } else if (isMobileDevice && !isInStandaloneMode && deferredPromptRef.current) {
        setShowAndroidInstall(true);
      } else if (supported && permission !== 'granted' && permission !== 'denied' && !subscribed) {
        setShowPrompt(true);
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [user, supported, permission, subscribed]);

  const handleEnable = async () => { setShowPrompt(false); await enable(); };
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

  // ─── Socket — real-time in-app toasts ──────────────────────────────────────
  // Only depends on user._id — the socket is never torn down due to navigation.
  useEffect(() => {
    if (!user?._id) return;

    const userId = user._id;
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;

    // Rejoin user room on every (re)connect so membership survives network drops
    socket.on('connect', () => {
      socket.emit('join-user', userId);
    });

    socket.on('order-update', (data) => {
      const statusInfo = ORDER_STATUSES[data.status];
      if (!statusInfo) return;

      const cfg = STATUS_LABELS[data.status];
      const icon = cfg?.icon ?? '📋';
      const extra = cfg?.extra ?? '';

      if (data.status === 'delivered') {
        // Simple, reliable toast — no render function
        toast.success(
          `${icon} Order #${data.orderId} delivered!`,
          {
            duration: 6000,
            style: {
              border: `2px solid ${statusInfo.color}`,
              fontWeight: 600,
              maxWidth: '360px',
            },
          }
        );
        // Show feedback popup after the delivered toast has been visible a moment
        setTimeout(() => setFeedbackOrder(data.orderId), 3000);
      } else {
        toast(
          `${icon} Order #${data.orderId}: ${statusInfo.label}${extra}`,
          {
            duration: 5000,
            style: {
              border: `2px solid ${statusInfo.color}`,
              maxWidth: '360px',
              fontWeight: 500,
            },
          }
        );
      }
    });

    return () => socket.disconnect();
  }, [user?._id]); // navigate lives in navigateRef — no reconnect needed
  // ───────────────────────────────────────────────────────────────────────────

  // Push-prompt UI
  const pushPromptVisible = showPrompt || showIOSHint || showAndroidInstall;

  return (
    <>
      {/* ── Feedback modal (shown after delivery) ── */}
      {feedbackOrder && (
        <FeedbackModal
          orderId={feedbackOrder}
          onRate={() => {
            const orderId = feedbackOrder;
            setFeedbackOrder(null);
            navigateRef.current(`/orders/${orderId}`);
          }}
          onDismiss={() => setFeedbackOrder(null)}
        />
      )}

      {/* ── Web Push permission prompt ── */}
      {pushPromptVisible && (
        <>
          {showIOSHint && (
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
          )}

          {showAndroidInstall && (
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
          )}

          {showPrompt && (
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
          )}
        </>
      )}
    </>
  );
};

export default OrderNotifications;
