const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const mongoUri = 'mongodb+srv://swarsakshi9_db_user:hZnGhuVUNoew0Gje@swaryogadb.dheqmu1.mongodb.net/swaryogaDB?retryWrites=true&w=majority';
const JWT_SECRET = 'replace_me_with_a_long_random_string';

async function loginAdmin(userId, password) {
  try {
    console.log('');
    console.log('🔐 Authenticating Admin User...');
    console.log('================================');
    
    await mongoose.connect(mongoUri);

    // Define User Schema
    const userSchema = new mongoose.Schema({
      userId: String,
      email: String,
      password: String,
      isAdmin: Boolean,
      role: String,
      createdAt: Date
    });

    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // Find user
    const user = await User.findOne({ userId });
    if (!user) {
      console.log('❌ User not found!');
      await mongoose.disconnect();
      return;
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password!');
      await mongoose.disconnect();
      return;
    }

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: user.userId,
        email: user.email,
        isAdmin: user.isAdmin,
        role: user.role
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    console.log('✅ Authentication successful!');
    console.log('');
    console.log('📋 User Details:');
    console.log(`  • User ID: ${user.userId}`);
    console.log(`  • Email: ${user.email}`);
    console.log(`  • Role: ${user.role}`);
    console.log(`  • Admin: ${user.isAdmin}`);
    console.log('');
    console.log('🔑 JWT Token (valid for 7 days):');
    console.log(token);
    console.log('');
    console.log('✨ Use in requests:');
    console.log(`curl -H "Authorization: Bearer ${token}" http://localhost:3000/api/admin/crm/leads`);

    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error:', error.message);
    await mongoose.disconnect();
  }
}

// Get credentials from command line or use defaults
const userId = process.argv[2] || 'admincrm';
const password = process.argv[3] || 'Turya@#$4596';

loginAdmin(userId, password);
