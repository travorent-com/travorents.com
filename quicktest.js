#!/usr/bin/env node

/**
 * QuickTest: Verify TravoRents Booking Flow
 * Run: node quicktest.js
 */

const http = require('http');

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║     TravoRents Booking Flow - Quick Test            ║');
console.log('╚════════════════════════════════════════════════════╝\n');

// Test 1: Check if backend is running
console.log('📍 Test 1: Backend Health Check');
console.log('─────────────────────────────────\n');

http.get('http://localhost:3000/health', (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    try {
      const json = JSON.parse(data);
      console.log('✅ Backend is ONLINE');
      console.log('   Service:', json.service);
      console.log('   Twilio:', json.twilio);
      console.log('   Time:', json.timestamp);
      
      // Test 2: Send test WhatsApp message
      console.log('\n📍 Test 2: Send Test WhatsApp Message');
      console.log('─────────────────────────────────\n');
      
      const testPayload = {
        bookingId: 'TEST-' + Date.now(),
        vehicle: 'Swift Dzire (TEST)',
        amount: 1600,
        customerName: 'Test Customer',
        customerPhone: '+919999999999', // Replace with your number!
        pickupDate: '14 Jun 2026',
        pickupTime: '09:30',
        returnDate: '15 Jun 2026',
        returnTime: '09:30',
        location: 'Nayapalli, Bhubaneswar'
      };

      const postData = JSON.stringify(testPayload);
      
      const postOptions = {
        hostname: 'localhost',
        port: 3000,
        path: '/api/send-whatsapp',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const req = http.request(postOptions, (res) => {
        let response = '';
        res.on('data', (chunk) => { response += chunk; });
        res.on('end', () => {
          try {
            const result = JSON.parse(response);
            console.log('✅ WhatsApp API Response:');
            console.log('   Success:', result.success);
            console.log('   Booking ID:', result.bookingId);
            console.log('   Vehicle:', result.vehicle);
            console.log('   Amount: ₹' + result.amount);
            console.log('   Status:', result.simulated ? '⚠️ SIMULATED (Twilio not configured)' : '✅ Real WhatsApp sent');
            console.log('   Message:', result.message);
            
            console.log('\n╔════════════════════════════════════════════════════╗');
            if (result.simulated) {
              console.log('║ ⚠️  TWILIO NOT CONFIGURED - Messages Simulated     ║');
              console.log('║                                                    ║');
              console.log('║ To receive REAL WhatsApp messages:                ║');
              console.log('║ 1. Read: WHATSAPP_SETUP.md                        ║');
              console.log('║ 2. Get Twilio credentials                         ║');
              console.log('║ 3. Set env variables or edit whatsapp-backend.js  ║');
              console.log('║ 4. Restart backend: npm start                     ║');
            } else {
              console.log('║ ✅ ALL SYSTEMS OPERATIONAL!                        ║');
              console.log('║                                                    ║');
              console.log('║ WhatsApp messages are being sent successfully!     ║');
            }
            console.log('╚════════════════════════════════════════════════════╝\n');
          } catch (e) {
            console.error('❌ Error parsing response:', e.message);
          }
        });
      });

      req.on('error', (e) => {
        console.error('❌ Request failed:', e.message);
      });

      req.write(postData);
      req.end();

    } catch (e) {
      console.error('❌ Error parsing health response:', e.message);
    }
  });
}).on('error', (e) => {
  console.error('❌ Backend is NOT running!');
  console.error('   Error:', e.message);
  console.error('\n   To start backend:');
  console.error('   1. cd travorents_final');
  console.error('   2. npm install');
  console.error('   3. npm start');
});
