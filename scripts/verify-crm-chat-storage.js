/*
  Verify CRM WhatsApp chat storage (MongoDB)

  What it does:
  - Connects to MongoDB using the app's connectDB()
  - Finds a lead by phone number OR leadId
  - Prints the most recent WhatsAppMessage docs for that lead

  Usage (zsh):
    node scripts/verify-crm-chat-storage.js --phone "+91XXXXXXXXXX" --limit 20
    node scripts/verify-crm-chat-storage.js --leadId "<mongoId>" --limit 20

  Notes:
  - Requires env vars (at least MONGODB_URI_MAIN / MONGODB_URI and MONGODB_CRM_DB_NAME if used).
  - This is a read-only script.
*/

const { connectDB } = require('../lib/db');

async function main() {
  const args = process.argv.slice(2);
  const getArg = (name) => {
    const idx = args.indexOf(name);
    if (idx === -1) return undefined;
    return args[idx + 1];
  };

  const phone = getArg('--phone');
  const leadId = getArg('--leadId');
  const limit = Number(getArg('--limit') || 20);

  if (!phone && !leadId) {
    console.error('Missing --phone or --leadId');
    process.exit(2);
  }

  await connectDB();

  // enterpriseSchemas uses connection.useDb() internally
  const { Lead, WhatsAppMessage } = require('../lib/schemas/enterpriseSchemas');

  let lead;
  if (leadId) {
    lead = await Lead.findById(String(leadId)).lean();
  } else {
    const clean = String(phone).trim().replace(/[\s\-()]/g, '');
    lead = await Lead.findOne({ phoneNumber: clean }).lean();
  }

  if (!lead) {
    console.error('Lead not found');
    process.exit(1);
  }

  const msgs = await WhatsAppMessage.find({ leadId: lead._id })
    .sort({ sentAt: -1 })
    .limit(limit)
    .lean();

  console.log('Lead:', {
    _id: String(lead._id),
    name: lead.name,
    phoneNumber: lead.phoneNumber,
    status: lead.status,
    lastMessageAt: lead.lastMessageAt,
  });

  console.log(`\nLast ${msgs.length} messages:`);
  for (const m of msgs) {
    console.log({
      _id: String(m._id),
      direction: m.direction,
      status: m.status,
      sentAt: m.sentAt,
      messageContent: (m.messageContent || '').slice(0, 140),
      waMessageId: m.waMessageId,
    });
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
