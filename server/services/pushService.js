// Web Push service — sends push notifications to subscribed devices

const webpush = require('web-push');
const User = require('../models/User');

// Only configure if keys are present — avoids crash on missing env vars
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:admin@meddrop.app',
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );
}

const STATUS_MESSAGES = {
  confirmed:  { title: 'Order Confirmed ✅',   body: 'Your order #{id} has been confirmed!' },
  packed:     { title: 'Order Packed 📦',       body: 'Your order #{id} is packed and ready.' },
  out:        { title: 'Out for Delivery 🚀',   body: 'Your order #{id} is on its way!' },
  gate:       { title: 'At the Gate 📍',        body: 'Your order #{id} is at the gate. Pick up now!' },
  delivered:  { title: 'Delivered 🎉',          body: 'Your order #{id} has been delivered. Enjoy!' },
  cancelled:  { title: 'Order Cancelled ❌',    body: 'Your order #{id} has been cancelled.' },
};

// Send push notification to all subscribed devices of a user
const sendOrderPush = async (user, orderId, status) => {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return;
  if (!user.pushSubscriptions || !user.pushSubscriptions.length) return;

  const msg = STATUS_MESSAGES[status];
  if (!msg) return;

  const payload = JSON.stringify({
    title: msg.title,
    body: msg.body.replace('#{id}', orderId),
    url: `/orders/${orderId}`,
    tag: `order-${orderId}`,
  });

  const results = await Promise.allSettled(
    user.pushSubscriptions.map((sub) =>
      webpush.sendNotification(
        // Pass a plain object — webpush doesn't understand Mongoose subdocuments
        { endpoint: sub.endpoint, keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth } },
        payload
      )
    )
  );

  // Collect endpoints to remove: 410 Gone (expired) and 401/403 (invalid VAPID key)
  const staleEndpoints = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected') {
      const code = result.reason?.statusCode;
      if (code === 410) {
        // Subscription expired — remove it
        staleEndpoints.push(user.pushSubscriptions[i].endpoint);
      } else if (code === 401 || code === 403) {
        // VAPID key mismatch — subscription was created with a different key
        console.error(`[Push] 401/403 for ${user.pushSubscriptions[i].endpoint} — subscription may be stale (VAPID key changed). Removing.`);
        staleEndpoints.push(user.pushSubscriptions[i].endpoint);
      } else {
        console.error(`[Push] Failed to send to ${user.pushSubscriptions[i].endpoint}:`, result.reason?.message || result.reason);
      }
    }
  });

  // Use atomic update instead of save() to avoid corrupting partial document
  if (staleEndpoints.length) {
    await User.updateOne(
      { _id: user._id },
      { $pull: { pushSubscriptions: { endpoint: { $in: staleEndpoints } } } }
    ).catch((err) => console.error('[Push] Failed to remove stale subscriptions:', err));
  }
};

module.exports = { sendOrderPush };
