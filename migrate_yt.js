require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');
const { createClient } = require('@libsql/client');
const crypto = require('crypto');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI_MAIN, { dbName: process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB' });
    const Accounts = mongoose.connection.db.collection('socialmediaaccounts');
    const ytDoc = await Accounts.findOne({ platform: 'youtube' });
    if (!ytDoc) {
      console.log("No YT doc in Mongo either!");
      process.exit(0);
    }
    
    const bunnyClient = createClient({ url: process.env.BUNNY_DATABASE_URL, authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN });
    
    // Remove _id from mongo doc before stringifying to avoid issues, though it should be fine.
    await bunnyClient.execute({
      sql: "INSERT INTO mongo_documents (source_database, collection_name, document_id, document_json) VALUES ('swarsakshiDB', 'socialmediaaccounts', ?, ?)",
      args: [crypto.randomUUID(), JSON.stringify(ytDoc)]
    });
    console.log("Migrated YT account to Bunny!");
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
})();
