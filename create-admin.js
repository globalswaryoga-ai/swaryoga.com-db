const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Connect to MongoDB
const mongoUri = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority';

async function createAdmin() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(mongoUri);
    console.log('✅ Connected!');

    // Define User Schema
    const userSchema = new mongoose.Schema({
      userId: { type: String, unique: true, required: true },
      email: { type: String, unique: true, sparse: true },
      password: { type: String, required: true },
      isAdmin: { type: Boolean, default: false },
      role: { type: String, enum: ['admin', 'user', 'moderator'], default: 'user' },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Check if admin already exists
    const existingAdmin = await User.findOne({ userId: 'admincrm' });
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists!');
      await mongoose.disconnect();
      process.exit(0);
    }

    // Hash password
    const password = 'Turya@#$4596';
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const adminUser = new User({
      userId: 'admincrm',
      email: 'admin@swaryoga.com',
      password: hashedPassword,
      isAdmin: true,
      role: 'admin'
    });

    await adminUser.save();

    console.log('✅ Admin user created successfully!');
    console.log('');
    console.log('📋 Admin Details:');
    console.log('=================');
    console.log('User ID: admincrm');
    console.log('Email: admin@swaryoga.com');
    console.log('Password: Turya@#$4596');
    console.log('Role: admin');
    console.log('isAdmin: true');
    console.log('');
    console.log('🔑 You can now login with these credentials!');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
    process.exit(1);
  }
}

createAdmin();
