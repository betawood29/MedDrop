// Notification service — sends WhatsApp/SMS order updates to customers
// Uses Twilio WhatsApp Business API (optional — logs to console if not configured)

const sendOrderNotification = async (phone, message) => {
  // If Twilio is not configured, just log the message
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
    console.log(`[NOTIFICATION] To +91${phone}: ${message}`);
    return { success: true, method: 'console' };
  }

  try {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

    await twilio.messages.create({
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:+91${phone}`,
      body: message,
    });

    return { success: true, method: 'whatsapp' };
  } catch (error) {
    console.error('Notification error:', error.message);
    return { success: false, error: error.message };
  }
};

// Pre-built notification messages for each order status
const orderStatusMessages = {
  confirmed: (orderId) => `✅ Order ${orderId} confirmed! We're getting your items ready.`,
  packed: (orderId) => `📦 Order ${orderId} is packed and ready for delivery!`,
  out: (orderId) => `🚗 Order ${orderId} is on its way! Heading to the gate now.`,
  gate: (orderId) => `🏁 Order ${orderId} has arrived at the gate! Come pick it up.`,
  delivered: (orderId) => `🎉 Order ${orderId} delivered! Thanks for using MedDrop.`,
  cancelled: (orderId) => `❌ Order ${orderId} has been cancelled. Contact us if you need help.`,
};

module.exports = { sendOrderNotification, orderStatusMessages };
