#!/usr/bin/env node
/**
 * Test token decryption for social media accounts
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const crypto = require('crypto');

// Must match lib/encryption.ts EXACTLY
function getEncryptionKey() {
  let key = process.env.ENCRYPTION_KEY || 'default-32-character-encryption-key';
  if (key.length < 32) key = key.padEnd(32, '0');
  else if (key.length > 32) key = key.substring(0, 32);
  return Buffer.from(key, 'utf-8');
}

function decryptCredential(encryptedData) {
  const key = getEncryptionKey();
  const parts = encryptedData.split(':');
  if (parts.length !== 3) throw new Error('Invalid format');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encrypted = parts[2];
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(encrypted, 'hex', 'utf-8');
  decrypted += decipher.final('utf-8');
  return decrypted;
}

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  
  const accounts = await mongoose.connection.db
    .collection('socialmediaaccounts')
    .find({})
    .toArray();
  
  console.log('Found', accounts.length, 'accounts\n');
  
  for (const acc of accounts) {
    console.log('Platform:', acc.platform, '| ID:', acc.accountId);
    try {
      const token = decryptCredential(acc.accessToken);
      console.log('✅ Token decrypts! First 20 chars:', token.substring(0, 20) + '...');
    } catch (e) {
      console.log('❌ Decrypt failed:', e.message);
    }
    console.log('');
  }
  
  await mongoose.disconnect();
}

main().catch(console.error);
