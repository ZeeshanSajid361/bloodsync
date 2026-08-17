/**
 * EMN API Integration Test Helper
 *
 * Usage:
 *   node server/test-emn-sync.js <YOUR_API_KEY>
 *
 * Example:
 *   node server/test-emn-sync.js bl_982b91010e17fc389e12724a83c7f6a5f3c2b3b98e0b35d9
 */

const http = require('http');

const apiKey = process.argv[2] || 'bl_982b91010e17fc389e12724a83c7f6a5f3c2b3b98e0b35d9';
const host = process.env.API_HOST || 'localhost';
const port = process.env.API_PORT || 5000;

const payload = JSON.stringify({
  updates: [
    { bloodGroup: 'O+', units: 50 },
    { bloodGroup: 'A-', units: 18 }
  ]
});

const options = {
  hostname: host,
  port: port,
  path: '/api/hospitals/inventory/sync',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
    'Authorization': `ApiKey ${apiKey}`
  }
};

console.log(`\n🔄 Testing EMN Inventory Sync API on http://${host}:${port}...`);
console.log(`🔑 Using API Key: ${apiKey}`);

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`\n📊 Response Status Code: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(body);
      console.log('✅ Response Data:');
      console.log(JSON.stringify(parsed, null, 2));
    } catch {
      console.log('📄 Raw Response:', body);
    }
  });
});

req.on('error', (err) => {
  console.error('❌ Connection Error:', err.message);
  console.log('\n💡 Tip: Make sure the server is running on http://localhost:5000');
});

req.write(payload);
req.end();
