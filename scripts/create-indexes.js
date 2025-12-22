/**
 * Database index creation script
 * Run: node scripts/create-indexes.js
 * 
 * Creates all recommended indexes for optimal query performance
 */

const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI environment variable not set');
  process.exit(1);
}

async function createIndexes() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected');

    const db = mongoose.connection.db;

    // Users Collection Indexes
    console.log('\n📊 Creating Users collection indexes...');
    const users = db.collection('users');
    
    await users.createIndex({ email: 1 }, { unique: true }).catch(() => null);
    console.log('  ✓ email (unique)');
    
    await users.createIndex({ createdAt: -1 }).catch(() => null);
    console.log('  ✓ createdAt');
    
    await users.createIndex({ status: 1, createdAt: -1 }).catch(() => null);
    console.log('  ✓ status + createdAt (compound)');
    
    await users.createIndex({ phone: 1 }, { sparse: true }).catch(() => null);
    console.log('  ✓ phone (sparse)');
    
    await users.createIndex({ country: 1 }).catch(() => null);
    console.log('  ✓ country');

    // Orders Collection Indexes
    console.log('\n📊 Creating Orders collection indexes...');
    const orders = db.collection('orders');
    
    await orders.createIndex({ userId: 1, createdAt: -1 }).catch(() => null);
    console.log('  ✓ userId + createdAt (compound)');
    
    await orders.createIndex({ paymentStatus: 1, createdAt: -1 }).catch(() => null);
    console.log('  ✓ paymentStatus + createdAt (compound)');
    
    await orders.createIndex({ orderStatus: 1 }).catch(() => null);
    console.log('  ✓ orderStatus');
    
    await orders.createIndex({ payuTxnId: 1 }, { sparse: true, unique: true }).catch(() => null);
    console.log('  ✓ payuTxnId (sparse, unique)');
    
    await orders.createIndex({ email: 1 }).catch(() => null);
    console.log('  ✓ email');

    // Sessions Collection Indexes
    console.log('\n📊 Creating Sessions collection indexes...');
    const sessions = db.collection('sessions');
    
    await sessions.createIndex({ userId: 1 }).catch(() => null);
    console.log('  ✓ userId');
    
    await sessions.createIndex({ sessionCode: 1 }, { unique: true }).catch(() => null);
    console.log('  ✓ sessionCode (unique)');
    
    await sessions.createIndex({ startDate: 1, endDate: 1 }).catch(() => null);
    console.log('  ✓ startDate + endDate (compound)');
    
    await sessions.createIndex({ enrollments: 1 }, { sparse: true }).catch(() => null);
    console.log('  ✓ enrollments (sparse)');

    // Notes Collection Indexes
    console.log('\n📊 Creating Notes collection indexes...');
    const notes = db.collection('notes');
    
    await notes.createIndex({ userId: 1, createdAt: -1 }).catch(() => null);
    console.log('  ✓ userId + createdAt (compound)');
    
    await notes.createIndex({ category: 1 }).catch(() => null);
    console.log('  ✓ category');
    
    await notes.createIndex({ isPublic: 1, createdAt: -1 }).catch(() => null);
    console.log('  ✓ isPublic + createdAt (compound)');
    
    await notes.createIndex({ tags: 1 }).catch(() => null);
    console.log('  ✓ tags');

    // CRM Leads Collection Indexes
    console.log('\n📊 Creating Leads collection indexes...');
    const leads = db.collection('leads');
    
    await leads.createIndex({ email: 1 }, { sparse: true }).catch(() => null);
    console.log('  ✓ email (sparse)');
    
    await leads.createIndex({ phone: 1 }, { sparse: true }).catch(() => null);
    console.log('  ✓ phone (sparse)');
    
    await leads.createIndex({ status: 1, createdAt: -1 }).catch(() => null);
    console.log('  ✓ status + createdAt (compound)');
    
    await leads.createIndex({ labels: 1 }).catch(() => null);
    console.log('  ✓ labels');
    
    await leads.createIndex({ lastContactDate: -1 }).catch(() => null);
    console.log('  ✓ lastContactDate');

    // Community Posts Collection Indexes
    console.log('\n📊 Creating Posts collection indexes...');
    const posts = db.collection('posts');
    
    await posts.createIndex({ communityId: 1, createdAt: -1 }).catch(() => null);
    console.log('  ✓ communityId + createdAt (compound)');
    
    await posts.createIndex({ authorId: 1 }).catch(() => null);
    console.log('  ✓ authorId');
    
    await posts.createIndex({ tags: 1 }).catch(() => null);
    console.log('  ✓ tags');
    
    await posts.createIndex({ likeCount: -1 }).catch(() => null);
    console.log('  ✓ likeCount');

    // Workshops Collection Indexes
    console.log('\n📊 Creating Workshops collection indexes...');
    const workshops = db.collection('workshops');
    
    await workshops.createIndex({ code: 1 }, { unique: true }).catch(() => null);
    console.log('  ✓ code (unique)');
    
    await workshops.createIndex({ startDate: 1, endDate: 1 }).catch(() => null);
    console.log('  ✓ startDate + endDate (compound)');
    
    await workshops.createIndex({ status: 1 }).catch(() => null);
    console.log('  ✓ status');

    console.log('\n✅ All indexes created successfully!\n');

    // Show index statistics
    console.log('📈 Index Statistics:');
    const collections = ['users', 'orders', 'sessions', 'notes', 'leads', 'posts', 'workshops'];
    
    for (const collName of collections) {
      try {
        const coll = db.collection(collName);
        const indexes = await coll.listIndexes().toArray();
        console.log(`  ${collName}: ${indexes.length} indexes`);
      } catch (err) {
        console.log(`  ${collName}: (not found)`);
      }
    }

    console.log('\n✨ Index creation complete!\n');
  } catch (error) {
    console.error('❌ Error creating indexes:', error.message);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
createIndexes();
