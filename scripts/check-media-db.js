const { MongoClient } = require("mongodb");
(async () => {
  const client = new MongoClient("mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/");
  await client.connect();
  const db = client.db("swaryoga_admin_crm");
  
  // Find the specific messages by waMessageId
  const ids = ["3B91B77F49CDD1CAED3E", "3B2AC27677EB8263FFA7"];
  for (const id of ids) {
    const doc = await db.collection("whatsapp_messages").findOne({ waMessageId: id });
    if (doc) {
      console.log("=== ID:", id, "===");
      console.log(JSON.stringify({
        _id: doc._id,
        phoneNumber: doc.phoneNumber,
        direction: doc.direction,
        messageContent: doc.messageContent,
        messageType: doc.messageType,
        hasMedia: doc.hasMedia,
        media: doc.media,
        provider: doc.provider,
        sentAt: doc.sentAt
      }, null, 2));
    } else {
      console.log("NOT FOUND:", id);
    }
  }
  
  // Also find any messages with media field
  const mediaDocs = await db.collection("whatsapp_messages").find({
    "media": { $exists: true }
  }).sort({ sentAt: -1 }).limit(5).toArray();
  console.log("\n=== Messages with media field ===");
  mediaDocs.forEach(d => {
    console.log(JSON.stringify({ _id: d._id, phone: d.phoneNumber, media: d.media, sentAt: d.sentAt }));
  });
  
  await client.close();
})().catch(e => { console.error(e.message); process.exit(1); });
