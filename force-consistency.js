
const { MongoClient } = require("mongodb");

require('dotenv').config({ path: '.env.local' });
const uri = process.env.MONGODB_URI_MAIN;
if (!uri) {
  throw new Error('MONGODB_URI_MAIN is missing. Ensure .env.local is present and configured.');
}

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("swaryoga_admin_crm");
    const collection = db.collection("whatsapp_messages");

    console.log("Forcing provider and leadId consistency...");

    // 1. Any message with wamid is definitely Meta
    const res1 = await collection.updateMany(
      { waMessageId: /^wamid\./, provider: { $ne: "meta" } },
      { $set: { provider: "meta" } }
    );
    console.log(`Updated ${res1.modifiedCount} messages to meta based on waMessageId.`);

    // 2. Any message with bridge metadata is definitely Bridge
    const res2 = await collection.updateMany(
      { "metadata.source": "whatsapp_web_bridge", provider: { $ne: "whatsapp_web_bridge" } },
      { $set: { provider: "whatsapp_web_bridge" } }
    );
    console.log(`Updated ${res2.modifiedCount} messages to bridge based on metadata.`);

    // 3. Anything still missing provider
    const res3 = await collection.updateMany(
      { provider: { $exists: false } },
      [
        {
          $set: {
            provider: {
              $cond: {
                if: { $regexMatch: { input: { $ifNull: ["$waMessageId", ""] }, regex: /^wamid\./ } },
                then: "meta",
                else: "whatsapp_web_bridge"
              }
            }
          }
        }
      ]
    );
    console.log(`Set provider for ${res3.modifiedCount} orphaned messages.`);

    // 4. Critical: Ensure all messages have a leadId link if possible
    const msgsWithoutLead = await collection.find({ leadId: { $exists: false } }).toArray();
    console.log(`Found ${msgsWithoutLead.length} messages without leadId. Attempting to link...`);
    
    let linked = 0;
    for (const msg of msgsWithoutLead) {
      if (!msg.phoneNumber) continue;
      const lead = await db.collection("leads").findOne({ phoneNumber: msg.phoneNumber });
      if (lead) {
        await collection.updateOne({ _id: msg._id }, { $set: { leadId: lead._id } });
        linked++;
      }
    }
    console.log(`Linked ${linked} messages to existing leads.`);

    console.log("Consistency check complete.");
  } finally {
    await client.close();
  }
}

run().catch(console.error);
