/**
 * Fix string _id values in tally_manual_vouchers
 * The split-receipts.js script inserted docs with string _id instead of ObjectId.
 * This script re-inserts them with proper ObjectIds.
 */
require('dotenv').config({ path: '.env.local' });
const { MongoClient, ObjectId } = require('mongodb');

(async () => {
  const client = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = client.db('swaryoga_admin_crm');
  const col = db.collection('tally_manual_vouchers');
  
  // Find all docs with string _id
  const all = await col.find({}).toArray();
  const strDocs = all.filter(d => typeof d._id === 'string');
  
  console.log(`Found ${strDocs.length} documents with string _id (out of ${all.length} total)`);
  
  if (strDocs.length === 0) {
    console.log('Nothing to fix!');
    await client.close();
    return;
  }
  
  let fixed = 0;
  for (const doc of strDocs) {
    const oldId = doc._id;
    // Create a copy with a new proper ObjectId
    const newDoc = { ...doc };
    delete newDoc._id;
    newDoc._id = new ObjectId(); // proper ObjectId
    
    // Delete old doc with string _id
    await col.deleteOne({ _id: oldId });
    // Insert new doc with ObjectId _id
    await col.insertOne(newDoc);
    fixed++;
  }
  
  console.log(`Fixed ${fixed} documents. String _ids replaced with proper ObjectIds.`);
  
  // Verify
  const afterAll = await col.find({}).toArray();
  const afterStr = afterAll.filter(d => typeof d._id === 'string');
  console.log(`After fix: ${afterStr.length} string _ids, ${afterAll.length} total docs`);
  
  await client.close();
})();
