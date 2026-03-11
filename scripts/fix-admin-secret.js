const dotenv = require('dotenv');
dotenv.config({ path: '.env.local' });
const mongoose = require('mongoose');

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
  const envSecret = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

  // Fix admincrm secret to match env var (what the bridge actually validates)
  const result = await db.collection('crm_user_settings').updateOne(
    { userId: 'admincrm' },
    { $set: { qrBridgeSecret: envSecret } }
  );
  console.log('Updated admincrm secret to:', envSecret, '- modified:', result.modifiedCount);

  // Verify
  const admin = await db.collection('crm_user_settings').findOne({ userId: 'admincrm' });
  console.log('Verified admincrm secret:', admin?.qrBridgeSecret);

  await mongoose.disconnect();
}

fix();
