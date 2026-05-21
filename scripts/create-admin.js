#!/usr/bin/env node
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority';

async function createAdmin() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection;
    const users = db.collection('users');

    // Hash password
    const password = '1076Turya@2456';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if user exists
    const existing = await users.findOne({ userId: 'admincrm' });

    if (existing) {
      // Update existing user
      await users.updateOne(
        { userId: 'admincrm' },
        {
          $set: {
            password: hashedPassword,
            isAdmin: true,
            role: 'admin',
            permissions: ['crm'],
          }
        }
      );
      console.log('✅ Updated existing admincrm user');
    } else {
      // Create new user
      await users.insertOne({
        userId: 'admincrm',
        email: 'admin@swaryoga.com',
        password: hashedPassword,
        name: 'Admin CRM',
        isAdmin: true,
        role: 'admin',
        permissions: ['crm'],
        createdAt: new Date(),
      });
      console.log('✅ Created new admincrm user');
    }

    console.log('\nPassword:', password);
    console.log('Ready to login!');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

createAdmin();
