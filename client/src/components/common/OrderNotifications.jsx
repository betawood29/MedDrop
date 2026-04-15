// Global order notifications — real-time toast updates + Web Push permission prompt

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { io } from 'socket.io-client';
import { useAuth } from '../../hooks/useAuth';
import { usePushNotifications } from '../../hooks/usePushNotifications';
import { ORDER_STATUSES, PRINT_ORDER_STATUSES, SOCKET_URL } from '../../utils/constants';

const STATUS_ICONS = {
  confirmed: '✅',
  packed: '📦',
  out: '🚀',
  gate: '📍',
  delivered: '🎉',
  cancelled: '❌',
  printing: '🖨️',
  ready: '📄',
};

const PROMPT_KEY = 'push-prompt-dismissed';
const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
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
      } else if (!isInStandaloneMode && deferredPromptRef.current) {
        // Android/desktop — native install banner available
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
      const isPrint = data.type === 'print';
      const statusInfo = isPrint
        ? PRINT_ORDER_STATUSES[data.status]
        : ORDER_STATUSES[data.status];
      if (!statusInfo) return;

      const icon = STATUS_ICONS[data.status] || '📋';
      const orderPath = isPrint ? `/orders/print/${data.orderId}` : `/orders/${data.orderId}`;

      toast(
        (t) => (
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
            onClick={() => {
              toast.dismiss(t.id);
              navigate(orderPath);
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

    // Prescription status updates
    socket.on('prescription-update', (data) => {
      const DELIVERY_ICONS = {
        delivery_preparing: { icon: '💊', title: 'Medicines Being Prepared', color: '#3b82f6' },
        delivery_out:       { icon: '🚀', title: 'Out for Delivery',          color: '#f97316' },
        delivery_delivered: { icon: '🎉', title: 'Medicines Delivered!',      color: '#22c55e' },
      };

      const deliveryInfo = DELIVERY_ICONS[data.status];
      if (deliveryInfo) {
        toast(
          (t) => (
            <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
              onClick={() => { toast.dismiss(t.id); navigate('/prescription'); }}>
              <span style={{ fontSize:'1.5rem' }}>{deliveryInfo.icon}</span>
              <div>
                <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{deliveryInfo.title}</div>
                <div style={{ fontSize:'0.82rem', color:'#666' }}>{data.adminNote || ''}</div>
              </div>
            </div>
          ),
          { duration:5000, style:{ padding:'12px 16px', borderRadius:'12px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', border:`2px solid ${deliveryInfo.color}`, maxWidth:'360px' } }
        );
        return;
      }

      const STATUS_TOAST = {
        approved:               { icon: '✅', color: '#22c55e', title: 'Prescription Approved!',           sub: 'Tap to order your medicines.' },
        partially_approved:     { icon: '✅', color: '#3b82f6', title: 'Prescription Partially Approved',  sub: 'Some medicines approved — tap to fill cart.' },
        rejected:               { icon: '❌', color: '#ef4444', title: 'Prescription Rejected',            sub: data.adminNote ? `Reason: ${data.adminNote}` : 'Please upload a new prescription.' },
        clarification_required: { icon: '💬', color: '#8b5cf6', title: 'Clarification Needed',            sub: data.clarificationMessage || 'Our pharmacist needs more info — tap to respond.' },
      };
      const info = STATUS_TOAST[data.status];
      if (!info) return;
      const icon        = info.icon;
      const borderColor = info.color;
      const title       = info.title;
      const subtitle    = info.sub;

      toast(
        (t) => (
          <div style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer' }}
            onClick={() => { toast.dismiss(t.id); navigate('/prescription'); }}>
            <span style={{ fontSize:'1.5rem' }}>{icon}</span>
            <div>
              <div style={{ fontWeight:700, fontSize:'0.9rem' }}>{title}</div>
              <div style={{ fontSize:'0.82rem', color:'#666' }}>{subtitle}</div>
            </div>
          </div>
        ),
        { duration:6000, style:{ padding:'12px 16px', borderRadius:'12px', boxShadow:'0 8px 24px rgba(0,0,0,0.15)', border:`2px solid ${borderColor}`, maxWidth:'360px' } }
      );
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
