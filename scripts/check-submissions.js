require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

async function check() {
  console.log('Connecting to:', process.env.MONGODB_URI_MAIN?.split('@')[1] || 'no URI');
  
  await mongoose.connect(process.env.MONGODB_URI_MAIN, {
    dbName: 'swaryogaDB',
  });
  console.log('Connected to:', mongoose.connection.db.databaseName);
  
  // Define experience schema
  const experienceSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    content: String,
    rating: Number,
    photoUrl: String,
    communityId: String,
    status: String,
    createdAt: Date,
  }, { collection: 'community_experiences' });
  
  const Experience = mongoose.model('Experience', experienceSchema);
  
  // Fetch experiences
  const experiences = await Experience.find({ status: 'pending' }).sort({ createdAt: -1 }).lean();
  console.log('\n=== Experiences via Mongoose (pending) ===');
  console.log('Total found:', experiences.length);
  experiences.forEach(e => {
    console.log(`- ${e.userName}: ${(e.content || '').slice(0,50)}...`);
  });
  
  await mongoose.disconnect();
}

check().catch(console.error);
