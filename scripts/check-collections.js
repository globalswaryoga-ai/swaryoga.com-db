const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });
(async () => {
  const c = await MongoClient.connect(process.env.MONGODB_URI_MAIN);
  const db = c.db('swaryogaDB');
  
  const withActive = await db.collection('acc_ledgers').countDocuments({ financialYear: '2023-24', isActive: true });
  const total = await db.collection('acc_ledgers').countDocuments({ financialYear: '2023-24' });
  console.log('acc_ledgers 2023-24: isActive=true:', withActive, '| total:', total);
  
  const collections = await db.listCollections().toArray();
  const tallyCollections = collections.filter(col => col.name.includes('tally') || col.name.includes('acc_'));
  console.log('\nTally-related collections:');
  for (const col of tallyCollections) {
    const count = await db.collection(col.name).countDocuments({});
    console.log('  ' + col.name + ': ' + count + ' docs');
  }
  
  // Check if mongoose getModel might be registering wrong collection
  // Check the actual mongoose model behavior
  const mongoose = require('mongoose');
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  
  // Check what models are registered
  const modelNames = mongoose.modelNames();
  console.log('\nRegistered mongoose models:', modelNames);
  
  // Check if AccLedger model exists and what collection it points to
  for (const name of modelNames) {
    const model = mongoose.model(name);
    console.log('  ' + name + ' -> collection: ' + model.collection.collectionName);
  }
  
  await mongoose.disconnect();
  await c.close();
})();
