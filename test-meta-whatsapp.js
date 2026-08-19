const axios = require('axios');
require('dotenv').config();

const WA_TOKEN = process.env.WHATSAPP_TOKEN;
const WA_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID;
const WA_VERSION = process.env.WHATSAPP_API_VERSION || 'v19.0';
// Default to the owner number from env, or replace with your verified test recipient number
const RECIPIENT_PHONE = process.env.OWNER_WHATSAPP_NUMBER || '918455065107';

if (!WA_TOKEN || !WA_PHONE_ID) {
  console.error('❌ Error: WHATSAPP_TOKEN or WHATSAPP_PHONE_NUMBER_ID is missing in your .env file!');
  process.exit(1);
}

console.log('--- WhatsApp API Configuration ---');
console.log('Phone ID:', WA_PHONE_ID);
console.log('Version:', WA_VERSION);
console.log('Sending to:', RECIPIENT_PHONE);
console.log('----------------------------------\n');

/**
 * Sends a test template message.
 * @param {string} templateName - Name of the template (e.g., 'hello_world' or 'papers_market_order_confirmation_v3')
 * @param {Array} parameters - Template body variables (e.g., [{ type: 'text', text: 'John Doe' }])
 */
async function sendTestTemplate(templateName, parameters = []) {
  const url = `https://graph.facebook.com/${WA_VERSION}/${WA_PHONE_ID}/messages`;
  
  const payload = {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to: RECIPIENT_PHONE,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en_US' }
    }
  };

  if (parameters.length > 0) {
    payload.template.components = [
      {
        type: 'body',
        parameters: parameters
      }
    ];
  }

  try {
    console.log(`📡 Sending template "${templateName}" to ${RECIPIENT_PHONE}...`);
    const response = await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${WA_TOKEN}`,
        'Content-Type': 'application/json'
      }
    });
    console.log('✅ Success! Message sent.');
    console.log('Response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('❌ Failed to send message!');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Error Message:', error.message);
    }
  }
}

async function run() {
  console.log('🚀 Starting Meta WhatsApp Integration Test...');
  
  // Test 1: Send the standard 'hello_world' template (comes pre-approved by Meta for all test accounts)
  console.log('\n--- Test 1: Sending Meta hello_world template ---');
  await sendTestTemplate('hello_world');

  // Test 2: Send custom template (e.g., papers_market_order_confirmation_v3)
  // Edit the variables to match what your template expects ({{1}}, {{2}}, etc.)
  console.log('\n--- Test 2: Sending custom papers_market_order_confirmation_v3 template ---');
  const sampleParams = [
    { type: 'text', text: 'John Doe' }, // {{1}} (Customer Name)
    { type: 'text', text: 'TR-TEST-1234' }, // {{2}} (Booking ID)
    { type: 'text', text: 'Thar 4x4' }, // {{3}} (Vehicle)
    { type: 'text', text: 'Bhubaneswar' }, // {{4}} (Location)
    { type: 'text', text: '1600' } // {{5}} (Amount)
  ];
  await sendTestTemplate('papers_market_order_confirmation_v3', sampleParams);
}

run();
