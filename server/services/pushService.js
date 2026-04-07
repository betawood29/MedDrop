// Web Push service — sends push notifications to subscribed devices

const webpush = require('web-push');

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
    user.pushSubscriptions.map((sub) => webpush.sendNotification(sub, payload))
  );

  // Remove expired/invalid subscriptions (410 Gone)
  const expiredEndpoints = [];
  results.forEach((result, i) => {
    if (result.status === 'rejected' && result.reason?.statusCode === 410) {
      expiredEndpoints.push(user.pushSubscriptions[i].endpoint);
    }
  });

  if (expiredEndpoints.length) {
    user.pushSubscriptions = user.pushSubscriptions.filter(
      (s) => !expiredEndpoints.includes(s.endpoint)
    );
    await user.save();
  }
};

module.exports = { sendOrderPush };
