import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { upsertBunnyMetaMessage } from '../lib/bunnyMetaWhatsAppRepository';
import { getWhatsAppMessage } from '../lib/schemas/enterpriseSchemas';

// Load environment variables
dotenv.config({ path: resolve(process.cwd(), '.env') });
dotenv.config({ path: resolve(process.cwd(), '.env.local') });

async function migrate() {
  console.log('Starting Meta WhatsApp Migration from MongoDB to BunnyDB...');

  if (!process.env.MONGODB_URI_MAIN) {
    console.error('Error: MONGODB_URI_MAIN is not defined in environment variables.');
    process.exit(1);
  }

  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI_MAIN);
    
    // Explicitly use the CRM DB (since some schemas rely on this)
    if (process.env.MONGODB_CRM_DB_NAME) {
      mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME);
    }
    console.log('Connected to MongoDB successfully.');

    const WhatsAppMessage = getWhatsAppMessage();
    const totalCount = await WhatsAppMessage.countDocuments();
    console.log(`Found ${totalCount} messages to migrate.`);

    const batchSize = 100;
    let processed = 0;
    let errors = 0;

    // Use a cursor to avoid loading everything into memory
    const cursor = WhatsAppMessage.find().cursor();

    for await (const doc of cursor) {
      try {
        const messageData = doc.toObject();
        
        // Ensure _id is a string
        messageData._id = messageData._id.toString();
        
        if (messageData.leadId) {
          messageData.leadId = messageData.leadId.toString();
        }

        await upsertBunnyMetaMessage(messageData);
        processed++;

        if (processed % batchSize === 0) {
          console.log(`Migrated ${processed}/${totalCount} messages...`);
        }
      } catch (err) {
        console.error(`Error migrating message ${doc._id}:`, err);
        errors++;
      }
    }

    console.log(`\nMigration Complete!`);
    console.log(`Successfully migrated: ${processed}`);
    console.log(`Errors: ${errors}`);

    await mongoose.disconnect();
    process.exit(0);

  } catch (error) {
    console.error('Fatal migration error:', error);
    process.exit(1);
  }
}

migrate();
