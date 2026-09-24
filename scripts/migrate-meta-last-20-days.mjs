#!/usr/bin/env node

/** Non-destructive Meta WhatsApp migration: MongoDB -> Bunny SQL (Last 20 days). */
import dotenv from 'dotenv';
import mongodb from 'mongodb';
import { createClient } from '@libsql/client';
import crypto from 'node:crypto';

dotenv.config({ path: '.env.local' });
dotenv.config();

const { MongoClient } = mongodb;
const { EJSON } = mongodb.BSON;
const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

if (!mongoUri) throw new Error('MONGODB_URI_MAIN or MONGODB_URI is required');
if (!process.env.BUNNY_DATABASE_URL || !process.env.BUNNY_DATABASE_AUTH_TOKEN) {
  throw new Error('BUNNY_DATABASE_URL and BUNNY_DATABASE_AUTH_TOKEN are required');
}

const json = (value) => EJSON.stringify(value, null, 0, { relaxed: false });
const id = (value) => value?.toHexString?.() || String(value ?? crypto.randomUUID());
const iso = (value) => value ? new Date(value).toISOString() : null;

async function main() {
  const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 20000 });
  const bunny = createClient({ 
    url: process.env.BUNNY_DATABASE_URL, 
    authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN 
  });
  
  await mongo.connect();
  
  try {
    const db = mongo.db(crmDbName);
    
    // Calculate the date 20 days ago
    const twentyDaysAgo = new Date();
    twentyDaysAgo.setDate(twentyDaysAgo.getDate() - 20);

    const query = {
      provider: { $in: ['meta', null] },
      $or: [
        { sentAt: { $gte: twentyDaysAgo } },
        { createdAt: { $gte: twentyDaysAgo } }
      ]
    };

    console.log('Querying messages since:', twentyDaysAgo.toISOString());

    const messages = await db.collection('whatsapp_messages').find(query).toArray();
    console.log(`Found ${messages.length} messages in the last 20 days.`);

    let inserted = 0;
    for (const row of messages) {
      const documentId = id(row._id || row.waMessageId);
      
      await bunny.execute({ 
        sql: `INSERT INTO meta_messages_sql (
                document_id, lead_id, phone_number, provider, direction, 
                message_type, status, wa_message_id, sender_number, 
                sent_at, created_at, updated_at, data_json
              ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?) 
              ON CONFLICT(document_id) DO UPDATE SET 
                data_json=excluded.data_json,
                status=excluded.status,
                updated_at=excluded.updated_at`, 
        args: [
          documentId, 
          row.leadId ? id(row.leadId) : null, 
          String(row.phoneNumber || ''), 
          'meta', 
          String(row.direction || 'outbound'), 
          String(row.messageType || 'text'), 
          String(row.status || 'queued'), 
          row.waMessageId ? String(row.waMessageId) : null, 
          row.senderNumber ? String(row.senderNumber) : null, 
          iso(row.sentAt), 
          iso(row.createdAt), 
          iso(row.updatedAt) || new Date().toISOString(), 
          json(row)
        ] 
      });
      
      inserted++;
      if (inserted % 100 === 0) {
        console.log(`Inserted ${inserted} / ${messages.length}`);
      }
    }
    
    console.log('\nMigration complete!');
    console.log(`Successfully migrated ${inserted} messages to BunnyDB.`);
    
  } finally { 
    await mongo.close(); 
    bunny.close(); 
  }
}

main().catch((error) => { 
  console.error('Meta migration failed:', error instanceof Error ? error.message : error); 
  process.exitCode = 1; 
});
