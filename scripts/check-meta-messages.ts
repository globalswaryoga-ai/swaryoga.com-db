import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { getWhatsAppMessage } from '../lib/schemas/enterpriseSchemas';
import { countBunnyMetaMessages } from '../lib/bunnyMetaWhatsAppRepository';

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI!);
  
  const WhatsAppMessage = getWhatsAppMessage();
  const mongoCount = await WhatsAppMessage.countDocuments({ provider: 'meta' });
  const mongoLatest = await WhatsAppMessage.findOne({ provider: 'meta' }).sort({ sentAt: -1 }).select('sentAt createdAt');
  const mongoOldest = await WhatsAppMessage.findOne({ provider: 'meta' }).sort({ sentAt: 1 }).select('sentAt createdAt');

  const bunnyCount = await countBunnyMetaMessages({});
  
  console.log('--- MongoDB (WhatsAppMessage provider: meta) ---');
  console.log(`Count: ${mongoCount}`);
  console.log(`Latest: ${mongoLatest?.sentAt || mongoLatest?.createdAt}`);
  console.log(`Oldest: ${mongoOldest?.sentAt || mongoOldest?.createdAt}`);

  console.log('\n--- BunnyDB (meta_messages_sql) ---');
  console.log(`Count: ${bunnyCount}`);

  await mongoose.disconnect();
}
check().catch(console.error);
