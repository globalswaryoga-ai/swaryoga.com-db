require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const { createClient } = require('@libsql/client');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'swaryoga-super-secret-key-32chars!';
const IV = process.env.ENCRYPTION_IV ? Buffer.from(process.env.ENCRYPTION_IV, 'hex') : Buffer.alloc(16, 0);

function decryptCredential(encryptedText) {
  const [ivHex, dataHex] = encryptedText.split(':');
  if (!ivHex || !dataHex) {
    // legacy format
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), IV);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
  const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(ivHex, 'hex'));
  let decrypted = decipher.update(dataHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

const client = createClient({
  url: process.env.BUNNY_DATABASE_URL,
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN
});
async function run() {
  const res = await client.execute("SELECT document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'");
  for (let row of res.rows) {
      let parsed = JSON.parse(row.document_json);
      try {
          decryptCredential(parsed.accessToken);
          console.log("Success decrypting!");
      } catch (e) {
          console.error("Failed to decrypt: ", e.message);
      }
  }
}
run();
