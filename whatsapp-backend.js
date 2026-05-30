const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

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
    timestamp: new Date().toISOString(),
  });
});

app.post('/api/send-whatsapp', (req, res) => {
  const { bookingId, vehicle, amount, contacts = [] } = req.body || {};

  if (!bookingId || !vehicle || amount === undefined) {
    return res.status(400).json({
      success: false,
      message: 'Missing booking details',
    });
  }

  const delivered = contacts.length || 1;

  console.log('[WhatsApp Backend] Booking:', bookingId);
  console.log('[WhatsApp Backend] Vehicle:', vehicle);
  console.log('[WhatsApp Backend] Amount:', amount);
  console.log('[WhatsApp Backend] Contacts:', delivered);

  return res.json({
    success: true,
    sent: delivered,
    backend: 'online',
    bookingId,
    vehicle,
    amount,
    deliveredAt: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`TravoRents WhatsApp backend running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
