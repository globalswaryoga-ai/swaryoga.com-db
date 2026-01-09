
const { MongoClient, ObjectId } = require("mongodb");

const uri = "mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority";

async function run() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db("swaryoga_admin_crm");
    const collection = db.collection("whatsapp_messages");

    console.log("Starting Deep Repair of Meta/Bridge Separation...");

    // 1. Tag everything with a wamid as META, regardless of current provider
    const res1 = await collection.updateMany(
      { waMessageId: /^wamid\./ },
      { $set: { provider: "meta" } }
    );
    console.log(`Ensured ${res1.modifiedCount} messages with wamid IDs are tagged as meta.`);

    // 2. Any inbound from the Bridge is definitely Bridge
    const res2 = await collection.updateMany(
      { "metadata.source": "whatsapp_web_bridge" },
      { $set: { provider: "whatsapp_web_bridge" } }
    );
    console.log(`Ensured ${res2.modifiedCount} bridge-sourced messages are tagged as whatsapp_web_bridge.`);

    // 3. For the phone number 919309986820, let's merge any split leads if they exist
    const leads = await db.collection("leads").find({ phoneNumber: "919309986820" }).toArray();
    if (leads.length > 1) {
      console.log(`Found ${leads.length} leads for 919309986820. Merging to the first one: ${leads[0]._id}`);
      const primaryId = leads[0]._id;
      for (let i = 1; i < leads.length; i++) {
        await collection.updateMany({ leadId: leads[i]._id }, { $set: { leadId: primaryId } });
        await db.collection("leads").deleteOne({ _id: leads[i]._id });
      }
    }

    // 4. Update the test number's messages to have the correct leadId explicitly
    const targetLead = await db.collection("leads").findOne({ phoneNumber: "919309986820" });
    if (targetLead) {
      const res4 = await collection.updateMany(
        { phoneNumber: "919309986820" },
        { $set: { leadId: targetLead._id } }
      );
      console.log(`Updated ${res4.modifiedCount} messages for test number to leadId ${targetLead._id}`);
    }

    console.log("Deep repair complete.");
  } finally {
    await client.close();
  }
}

run().catch(console.error);
