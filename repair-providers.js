
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

    console.log("Starting provider repair...");

    // 1. Tag messages with wamid. as meta
    const res1 = await collection.updateMany(
      { waMessageId: /^wamid\./, provider: { $exists: false } },
      { $set: { provider: "meta" } }
    );
    console.log(`Tagged ${res1.modifiedCount} messages as meta (via waMessageId pattern).`);

    // 2. Tag messages with bridge metadata as bridge
    const res2 = await collection.updateMany(
      { "metadata.source": "whatsapp_web_bridge", provider: { $exists: false } },
      { $set: { provider: "whatsapp_web_bridge" } }
    );
    console.log(`Tagged ${res2.modifiedCount} messages as whatsapp_web_bridge (via metadata).`);

    // 3. For the rest of the messages:
    // Most legacy outbound messages were intended for the bridge (QR inbox).
    // Most recent inbound messages (which we repaired timestamps for) are Meta.
    // Let's check those specific 191 messages I repaired before.
    
    const res3 = await collection.updateMany(
        { provider: { $exists: false }, direction: "outbound" },
        { $set: { provider: "whatsapp_web_bridge" } }
    );
    console.log(`Tagged ${res3.modifiedCount} remaining outbound as whatsapp_web_bridge.`);

    const res4 = await collection.updateMany(
        { provider: { $exists: false }, direction: "inbound" },
        { $set: { provider: "meta" } }
    );
    console.log(`Tagged ${res4.modifiedCount} remaining inbound as meta.`);

    console.log("Repair complete.");
  } finally {
    await client.close();
  }
}

run().catch(console.error);
