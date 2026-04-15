const jwt = require('jsonwebtoken');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-key-at-least-32-characters-long-12345678';

// Token from browser
const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5Ac3dhcnlvZ2EuY29tIiwiaXNBZG1pbiI6dHJ1ZSwidXNlcm5hbWUiOiJhZG1pbiIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTc3NjI1Nzk2OSwiZXhwIjoxNzc2ODYyNzY5fQ.p6gx-O8RiE4PQZ4F9ZqDNPwRlvz6ODA7hTlTDTrh3Ww';

console.log('=== TOKEN VERIFICATION DEBUG ===');
console.log('JWT_SECRET from .env:', JWT_SECRET.substring(0, 4) + '...');
console.log('JWT_SECRET length:', JWT_SECRET.length);
console.log('Token:', testToken.substring(0, 30) + '...');

try {
  const decoded = jwt.verify(testToken, JWT_SECRET);
  console.log('\n✅ Token verification SUCCESS');
  console.log('Decoded payload:', decoded);
} catch (err) {
  console.log('\n❌ Token verification FAILED');
  console.log('Error:', err.message);
  
  // Try with different secret lengths
  console.log('\n=== TRYING DIFFERENT SECRETS ===');
  const altSecret = 'your-super-secret-key-at-least-32-characters-long-12345678';
  try {
    const decoded = jwt.verify(testToken, altSecret);
    console.log('✅ Works with alt secret');
  } catch (e) {
    console.log('❌ Does not work with alt secret');
  }
}

// Generate fresh token
console.log('\n=== GENERATING FRESH TOKEN ===');
const freshToken = jwt.sign(
  {
    userId: 'admin',
    email: 'admin@swaryoga.com',
    isAdmin: true,
    username: 'admin',
    role: 'admin'
  },
  JWT_SECRET,
  { expiresIn: '7d' }
);
console.log('Fresh token:', freshToken);

// Verify fresh token
try {
  const decoded = jwt.verify(freshToken, JWT_SECRET);
  console.log('✅ Fresh token verifies correctly');
  console.log('Payload:', decoded);
} catch (err) {
  console.log('❌ Fresh token verification failed:', err.message);
}
