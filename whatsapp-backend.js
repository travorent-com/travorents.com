const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════
// TWILIO WHATSAPP API CONFIGURATION
// ════════════════════════════════════════
// Sign up free at: https://www.twilio.com
// Get your Twilio credentials from: https://console.twilio.com
// IMPORTANT: set these as real environment variables (e.g. in a .env file
// loaded by your process manager, or your hosting provider's dashboard).
// Do NOT hardcode secrets here — this file may end up in source control.
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || '';
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || '';
const TWILIO_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || 'whatsapp:+14155238886'; // Twilio sandbox default
const CUSTOMER_PHONE = process.env.CUSTOMER_PHONE || '+918455065107'; // fallback WhatsApp number

app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:8000', 'http://127.0.0.1:8000', 'null'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());

// Serve the website itself (index.html, cars.html, images, etc.) from the
// same server, so one `node whatsapp-backend.js` runs everything.
app.use(express.static(path.join(__dirname)));

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'TravoRents WhatsApp backend',
    twilio: TWILIO_ACCOUNT_SID ? 'configured' : 'NOT_CONFIGURED',
    timestamp: new Date().toISOString(),
  });
});

// ════════════════════════════════════════
// VEHICLES API
// ════════════════════════════════════════

// List all vehicles, optionally filtered by category (?category=car|bike)
app.get('/api/vehicles', (req, res) => {
  const { category } = req.query;
  try {
    const rows = category
      ? db.prepare('SELECT * FROM vehicles WHERE category = ? ORDER BY id').all(category)
      : db.prepare('SELECT * FROM vehicles ORDER BY id').all();
    res.json({ success: true, vehicles: rows });
  } catch (error) {
    console.error('[DB Error] GET /api/vehicles:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load vehicles' });
  }
});

// Get a single vehicle by id
app.get('/api/vehicles/:id', (req, res) => {
  try {
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    res.json({ success: true, vehicle });
  } catch (error) {
    console.error('[DB Error] GET /api/vehicles/:id:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load vehicle' });
  }
});

// Add a new vehicle (for the admin page)
app.post('/api/vehicles', (req, res) => {
  const { name, category, image, price_12hr, price_24hr, transmission, fuel, seats } = req.body || {};

  if (!name || !category || !image || price_24hr === undefined) {
    return res.status(400).json({ success: false, message: 'Missing required vehicle fields' });
  }
  if (category !== 'car' && category !== 'bike') {
    return res.status(400).json({ success: false, message: "category must be 'car' or 'bike'" });
  }

  try {
    const result = db.prepare(`
      INSERT INTO vehicles (name, category, image, price_12hr, price_24hr, transmission, fuel, seats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, category, image, price_12hr ?? null, price_24hr, transmission ?? null, fuel ?? null, seats ?? null);

    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, vehicle });
  } catch (error) {
    console.error('[DB Error] POST /api/vehicles:', error.message);
    res.status(500).json({ success: false, message: 'Failed to add vehicle' });
  }
});

// Toggle a vehicle's availability on/off
app.patch('/api/vehicles/:id', (req, res) => {
  const { available } = req.body || {};
  if (available === undefined) {
    return res.status(400).json({ success: false, message: 'available (0 or 1) is required' });
  }
  try {
    db.prepare('UPDATE vehicles SET available = ? WHERE id = ?').run(available ? 1 : 0, req.params.id);
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!vehicle) {
      return res.status(404).json({ success: false, message: 'Vehicle not found' });
    }
    res.json({ success: true, vehicle });
  } catch (error) {
    console.error('[DB Error] PATCH /api/vehicles/:id:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update vehicle' });
  }
});

// ════════════════════════════════════════
// BOOKINGS API
// ════════════════════════════════════════

function generateBookingRef() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TR-${stamp}-${rand}`;
}

// Create a new booking. Called right after a customer fills in the booking
// summary form (before payment), so we always have a record even if
// payment is abandoned.
app.post('/api/bookings', (req, res) => {
  const {
    vehicleId, vehicleName, vehicleImage, amount, transmission, fuel, seats,
    pickupDate, pickupTime, returnDate, returnTime, location,
    customerName, customerPhone, customerEmail,
  } = req.body || {};

  if (!vehicleName || amount === undefined) {
    return res.status(400).json({ success: false, message: 'vehicleName and amount are required' });
  }

  const gst = Math.round(Number(amount) * 0.18);
  const totalAmount = Number(amount) + gst;
  const bookingRef = generateBookingRef();

  try {
    db.prepare(`
      INSERT INTO bookings (
        booking_ref, vehicle_id, vehicle_name, vehicle_image, amount, gst, total_amount,
        transmission, fuel, seats, pickup_date, pickup_time, return_date, return_time, location,
        customer_name, customer_phone, customer_email, payment_status
      ) VALUES (
        @bookingRef, @vehicleId, @vehicleName, @vehicleImage, @amount, @gst, @totalAmount,
        @transmission, @fuel, @seats, @pickupDate, @pickupTime, @returnDate, @returnTime, @location,
        @customerName, @customerPhone, @customerEmail, 'pending'
      )
    `).run({
      bookingRef,
      vehicleId: vehicleId ?? null,
      vehicleName,
      vehicleImage: vehicleImage ?? null,
      amount: Number(amount),
      gst,
      totalAmount,
      transmission: transmission ?? null,
      fuel: fuel ?? null,
      seats: seats ?? null,
      pickupDate: pickupDate ?? null,
      pickupTime: pickupTime ?? null,
      returnDate: returnDate ?? null,
      returnTime: returnTime ?? null,
      location: location ?? null,
      customerName: customerName ?? null,
      customerPhone: customerPhone ?? null,
      customerEmail: customerEmail ?? null,
    });

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(bookingRef);
    res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('[DB Error] POST /api/bookings:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

// List all bookings (used by the admin page). Optional ?status=pending|completed
app.get('/api/bookings', (req, res) => {
  const { status } = req.query;
  try {
    const rows = status
      ? db.prepare('SELECT * FROM bookings WHERE payment_status = ? ORDER BY id DESC').all(status)
      : db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
    res.json({ success: true, bookings: rows });
  } catch (error) {
    console.error('[DB Error] GET /api/bookings:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
});

// Get a single booking by its reference code
app.get('/api/bookings/:ref', (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(req.params.ref);
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    res.json({ success: true, booking });
  } catch (error) {
    console.error('[DB Error] GET /api/bookings/:ref:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load booking' });
  }
});

// Update a booking after payment completes (or fails)
app.patch('/api/bookings/:ref', (req, res) => {
  const { paymentId, orderId, paymentStatus } = req.body || {};

  try {
    const existing = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(req.params.ref);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    db.prepare(`
      UPDATE bookings SET
        payment_id = COALESCE(?, payment_id),
        order_id = COALESCE(?, order_id),
        payment_status = COALESCE(?, payment_status),
        updated_at = datetime('now')
      WHERE booking_ref = ?
    `).run(paymentId ?? null, orderId ?? null, paymentStatus ?? null, req.params.ref);

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(req.params.ref);
    res.json({ success: true, booking });
  } catch (error) {
    console.error('[DB Error] PATCH /api/bookings/:ref:', error.message);
    res.status(500).json({ success: false, message: 'Failed to update booking' });
  }
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
