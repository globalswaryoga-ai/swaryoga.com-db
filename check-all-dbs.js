const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

const mongoUri = process.env.MONGODB_URI_MAIN || process.env.MONGODB_URI;

async function checkAllDatabases() {
  const client = await mongoose.connect(mongoUri, { 
    maxPoolSize: 10 
  }).then(() => mongoose.connection.getClient());
  
  try {
    console.log('📊 CHECKING ALL DATABASES:\n');
    
    const adminDb = client.db('admin');
    const dbNames = await adminDb.admin().listDatabases();
    
    for (const db of dbNames.databases) {
      const dbName = db.name;
      if (dbName.startsWith('admin') || dbName === 'local') continue;
      
      const database = client.db(dbName);
      const collections = await database.listCollections().toArray();
      
      console.log(`\n📁 DATABASE: ${dbName}`);
      console.log('   Collections:');
      
      for (const col of collections) {
        const count = await database.collection(col.name).countDocuments();
        if (col.name === 'leads') {
          console.log(`   ⭐ ${col.name}: ${count} documents ${count > 100 ? '✅' : '❌'}`);
        } else {
          console.log(`      ${col.name}: ${count}`);
        }
      }
    }
    
  } finally {
    await mongoose.disconnect();
  }
}

checkAllDatabases();
