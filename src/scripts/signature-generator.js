// signature-generator.js
// Simple script to generate HMAC signatures for testing HouseTabz partner authentication

const crypto = require('crypto');

// ✅ TEST CREDENTIALS - Replace with real partner credentials
const TEST_PARTNER = {
  apiKey: 'htz_your_api_key_here',        // Replace with actual API key
  secretKey: 'htzsk_your_secret_key_here' // Replace with actual secret key
};

/**
 * Generates HMAC signature exactly like your backend expects
 * This matches the logic in your authenticatePartner middleware
 */
function generateSignature(payload, timestamp, secretKey) {
  // Convert payload to JSON string (same as req.body in your middleware)
  const payloadString = JSON.stringify(payload);
  
  // Create the signed payload: timestamp.payload (same format as your backend)
  const signedPayload = `${timestamp}.${payloadString}`;
  
  // Generate HMAC-SHA256 signature
  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(signedPayload)
    .digest('hex');
  
  return signature;
}

/**
 * Creates headers needed for authenticated API request
 */
function createAuthHeaders(payload, apiKey, secretKey) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = generateSignature(payload, timestamp, secretKey);
  
  return {
    'Content-Type': 'application/json',
    'x-api-key': apiKey,
    'housetabz-timestamp': timestamp.toString(),
    'housetabz-signature': signature
  };
}

console.log('🔐 HouseTabz Partner Signature Generator\n');
console.log('Use this to generate HMAC signatures for testing partner API authentication\n');

// ✅ EXAMPLE - You can customize the payload for your test
const examplePayload = {
  // Put whatever data you're testing with here
  test: 'data'
};

const headers = createAuthHeaders(examplePayload, TEST_PARTNER.apiKey, TEST_PARTNER.secretKey);

console.log('Generated Headers:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log(`x-api-key: ${headers['x-api-key']}`);
console.log(`housetabz-timestamp: ${headers['housetabz-timestamp']}`);
console.log(`housetabz-signature: ${headers['housetabz-signature']}`);
console.log('');

// ✅ VERIFICATION HELPER
console.log('🔍 HOW TO USE:');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
console.log('1. Update TEST_PARTNER with your real credentials');
console.log('2. Modify examplePayload with your test data');  
console.log('3. Use the generated headers in your API requests');
console.log('');

console.log('✅ SETUP INSTRUCTIONS:');
console.log('1. Replace TEST_PARTNER credentials with real values');
console.log('2. Run: node signature-generator.js');
console.log('3. Use the generated headers for testing');
console.log('='.repeat(50));