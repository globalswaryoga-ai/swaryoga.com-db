#!/usr/bin/env node

/**
 * SIMULATE Meta webhook verification request
 * Tests if the endpoint returns the correct challenge response
 */

const token = 'ce353ae0e9367a387963a60657848f20a665584e719d0d5c34d8f08e12a7e73d';
const challenge = 'test_challenge_12345';

// Construct the exact URL that Meta will use
const url = new URL('https://crm.swaryoga.com/api/whatsapp/webhook/9779006820');
url.searchParams.set('hub.mode', 'subscribe');
url.searchParams.set('hub.verify_token', token);
url.searchParams.set('hub.challenge', challenge);

console.log('\n╔════════════════════════════════════════════════════╗');
console.log('║   META WEBHOOK VERIFICATION TEST                  ║');
console.log('╚════════════════════════════════════════════════════╝\n');

console.log('Testing GET request:\n');
console.log('URL:', url.toString());
console.log('\nParameters:');
console.log('  hub.mode =', url.searchParams.get('hub.mode'));
console.log('  hub.verify_token =', url.searchParams.get('hub.verify_token'));
console.log('  hub.challenge =', url.searchParams.get('hub.challenge'));

console.log('\nExpected response:');
console.log('  Status: 200');
console.log('  Body: ' + challenge);

console.log('\n\nSending request...\n');

fetch(url.toString(), {
  method: 'GET',
})
  .then((res) => {
    console.log('✅ Response received!');
    console.log('Status:', res.status);
    console.log('Headers:');
    res.headers.forEach((value, key) => {
      if (key.startsWith('x-') || key === 'content-type') {
        console.log(`  ${key}: ${value}`);
      }
    });
    return res.text();
  })
  .then((body) => {
    console.log('\nResponse Body:');
    console.log('Length:', body.length);
    console.log('Content:', body.substring(0, 200));
    
    if (body === challenge) {
      console.log('\n✅ SUCCESS! Response matches challenge');
    } else {
      console.log('\n❌ MISMATCH! Expected challenge, got:', body);
    }
  })
  .catch((err) => {
    console.error('\n❌ REQUEST FAILED:', err.message);
  });
