const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");

async function check() {
  const envContent = fs.readFileSync(".env.local", "utf8");
  const env = {};
  envContent.split("\n").forEach(line => {
    const parts = line.split("=");
    if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim().replace(/^"|"$/g, "").replace(/^'|'$/g, "");
        env[key] = value;
    }
  });

  const uri = env["MONGODB_URI_MAIN"];
  const dbName = env["MONGODB_CRM_DB_NAME"];
  
  if (!uri || !dbName) {
    console.log("Missing URI or DB Name");
    process.exit(1);
  }

  console.log(`Connecting to ${dbName}...`);
  await mongoose.connect(uri + "/" + dbName);
  const collection = mongoose.connection.db.collection("whatsapp_messages");
  
  console.log("Searching for 1606351380725 or hi...");
  const messages = await collection.find({ 
    $or: [
      { phoneNumber: "1606351380725" },
      { phoneNumber: "1606351380725@lid" },
      { messageContent: /hi/i }
    ]
  }).sort({ createdAt: -1 }).limit(10).toArray();
  
  console.log("Found " + messages.length + " messages");
  console.log(JSON.stringify(messages, null, 2));
  process.exit(0);
}
check().catch(err => { console.error(err); process.exit(1); });
