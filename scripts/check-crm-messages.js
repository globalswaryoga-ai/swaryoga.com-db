
const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  const uri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  if (!uri) {
     console.error("No MONGODB_URI found");
     return;
  }
  
  // Connect to the Admin CRM database
  const crmUri = uri.includes('swaryogaDB') ? uri.replace('swaryogaDB', 'swaryoga_admin_crm') : uri;
  console.log("Connecting to:", crmUri.replace(/:([^@]+)@/, ':****@'));

  await mongoose.connect(crmUri);
  console.log("Connected.");

  const WhatsAppMessage = mongoose.models.WhatsAppMessage || mongoose.model('WhatsAppMessage', new mongoose.Schema({
    phoneNumber: String,
    messageContent: String,
    direction: String,
    provider: String,
    sentAt: Date,
    createdAt: Date
  }, { collection: 'whatsapp_messages' }));

  const msgs = await WhatsAppMessage.find({}).sort({ createdAt: -1 }).limit(10);
  console.log("\nLATEST 10 MESSAGES IN [whatsapp_messages]:");
  msgs.forEach(m => {
     console.log(`[${m.createdAt?.toISOString()}] ${m.direction} to/from ${m.phoneNumber} via ${m.provider}: ${m.messageContent?.substring(0, 30)}...`);
  });

  const count = await WhatsAppMessage.countDocuments({ provider: 'meta' });
  console.log(`\nTotal Meta messages: ${count}`);

  process.exit(0);
}

check();
