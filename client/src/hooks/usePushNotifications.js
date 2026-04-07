// Hook — manages push notification permission + subscription lifecycle

import { useState, useEffect, useCallback } from 'react';
import { isPushSupported, getPermissionStatus, subscribeToPush, unsubscribeFromPush } from '../utils/pushNotifications';
import { getVapidPublicKey, saveSubscription, removeSubscription } from '../services/notificationService';
import { useAuth } from './useAuth';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState(getPermissionStatus());
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const supported = isPushSupported();

  // Auto-subscribe if permission was already granted (e.g. after page reload)
  useEffect(() => {
    if (!user || !supported || permission !== 'granted') return;

    navigator.serviceWorker.register('/sw.js').then(async (reg) => {
      await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      if (existing) setSubscribed(true);
    }).catch(() => {});
  }, [user, supported, permission]);

  // Handle navigation messages from service worker (notificationclick)
  useEffect(() => {
    const handler = (event) => {
      if (event.data?.type === 'NAVIGATE') {
        window.location.href = event.data.url;
      }
    };
    navigator.serviceWorker?.addEventListener('message', handler);
    return () => navigator.serviceWorker?.removeEventListener('message', handler);
  }, []);

  const enable = useCallback(async () => {
    if (!supported || !user) return;
    setLoading(true);
    try {
      // Try env var first (avoids extra API call), fall back to server
      let vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        const keyRes = await getVapidPublicKey();
        vapidKey = keyRes.data.data;
      }
      if (!vapidKey) throw new Error('VAPID key not configured');

      const subscription = await subscribeToPush(vapidKey);
      if (!subscription) {
        setPermission('denied');
        return;
      }
      await saveSubscription(subscription.toJSON());
      setPermission('granted');
      setSubscribed(true);
    } catch (err) {
      console.error('Push subscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, [user, supported]);

  const disable = useCallback(async () => {
    setLoading(true);
    try {
      const endpoint = await unsubscribeFromPush();
      if (endpoint) await removeSubscription(endpoint);
      setSubscribed(false);
    } catch (err) {
      console.error('Push unsubscribe error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return { supported, permission, subscribed, loading, enable, disable };
};
