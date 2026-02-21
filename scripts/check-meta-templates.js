require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function main() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: 'swaryoga_admin_crm' });
  
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const wabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;
  
  console.log('WABA ID:', wabaId);
  
  const url = `https://graph.facebook.com/v18.0/${wabaId}/message_templates?limit=50`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
  const data = await res.json();
  
  console.log('Templates from Meta:', data.data?.length || 0);
  if (data.error) {
    console.log('ERROR:', data.error);
    return;
  }
  
  for (const t of data.data || []) {
    console.log('---');
    console.log('Name:', t.name);
    console.log('Status:', t.status);
    console.log('ID:', t.id);
    
    const header = t.components?.find(c => c.type === 'HEADER');
    if (header) {
      console.log('Header Format:', header.format);
      if (header.example?.header_handle) {
        console.log('Header Handle:', header.example.header_handle[0]);
      }
    }
  }
  
  await mongoose.disconnect();
}
main().catch(console.error);
