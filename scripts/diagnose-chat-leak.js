const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

async function run() {
  const client = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = client.db('swaryoga_admin_crm');
  
  // 1. Check lead phone format for these numbers
  const leads = await db.collection('leads').find({
    phoneNumber: { $regex: '9309986820|9075358557' }
  }, { projection: { phoneNumber: 1, assignedToUserId: 1, createdByUserId: 1, name: 1 } }).toArray();
  console.log('=== Leads matching 9309986820 or 9075358557 ===');
  console.log(JSON.stringify(leads, null, 2));
  
  // 2. Sample phone formats to understand pattern
  const samples = await db.collection('leads').find({}, { projection: { phoneNumber: 1 } }).limit(15).toArray();
  console.log('\n=== Sample phone formats (first 15) ===');
  samples.forEach(l => console.log(' ', l.phoneNumber));
  
  // 3. Total leads
  const total = await db.collection('leads').countDocuments();
  console.log('\nTotal leads:', total);
  
  // 4. Who is the user with phone 9075358557?
  const settings9075 = await db.collection('crm_user_settings').find({
    $or: [
      { qrConnectedPhoneNumber: { $regex: '9075358557' } },
      { userId: { $regex: '9075358557' } }
    ]
  }).toArray();
  console.log('\n=== CRM Settings for 9075358557 ===');
  console.log(JSON.stringify(settings9075, null, 2));
  
  // 5. Super Admin info
  const adminSettings = await db.collection('crm_user_settings').find({
    userId: { $in: ['admin', 'admincrm'] }
  }, { projection: { userId: 1, qrConnectedPhoneNumber: 1, permanentTenantId: 1 } }).toArray();
  console.log('\n=== Super Admin settings ===');
  console.log(JSON.stringify(adminSettings, null, 2));
  
  // 6. All CRM user settings (userId + phone + tenantId)
  const allSettings = await db.collection('crm_user_settings').find({}, {
    projection: { userId: 1, qrConnectedPhoneNumber: 1, permanentTenantId: 1, qrWhatsappEnabled: 1, qrBridgeUrl: 1 }
  }).toArray();
  console.log('\n=== All CRM User Settings ===');
  allSettings.forEach(s => {
    console.log(`  userId=${s.userId}, phone=${s.qrConnectedPhoneNumber || '-'}, tenantId=${s.permanentTenantId || '-'}, enabled=${s.qrWhatsappEnabled || false}, bridgeUrl=${s.qrBridgeUrl || '-'}`);
  });
  
  // 7. Check chat JID format from bridge (what WhatsApp sends)
  // WhatsApp chat IDs look like: 919309986820@s.whatsapp.net
  // The filter extracts: 919309986820 (with country code)
  // But leads might store: 9309986820 (without country code)
  console.log('\n=== PHONE FORMAT MISMATCH CHECK ===');
  console.log('WhatsApp chat ID format: 91XXXXXXXXXX@s.whatsapp.net');
  console.log('Filter extracts phone as: 91XXXXXXXXXX (with 91 prefix)');
  const leadsWith91 = await db.collection('leads').find({
    phoneNumber: { $regex: '^91' }
  }).count();
  const leadsWithout91 = await db.collection('leads').find({
    phoneNumber: { $regex: '^[^9]|^9[^1]' }
  }).count();
  const leads10digit = await db.collection('leads').find({
    $expr: { $eq: [{ $strLenCP: '$phoneNumber' }, 10] }
  }).count();
  const leads12digit = await db.collection('leads').find({
    $expr: { $eq: [{ $strLenCP: '$phoneNumber' }, 12] }
  }).count();
  console.log(`Leads with 91 prefix: ${leadsWith91}`);
  console.log(`Leads without 91 prefix: ${leadsWithout91}`);
  console.log(`Leads with 10 digits: ${leads10digit}`);
  console.log(`Leads with 12 digits: ${leads12digit}`);
  
  await client.close();
}
run().catch(console.error);
