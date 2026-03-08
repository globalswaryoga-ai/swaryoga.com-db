require('dotenv').config({ path: '.env.local' });
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

async function addTestUsers() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryoga_admin_crm');
  
  const users = [
    { name: 'Test User 1', email: 'test1@swaryoga.com', password: 'Test@123', role: 'admin' },
    { name: 'Test User 2', email: 'test2@swaryoga.com', password: 'Test@123', role: 'manager' },
    { name: 'Demo Admin', email: 'demo@swaryoga.com', password: 'Demo@123', role: 'admin' }
  ];
  
  for (const user of users) {
    const exists = await db.collection('admin_users').findOne({ email: user.email });
    if (exists) {
      console.log('Already exists:', user.email);
      continue;
    }
    
    const hashedPassword = await bcrypt.hash(user.password, 10);
    await db.collection('admin_users').insertOne({
      name: user.name,
      email: user.email,
      password: hashedPassword,
      role: user.role,
      isAdmin: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    console.log('Created:', user.email, '| Password:', user.password);
  }
  
  // List all users
  const allUsers = await db.collection('admin_users').find({}, { projection: { email: 1, name: 1, role: 1 } }).toArray();
  console.log('\nAll CRM users:', allUsers.length);
  allUsers.forEach(u => console.log(' -', u.email, '|', u.name, '|', u.role));
  
  await client.close();
}

addTestUsers().catch(console.error);
