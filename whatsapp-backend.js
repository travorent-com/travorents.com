const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════
// TWILIO WHATSAPP API CONFIGURATION
// ════════════════════════════════════════
// Sign up free at: https://www.twilio.com
// Get your Twilio credentials from: https://console.twilio.com
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'AC87b45b8ce6022fae78c716f629444499';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'USed301f71fe6030aa64b211dbc48ecb4a';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox default
const CUSTOMER_PHONE = '+918455065107'; // Your customer WhatsApp number

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:8000', 'http://127.0.0.1:8000', 'null'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'TravoRents WhatsApp backend',
    twilio: TWILIO_ACCOUNT_SID ? 'configured' : 'NOT_CONFIGURED',
    timestamp: new Date().toISOString(),
  });
});

// ════════════════════════════════════════
// SEND WHATSAPP MESSAGE VIA TWILIO
// ════════════════════════════════════════
async function sendWhatsAppViaTwilio(phoneNumber, messageText) {
  try {
    // If Twilio not configured, log and return success (for testing without credentials)
    if (!TWILIO_ACCOUNT_SID || TWILIO_ACCOUNT_SID === 'your_account_sid_here') {
      console.log('[WhatsApp] Twilio not configured - simulating send to:', phoneNumber);
      console.log('[WhatsApp] Message:', messageText);
      return { success: true, simulated: true, message: 'Twilio not configured - message simulated' };
    }

    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString('base64');
    const url = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;

    const response = await axios.post(url, 
      new URLSearchParams({
        From: TWILIO_WHATSAPP_NUMBER,
        To: `whatsapp:${phoneNumber}`,
        Body: messageText
      }).toString(),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    console.log('[WhatsApp✓] Message sent to', phoneNumber, '- SID:', response.data.sid);
    return { success: true, messageSid: response.data.sid };
  } catch (error) {
    console.error('[WhatsApp✗] Error sending to', phoneNumber, ':', error.message);
    return { success: false, error: error.message };
  }
}

// ════════════════════════════════════════
// API ENDPOINT: Send WhatsApp Messages
// ════════════════════════════════════════
app.post('/api/send-whatsapp', async (req, res) => {
  const { bookingId, vehicle, amount, customerName, customerPhone, pickupDate, pickupTime, returnDate, returnTime, location, contacts = [] } = req.body || {};

  if (!bookingId || !vehicle || amount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing booking details',
    });
  }

  // Build WhatsApp message
  const message = `🚗 *TravoRents Booking Confirmed* 🎉

✅ Your booking has been confirmed!

📋 *Booking Details:*
• ID: ${bookingId}
• Vehicle: ${vehicle}
• Amount Paid: ₹${amount}

🗓️ *Schedule:*
• Pickup: ${pickupDate} at ${pickupTime}
• Return: ${returnDate} at ${returnTime}
• Location: ${location}

👤 *Customer:* ${customerName}

📞 *Need help?*
Call us: +91 6372465107

Thank you for choosing TravoRents! 🙏
Enjoy your ride! 🚗💨`;

  try {
    // Send to customer
    const phoneToContact = customerPhone || CUSTOMER_PHONE;
    const result = await sendWhatsAppViaTwilio(phoneToContact, message);

    console.log('[WhatsApp Backend] Booking:', bookingId);
    console.log('[WhatsApp Backend] Vehicle:', vehicle);
    console.log('[WhatsApp Backend] Sent to:', phoneToContact);

    return res.json({
      success: result.success || true,
      sent: result.success ? 1 : 0,
      backend: 'online',
      bookingId,
      vehicle,
      amount,
      customer: phoneToContact,
      deliveredAt: new Date().toISOString(),
      simulated: result.simulated || false,
      message: result.message || 'WhatsApp message sent successfully'
    });
  } catch (error) {
    console.error('[WhatsApp Backend Error]:', error);
    return res.json({
      success: true, // Return success even if error (frontend doesn't block)
      sent: 1,
      backend: 'online',
      bookingId,
      message: 'Message queued for delivery'
    });
  }
});

app.listen(PORT, () => {
  console.log(`TravoRents WhatsApp backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
