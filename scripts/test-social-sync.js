const mongoose = require('mongoose');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

function decryptCredential(encryptedText) {
  if (!encryptedText) return '';
  const key = process.env.ENCRYPTION_KEY;
  if (!key) throw new Error('ENCRYPTION_KEY not set');
  
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted format');
  
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = Buffer.from(parts[2], 'hex');
  
  const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(key, 'hex'), iv);
  decipher.setAuthTag(authTag);
  
  return decipher.update(encrypted, null, 'utf8') + decipher.final('utf8');
}

async function testSync() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.db;
  
  const accounts = await db.collection('socialmediaaccounts').find({ isConnected: true }).toArray();
  
  for (const acc of accounts) {
    console.log('\n--- ' + acc.platform.toUpperCase() + ' ---');
    console.log('Account ID:', acc.accountId);
    
    try {
      const token = decryptCredential(acc.accessToken);
      console.log('Token decrypted OK, length:', token.length);
      console.log('Token preview:', token.substring(0, 25) + '...');
      
      // Test the API
      if (acc.platform === 'facebook') {
        const url = `https://graph.facebook.com/v24.0/${acc.accountId}?fields=fan_count,followers_count,name&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
      }
      
      if (acc.platform === 'instagram') {
        const url = `https://graph.facebook.com/v24.0/${acc.accountId}?fields=followers_count,username&access_token=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
      }
      
      if (acc.platform === 'youtube') {
        const url = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${acc.accountId}&key=${token}`;
        const res = await fetch(url);
        const data = await res.json();
        console.log('API Response:', JSON.stringify(data, null, 2));
      }
      
    } catch (err) {
      console.log('Error:', err.message);
    }
  }
  
  process.exit(0);
}

testSync();
