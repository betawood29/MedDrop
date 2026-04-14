// Hook — manages push notification permission + subscription lifecycle

import { useState, useEffect, useCallback } from 'react';
import { isPushSupported, getPermissionStatus, subscribeToPush, unsubscribeFromPush } from '../utils/pushNotifications';
import { getVapidPublicKey, saveSubscription, removeSubscription } from '../services/notificationService';
import { useAuth } from './useAuth';

const getVapidKey = async () => {
  const envKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (envKey) return envKey;
  const res = await getVapidPublicKey();
  return res.data.data;
};

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState(getPermissionStatus());
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);

  const supported = isPushSupported();

  // On load: if permission already granted, ensure a valid subscription exists on server
  useEffect(() => {
    if (!user || !supported || permission !== 'granted') return;

    const ensureSubscription = async () => {
      try {
        const vapidKey = await getVapidKey();
        if (!vapidKey) return;

        const registration = await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        // If no subscription exists, or it was created with a different key — resubscribe
        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidKey),
          });
          await saveSubscription(subscription.toJSON());
        } else {
          // Save to server anyway (in case it was never persisted due to missing VAPID)
          await saveSubscription(subscription.toJSON()).catch(() => {});
        }

        setSubscribed(true);
      } catch {
        // Permission might have been revoked or subscription failed
      }
    };

    ensureSubscription();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id, supported, permission]);

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
      const vapidKey = await getVapidKey();
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

// Helper — must be here since the hook uses it directly
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const output = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i);
  return output;
}
