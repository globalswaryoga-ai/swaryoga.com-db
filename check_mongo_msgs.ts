import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { MongoClient } from 'mongodb';

async function run() {
  const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
  const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
  const mongo = new MongoClient(mongoUri!);
  await mongo.connect();
  const db = mongo.db(crmDbName);
  
  const twentyDaysAgo = new Date();
  twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);
  
  const count = await db.collection('whatsapp_messages').countDocuments({
    provider: { $in: ['meta', null] },
    $or: [
      { sentAt: { $gte: twentyDaysAgo } },
      { createdAt: { $gte: twentyDaysAgo } }
    ]
  });
  
  console.log('Messages from last 20 days:', count);
  await mongo.close();
}
run();
