#!/usr/bin/env node

const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;
const MAIN_DB_NAME = process.env.MONGODB_MAIN_DB_NAME || 'swaryogaDB';

async function checkLeads() {
  try {
    await mongoose.connect(MONGODB_URI, {
      dbName: MAIN_DB_NAME,
      tls: true,
      retryWrites: true,
    });

    const db = mongoose.connection;

    // Check for the test phone number
    const testPhone = '919779006820';
    const lead = await db.collection('leads').findOne({ phoneNumber: testPhone });

    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║              CHECKING LEAD FOR TEST PHONE NUMBER               ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log(`Phone: ${testPhone}\n`);

    if (lead) {
      console.log('✅ LEAD FOUND:');
      console.log(JSON.stringify(lead, null, 2));
    } else {
      console.log('❌ NO LEAD FOUND for this phone number\n');
      console.log('This means either:');
      console.log('  1. Lead creation in webhook is failing');
      console.log('  2. Lead is being created but with different phone format\n');
      
      // Check for similar phone numbers
      const allLeads = await db.collection('leads').find({}).limit(5).toArray();
      console.log('Sample of existing leads:');
      allLeads.forEach(l => {
        console.log(`  - ${l.phoneNumber}`);
      });
    }

    console.log('\n');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

checkLeads();
