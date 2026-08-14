const originalPort = process.env.PORT;
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const crypto = require('node:crypto');
const path = require('path');
const db = require('./db');

const app = express();
const PORT = originalPort || process.env.PORT || 3000;

// ════════════════════════════════════════
// PHONEPE CONFIGURATION
// ════════════════════════════════════════
const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || '';
const PHONEPE_SALT_KEY    = process.env.PHONEPE_SALT_KEY    || '';
const PHONEPE_SALT_INDEX  = process.env.PHONEPE_SALT_INDEX  || '1';
const PHONEPE_ENV         = process.env.PHONEPE_ENV         || 'UAT'; // 'UAT' or 'PRODUCTION'

const PHONEPE_BASE_URL = PHONEPE_ENV === 'PRODUCTION'
  ? 'https://api.phonepe.com/apis/hermes'
  : 'https://api-preprod.phonepe.com/apis/pg-sandbox';

// ════════════════════════════════════════
// META WHATSAPP CLOUD API CONFIGURATION
// ════════════════════════════════════════
const WA_TOKEN      = process.env.WHATSAPP_TOKEN            || '';
const WA_PHONE_ID   = process.env.WHATSAPP_PHONE_NUMBER_ID  || '';
const WA_VERSION    = process.env.WHATSAPP_API_VERSION      || 'v19.0';
const OWNER_PHONE   = process.env.OWNER_WHATSAPP_NUMBER     || '918455065107';

// ════════════════════════════════════════
// APP BASE URL (for redirects)
// ════════════════════════════════════════
const APP_BASE_URL = process.env.APP_BASE_URL || `http://localhost:${PORT}`;

// Manual CORS middleware to ensure headers are set on all requests
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ════════════════════════════════════════
// HEALTH CHECK
// ════════════════════════════════════════
app.get('/', (req, res) => {
  res.status(200).send('OK');
});

app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    service: 'TravoRents Backend',
    phonepe: PHONEPE_MERCHANT_ID ? 'configured' : 'NOT_CONFIGURED',
    whatsapp: WA_TOKEN ? 'configured' : 'NOT_CONFIGURED',
    timestamp: new Date().toISOString(),
  });
});

// ════════════════════════════════════════
// VEHICLES API
// ════════════════════════════════════════
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

app.get('/api/vehicles/:id', (req, res) => {
  try {
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load vehicle' });
  }
});

app.post('/api/vehicles', (req, res) => {
  const { name, category, image, price_12hr, price_24hr, transmission, fuel, seats } = req.body || {};
  if (!name || !category || !image || price_24hr === undefined)
    return res.status(400).json({ success: false, message: 'Missing required vehicle fields' });
  if (category !== 'car' && category !== 'bike')
    return res.status(400).json({ success: false, message: "category must be 'car' or 'bike'" });
  try {
    const result = db.prepare(`
      INSERT INTO vehicles (name, category, image, price_12hr, price_24hr, transmission, fuel, seats)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, category, image, price_12hr ?? null, price_24hr, transmission ?? null, fuel ?? null, seats ?? null);
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add vehicle' });
  }
});

app.patch('/api/vehicles/:id', (req, res) => {
  const { available } = req.body || {};
  if (available === undefined)
    return res.status(400).json({ success: false, message: 'available (0 or 1) is required' });
  try {
    db.prepare('UPDATE vehicles SET available = ? WHERE id = ?').run(available ? 1 : 0, req.params.id);
    const vehicle = db.prepare('SELECT * FROM vehicles WHERE id = ?').get(req.params.id);
    if (!vehicle) return res.status(404).json({ success: false, message: 'Vehicle not found' });
    res.json({ success: true, vehicle });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update vehicle' });
  }
});

// ════════════════════════════════════════
// BOOKINGS API
// ════════════════════════════════════════
function generateBookingRef() {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand  = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `TR-${stamp}-${rand}`;
}

app.post('/api/bookings', (req, res) => {
  const {
    vehicleId, vehicleName, vehicleImage, amount, transmission, fuel, seats,
    pickupDate, pickupTime, returnDate, returnTime, location,
    customerName, customerPhone, customerEmail,
  } = req.body || {};

  if (!vehicleName || amount === undefined)
    return res.status(400).json({ success: false, message: 'vehicleName and amount are required' });

  const gst         = Math.round(Number(amount) * 0.18);
  const totalAmount = Number(amount) + gst;
  const bookingRef  = generateBookingRef();

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
      bookingRef, vehicleId: vehicleId ?? null, vehicleName,
      vehicleImage: vehicleImage ?? null, amount: Number(amount), gst, totalAmount,
      transmission: transmission ?? null, fuel: fuel ?? null, seats: seats ?? null,
      pickupDate: pickupDate ?? null, pickupTime: pickupTime ?? null,
      returnDate: returnDate ?? null, returnTime: returnTime ?? null,
      location: location ?? null, customerName: customerName ?? null,
      customerPhone: customerPhone ?? null, customerEmail: customerEmail ?? null,
    });

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(bookingRef);
    res.status(201).json({ success: true, booking });
  } catch (error) {
    console.error('[DB Error] POST /api/bookings:', error.message);
    res.status(500).json({ success: false, message: 'Failed to create booking' });
  }
});

app.get('/api/bookings', (req, res) => {
  const { status } = req.query;
  try {
    const rows = status
      ? db.prepare('SELECT * FROM bookings WHERE payment_status = ? ORDER BY id DESC').all(status)
      : db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
    res.json({ success: true, bookings: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load bookings' });
  }
});

app.get('/api/bookings/:ref', (req, res) => {
  try {
    const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(req.params.ref);
    if (!booking) return res.status(404).json({ success: false, message: 'Booking not found' });
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to load booking' });
  }
});

app.patch('/api/bookings/:ref', (req, res) => {
  const { paymentId, orderId, place, paymentStatus } = req.body || {};
  try {
    const existing = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(req.params.ref);
    if (!existing) return res.status(404).json({ success: false, message: 'Booking not found' });

    db.prepare(`
      UPDATE bookings SET
        payment_id = COALESCE(?, payment_id),
        order_id   = COALESCE(?, order_id),
        place      = COALESCE(?, place),
        payment_status = COALESCE(?, payment_status),
        updated_at = datetime('now')
      WHERE booking_ref = ?
    `).run(paymentId ?? null, orderId ?? null, place ?? null, paymentStatus ?? null, req.params.ref);

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(req.params.ref);
    res.json({ success: true, booking });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update booking' });
  }
});

// ════════════════════════════════════════
// PHONEPE — INITIATE PAYMENT
// ════════════════════════════════════════
app.post('/api/initiate-payment', async (req, res) => {
  const { bookingRef, amount, customerPhone } = req.body || {};
  if (!bookingRef || !amount)
    return res.status(400).json({ success: false, message: 'bookingRef and amount are required' });

  const merchantTransactionId = `TXN${Date.now()}`;
  const amountInPaise = Math.round(Number(amount) * 100);
  const mobile = (customerPhone || '').replace(/\D/g, '').slice(-10);

  const payload = {
    merchantId: PHONEPE_MERCHANT_ID,
    merchantTransactionId,
    merchantUserId: `USR_${mobile || Date.now()}`,
    amount: amountInPaise,
    redirectUrl: `${APP_BASE_URL}/payment/callback?ref=${bookingRef}&txn=${merchantTransactionId}`,
    redirectMode: 'REDIRECT',
    callbackUrl: `${APP_BASE_URL}/api/phonepe-webhook`,
    mobileNumber: mobile,
    paymentInstrument: { type: 'PAY_PAGE' },
  };

  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const checksumStr   = base64Payload + '/pg/v1/pay' + PHONEPE_SALT_KEY;
  const sha256Hash    = crypto.createHash('sha256').update(checksumStr).digest('hex');
  const checksum      = `${sha256Hash}###${PHONEPE_SALT_INDEX}`;

  // If PhonePe not configured, return a test-mode response
  if (!PHONEPE_MERCHANT_ID || !PHONEPE_SALT_KEY) {
    console.log('[PhonePe] NOT CONFIGURED — simulating payment initiation');
    return res.json({
      success: true,
      simulated: true,
      paymentUrl: `${APP_BASE_URL}/payment/callback?ref=${bookingRef}&txn=${merchantTransactionId}&simulated=1`,
      transactionId: merchantTransactionId,
    });
  }

  try {
    const response = await axios.post(
      `${PHONEPE_BASE_URL}/pg/v1/pay`,
      { request: base64Payload },
      { headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum } }
    );

    const data = response.data;
    if (data.success && data.data && data.data.instrumentResponse) {
      const paymentUrl = data.data.instrumentResponse.redirectInfo.url;
      return res.json({ success: true, paymentUrl, transactionId: merchantTransactionId });
    }
    return res.status(500).json({ success: false, message: data.message || 'PhonePe initiation failed' });
  } catch (error) {
    console.error('[PhonePe] Initiation error:', error.response?.data || error.message);
    return res.status(500).json({ success: false, message: 'Payment initiation failed' });
  }
});

// ════════════════════════════════════════
// PHONEPE — PAYMENT CALLBACK (REDIRECT)
// ════════════════════════════════════════
app.get('/payment/callback', async (req, res) => {
  const { ref, txn, simulated } = req.query;
  if (!ref) return res.redirect('/payment-failed.html');

  let paymentSuccess = false;

  if (simulated === '1') {
    // Test mode — treat as success
    paymentSuccess = true;
  } else if (txn) {
    // Verify with PhonePe
    const endpoint     = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${txn}`;
    const checksumStr  = endpoint + PHONEPE_SALT_KEY;
    const sha256Hash   = crypto.createHash('sha256').update(checksumStr).digest('hex');
    const checksum     = `${sha256Hash}###${PHONEPE_SALT_INDEX}`;

    try {
      const response = await axios.get(`${PHONEPE_BASE_URL}${endpoint}`, {
        headers: { 'Content-Type': 'application/json', 'X-VERIFY': checksum, 'X-MERCHANT-ID': PHONEPE_MERCHANT_ID }
      });
      paymentSuccess = response.data?.success && response.data?.data?.state === 'COMPLETED';
    } catch (err) {
      console.error('[PhonePe] Verification error:', err.message);
    }
  }

  if (paymentSuccess) {
    // Update booking status in DB
    try {
      db.prepare(`UPDATE bookings SET payment_status = ?, order_id = ? WHERE booking_ref = ?`)
        .run('completed', txn, ref);
    } catch (e) { console.error('[DB] Update booking error:', e.message); }

    // Fetch booking and send WhatsApp
    try {
      const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(ref);
      if (booking) {
        await Promise.all([
          sendWhatsAppToCustomer(booking),
          sendWhatsAppToOwner(booking),
        ]);
      }
    } catch (e) { console.error('[WhatsApp] Error sending notifications:', e.message); }

    return res.redirect(`/payment-success.html?ref=${ref}`);
  } else {
    return res.redirect('/payment-failed.html');
  }
});

// ════════════════════════════════════════
// PHONEPE — SERVER WEBHOOK
// ════════════════════════════════════════
app.post('/api/phonepe-webhook', async (req, res) => {
  try {
    const xVerify = req.headers['x-verify'];
    const { response: base64Response } = req.body || {};
    if (!base64Response || !xVerify) return res.status(400).json({ success: false });

    const checksumStr     = base64Response + PHONEPE_SALT_KEY;
    const expectedHash    = crypto.createHash('sha256').update(checksumStr).digest('hex');
    const expectedChecksum = `${expectedHash}###${PHONEPE_SALT_INDEX}`;

    if (expectedChecksum !== xVerify) {
      console.warn('[PhonePe Webhook] Invalid signature');
      return res.status(403).json({ success: false });
    }

    const decoded = JSON.parse(Buffer.from(base64Response, 'base64').toString('utf-8'));
    const { merchantTransactionId, state } = decoded.data || {};

    if (state === 'COMPLETED') {
      // Find booking by transaction id
      const bookings = db.prepare('SELECT * FROM bookings ORDER BY id DESC').all();
      const booking  = bookings.find(b => b.order_id === merchantTransactionId);
      if (booking && booking.payment_status !== 'completed') {
        db.prepare('UPDATE bookings SET payment_status = ? WHERE booking_ref = ?')
          .run('completed', booking.booking_ref);
        await Promise.all([
          sendWhatsAppToCustomer(booking),
          sendWhatsAppToOwner(booking),
        ]);
      }
    }
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[PhonePe Webhook] Error:', error.message);
    res.status(500).json({ success: false });
  }
});

// ════════════════════════════════════════
// META WHATSAPP CLOUD API — SEND MESSAGE
// ════════════════════════════════════════
async function sendWhatsAppMessage(to, body) {
  if (!WA_TOKEN || !WA_PHONE_ID) {
    console.log(`[WhatsApp] NOT CONFIGURED — simulating message to ${to}:\n${body}`);
    return { success: true, simulated: true };
  }

  try {
    const response = await axios.post(
      `https://graph.facebook.com/${WA_VERSION}/${WA_PHONE_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        type: 'text',
        text: { preview_url: false, body },
      },
      { headers: { Authorization: `Bearer ${WA_TOKEN}`, 'Content-Type': 'application/json' } }
    );
    console.log(`[WhatsApp ✓] Sent to ${to} — ID: ${response.data.messages?.[0]?.id}`);
    return { success: true, data: response.data };
  } catch (error) {
    console.error(`[WhatsApp ✗] Failed for ${to}:`, error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

async function sendWhatsAppToCustomer(booking) {
  const phone = (booking.customer_phone || '').replace(/\D/g, '');
  if (!phone) return;
  const to = phone.startsWith('91') ? phone : `91${phone}`;

  const msg =
    `🎉 *TravoRents.com — Booking Confirmed!*\n\n` +
    `✅ Your TravoRents booking is confirmed!\n\n` +
    `📋 *Booking ID:* ${booking.booking_ref}\n` +
    `🚗 *Vehicle:* ${booking.vehicle_name}\n` +
    `📍 *Pickup:* ${booking.location || '—'}\n` +
    `📅 *From:* ${booking.pickup_date} ${booking.pickup_time}  →  ${booking.return_date} ${booking.return_time}\n` +
    `💰 *Amount Paid:* ₹${booking.total_amount}\n\n` +
    `Thank you for choosing TravoRents! 🙏`;

  return sendWhatsAppMessage(to, msg);
}

async function sendWhatsAppToOwner(booking) {
  const msg =
    `🔔 *New Booking — TravoRents*\n\n` +
    `📋 *Booking ID:* ${booking.booking_ref}\n` +
    `👤 *Customer:* ${booking.customer_name || '—'}\n` +
    `📞 *Phone:* +${(booking.customer_phone || '').replace(/\D/g, '')}\n` +
    `🚗 *Vehicle:* ${booking.vehicle_name}\n` +
    `📍 *Pickup:* ${booking.location || '—'}\n` +
    `📅 *Dates:* ${booking.pickup_date} ${booking.pickup_time}  →  ${booking.return_date} ${booking.return_time}\n` +
    `💰 *Amount:* ₹${booking.total_amount} ✅ *RECEIVED*`;

  return sendWhatsAppMessage(OWNER_PHONE, msg);
}

// ════════════════════════════════════════
// LEGACY: /api/send-whatsapp (kept for compatibility)
// ════════════════════════════════════════
app.post('/api/send-whatsapp', async (req, res) => {
  const { bookingId, vehicle, amount, customerName, customerPhone,
          pickupDate, pickupTime, returnDate, returnTime, location } = req.body || {};

  if (!bookingId || !vehicle || amount === undefined)
    return res.status(400).json({ success: false, message: 'Missing booking details' });

  const bookingData = {
    booking_ref: bookingId, vehicle_name: vehicle,
    customer_name: customerName, customer_phone: customerPhone,
    location, pickup_date: pickupDate, pickup_time: pickupTime,
    return_date: returnDate, return_time: returnTime, total_amount: amount,
  };

  const [custResult, ownerResult] = await Promise.all([
    sendWhatsAppToCustomer(bookingData),
    sendWhatsAppToOwner(bookingData),
  ]);

  return res.json({
    success: true,
    sent: 2,
    backend: 'online',
    bookingId,
    vehicle,
    amount,
    customer: customerPhone,
  });
});

// ════════════════════════════════════════
// CONFIRM QR PAYMENT
// ════════════════════════════════════════
app.post('/api/confirm-qr-booking', async (req, res) => {
  const { bookingRef } = req.body || {};
  if (!bookingRef) return res.status(400).json({ success: false, message: 'bookingRef is required' });

  try {
    // Update booking in DB
    db.prepare(`UPDATE bookings SET payment_status = ?, order_id = ? WHERE booking_ref = ?`)
      .run('qr_pending', 'QR_PAYMENT', bookingRef);

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(bookingRef);
    if (booking) {
      // Send WhatsApp ONLY to owner for verification alert
      await sendWhatsAppToOwnerQR(booking);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[QR Confirm Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process QR payment confirmation' });
  }
});

// ════════════════════════════════════════
// CONFIRM CASH ON VISIT BOOKING
// ════════════════════════════════════════
app.post('/api/confirm-cash-booking', async (req, res) => {
  const { bookingRef } = req.body || {};
  if (!bookingRef) return res.status(400).json({ success: false, message: 'bookingRef is required' });

  try {
    // Update booking in DB
    db.prepare(`UPDATE bookings SET payment_status = ?, order_id = ? WHERE booking_ref = ?`)
      .run('cash_on_visit', 'CASH_ON_VISIT', bookingRef);

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(bookingRef);
    if (booking) {
      // Send WhatsApp notifications to both customer and owner
      await Promise.all([
        sendWhatsAppToCustomerCash(booking),
        sendWhatsAppToOwnerCash(booking)
      ]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[Cash Confirm Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to process Cash on Visit confirmation' });
  }
});

// ════════════════════════════════════════
// APPROVE QR PAYMENT (ADMIN ONLY)
// ════════════════════════════════════════
app.post('/api/approve-qr-booking', async (req, res) => {
  const { bookingRef } = req.body || {};
  if (!bookingRef) return res.status(400).json({ success: false, message: 'bookingRef is required' });

  try {
    // Update booking in DB to completed
    db.prepare(`UPDATE bookings SET payment_status = ?, order_id = ? WHERE booking_ref = ?`)
      .run('completed', 'QR_VERIFIED', bookingRef);

    const booking = db.prepare('SELECT * FROM bookings WHERE booking_ref = ?').get(bookingRef);
    if (booking) {
      // Send official WhatsApp booking confirmation to customer and owner
      await Promise.all([
        sendWhatsAppToCustomer(booking),
        sendWhatsAppToOwner(booking),
      ]);
    }

    res.json({ success: true, message: 'Booking approved and WhatsApp confirmation sent!' });
  } catch (error) {
    console.error('[QR Approve Error]:', error.message);
    res.status(500).json({ success: false, message: 'Failed to approve booking' });
  }
});

async function sendWhatsAppToCustomerQR(booking) {
  const phone = (booking.customer_phone || '').replace(/\D/g, '');
  if (!phone) return;
  const to = phone.startsWith('91') ? phone : `91${phone}`;

  const msg =
    `🎉 *TravoRents.com — Booking Registered!*\n\n` +
    `✅ Your TravoRents booking is registered and pending QR verification!\n\n` +
    `📋 *Booking ID:* ${booking.booking_ref}\n` +
    `🚗 *Vehicle:* ${booking.vehicle_name}\n` +
    `📍 *Pickup:* ${booking.location || '—'}\n` +
    `📅 *From:* ${booking.pickup_date} ${booking.pickup_time}  →  ${booking.return_date} ${booking.return_time}\n` +
    `💰 *Amount Paid:* ₹${booking.total_amount} (via QR)\n\n` +
    `We will confirm your payment shortly! Thank you! 🙏`;

  return sendWhatsAppMessage(to, msg);
}

async function sendWhatsAppToOwnerQR(booking) {
  const msg =
    `🔔 *New QR Booking — TravoRents (Pending Verification)*\n\n` +
    `📋 *Booking ID:* ${booking.booking_ref}\n` +
    `👤 *Customer:* ${booking.customer_name || '—'}\n` +
    `📞 *Phone:* +${(booking.customer_phone || '').replace(/\D/g, '')}\n` +
    `🚗 *Vehicle:* ${booking.vehicle_name}\n` +
    `📍 *Pickup:* ${booking.location || '—'}\n` +
    `📅 *Dates:* ${booking.pickup_date} ${booking.pickup_time}  →  ${booking.return_date} ${booking.return_time}\n` +
    `💰 *Amount:* ₹${booking.total_amount} ⚠️ *PAID VIA QR - CHECK PHONEPE APP*`;

  return sendWhatsAppMessage(OWNER_PHONE, msg);
}

async function sendWhatsAppToCustomerCash(booking) {
  const phone = (booking.customer_phone || '').replace(/\D/g, '');
  if (!phone) return;
  const to = phone.startsWith('91') ? phone : `91${phone}`;

  const msg =
    `🎉 *TravoRents.com — Booking Confirmed!*\n\n` +
    `✅ Your TravoRents booking is confirmed!\n\n` +
    `📋 *Booking ID:* ${booking.booking_ref}\n` +
    `🚗 *Vehicle:* ${booking.vehicle_name}\n` +
    `📍 *Pickup:* ${booking.location || '—'}\n` +
    `📅 *From:* ${booking.pickup_date} ${booking.pickup_time}  →  ${booking.return_date} ${booking.return_time}\n` +
    `💰 *Amount to Pay (on Visit):* ₹${booking.total_amount}\n\n` +
    `Please pay cash or UPI at the time of pickup. Thank you for choosing TravoRents! 🙏`;

  return sendWhatsAppMessage(to, msg);
}

async function sendWhatsAppToOwnerCash(booking) {
  const msg =
    `🔔 *New Cash Booking — TravoRents (Pay on Visit)*\n\n` +
    `📋 *Booking ID:* ${booking.booking_ref}\n` +
    `👤 *Customer:* ${booking.customer_name || '—'}\n` +
    `📞 *Phone:* +${(booking.customer_phone || '').replace(/\D/g, '')}\n` +
    `🚗 *Vehicle:* ${booking.vehicle_name}\n` +
    `📍 *Pickup:* ${booking.location || '—'}\n` +
    `📅 *Dates:* ${booking.pickup_date} ${booking.pickup_time}  →  ${booking.return_date} ${booking.return_time}\n` +
    `💰 *Amount:* ₹${booking.total_amount} (Pay on Visit)`;

  return sendWhatsAppMessage(OWNER_PHONE, msg);
}

// ════════════════════════════════════════
// WHATSAPP WEBHOOK VERIFICATION (META)
// ════════════════════════════════════════
app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN || 'travorents_verify_token';

  if (mode && token) {
    if (mode === 'subscribe' && token === verifyToken) {
      console.log('[Webhook Verified successfully]');
      return res.status(200).send(challenge);
    } else {
      return res.sendStatus(403);
    }
  }
  return res.sendStatus(400);
});

app.post('/webhook', (req, res) => {
  const body = req.body;
  console.log('[Webhook Payload Received]:', JSON.stringify(body, null, 2));
  res.status(200).send('EVENT_RECEIVED');
});

// ════════════════════════════════════════
// START SERVER
// ════════════════════════════════════════
app.listen(PORT, () => {
  console.log(`\n🚗 TravoRents backend running → http://localhost:${PORT}`);
  console.log(`   PhonePe: ${PHONEPE_MERCHANT_ID ? '✅ Configured' : '⚠️  Not configured (test mode)'}`);
  console.log(`   WhatsApp: ${WA_TOKEN ? '✅ Configured' : '⚠️  Not configured (simulated)'}\n`);
});


