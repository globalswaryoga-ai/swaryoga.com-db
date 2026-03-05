const { MongoClient } = require("mongodb");
(async () => {
  const client = new MongoClient("mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/");
  await client.connect();
  const db = client.db("swaryoga_admin_crm");
  const msgs = await db.collection("whatsapp_messages").find({
    $or: [
      { mediaUrl: { $exists: true, $ne: null } },
      { hasMedia: true },
      { type: { $in: ["image", "video", "document", "audio"] } }
    ]
  }).sort({ timestamp: -1 }).limit(5).toArray();
  msgs.forEach(m => {
    console.log(JSON.stringify({
      id: m._id, from: m.from, to: m.to, type: m.type,
      direction: m.direction, hasMedia: m.hasMedia,
      mediaUrl: m.mediaUrl, mediaMimetype: m.mediaMimetype,
      body: (m.body || "").substring(0, 50), timestamp: m.timestamp
    }));
  });
  if (msgs.length === 0) console.log("NO MEDIA MESSAGES FOUND");

  // Also check latest messages with body="[image]" or "[document]"
  const imgMsgs = await db.collection("whatsapp_messages").find({
    body: { $in: ["[image]", "[video]", "[document]", "[audio]"] }
  }).sort({ timestamp: -1 }).limit(5).toArray();
  console.log("\n--- Messages with [image]/[document] body ---");
  imgMsgs.forEach(m => {
    console.log(JSON.stringify({
      id: m._id, from: m.from, to: m.to, type: m.type,
      direction: m.direction, hasMedia: m.hasMedia,
      mediaUrl: m.mediaUrl, body: m.body, timestamp: m.timestamp
    }));
  });

  await client.close();
})().catch(e => { console.error(e.message); process.exit(1); });
