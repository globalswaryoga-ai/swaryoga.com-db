const mongoose = require('mongoose');
require('dotenv').config({ path: '.env.local' });

async function check() {
  await mongoose.connect(process.env.MONGODB_URI_MAIN);
  const Post = mongoose.models.CommunityPost || mongoose.model('CommunityPost', new mongoose.Schema({
    images: [String],
    content: String
  }));

  const posts = await Post.find({ images: { $exists: true, $not: { $size: 0 } } }).limit(5).lean();
  console.log('Posts with images:', posts.length);
  posts.forEach(p => {
    console.log(`- ID: ${p._id}, images: ${JSON.stringify(p.images)}`);
  });
  
  process.exit(0);
}

check().catch(err => {
  console.error(err);
  process.exit(1);
});
