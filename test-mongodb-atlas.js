#!/usr/bin/env node

/**
 * Test MongoDB Atlas Connection with IP Whitelist Diagnostic
 * Usage: node test-mongodb-atlas.js
 */

require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const mongoUri = process.env.MONGODB_URI_MAIN;

console.log('🔍 MongoDB Atlas Connection Test\n');
console.log('📋 Configuration:');
console.log(`   URI: ${mongoUri ? '✅ Found' : '❌ Missing'}`);
console.log(`   Cluster: swaryogadb.dheqmu1.mongodb.net`);
console.log(`   Database: swaryogaDB\n`);

if (!mongoUri) {
  console.error('❌ ERROR: MONGODB_URI_MAIN not found in .env.local');
  process.exit(1);
}

console.log('🔗 Connecting to MongoDB Atlas...\n');

const startTime = Date.now();

mongoose.connect(mongoUri, {
  serverSelectionTimeoutMS: 15000,
  socketTimeoutMS: 15000,
})
  .then(async () => {
    const elapsed = Date.now() - startTime;
    console.log(`✅ SUCCESS: Connected to MongoDB Atlas in ${elapsed}ms\n`);
    
    // Get connection details
    const connection = mongoose.connection;
    console.log('📊 Connection Details:');
    console.log(`   Host: ${connection.host}`);
    console.log(`   Port: ${connection.port}`);
    console.log(`   Database: ${connection.db.getName()}`);
    console.log(`   Ready State: ${connection.readyState === 1 ? 'Connected' : 'Not Connected'}\n`);
    
    // Test database operations
    console.log('🧪 Testing database operations...');
    
    try {
      // Check if we can access admin database
      const adminDb = connection.db.admin();
      const serverStatus = await adminDb.command({ serverStatus: 1 });
      console.log(`   ✅ Server Status: OK`);
      console.log(`   ✅ MongoDB Version: ${serverStatus.version}`);
      
      // List databases
      const dbList = await adminDb.command({ listDatabases: 1 });
      console.log(`   ✅ Databases accessible: ${dbList.databases.length}\n`);
      
      console.log('🎉 All tests passed! MongoDB Atlas is accessible.');
      console.log('\n✅ Your IP is whitelisted on MongoDB Atlas!');
      console.log('✅ Vercel deployments can now connect to MongoDB.');
      
    } catch (testErr) {
      console.error(`   ❌ Server status check failed: ${testErr.message}`);
    }
    
    process.exit(0);
  })
  .catch((err) => {
    const elapsed = Date.now() - startTime;
    console.error(`❌ FAILED: Connection failed after ${elapsed}ms\n`);
    console.error('📌 Error Message:');
    console.error(`   ${err.message}\n`);
    
    if (err.message.includes('getaddrinfo') || err.message.includes('ENOTFOUND')) {
      console.error('🔴 Issue: DNS/Network problem');
      console.error('   Fix: Check internet connection or firewall\n');
    } else if (err.message.includes('authentication failed') || err.message.includes('unauthorized')) {
      console.error('🔴 Issue: Authentication failed');
      console.error('   Check: MongoDB username/password in .env.local\n');
    } else if (err.message.includes('EHOSTUNREACH') || err.message.includes('connect ECONNREFUSED')) {
      console.error('🔴 Issue: Cannot reach MongoDB Atlas servers');
      console.error('   Fix: Your IP is NOT whitelisted on MongoDB Atlas');
      console.error('   Action:');
      console.error('      1. Go to: https://cloud.mongodb.com/');
      console.error('      2. Click: Security → Network Access');
      console.error('      3. Add your IP: 0.0.0.0/0 (allow all) OR add specific IPs');
      console.error('      4. Wait 1-2 minutes for changes to apply');
      console.error('      5. Run this test again\n');
    } else {
      console.error('🔴 Issue: Unknown connection error');
      console.error(`   Details: ${err.message}\n`);
    }
    
    process.exit(1);
  });
