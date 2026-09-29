import { connectDB, SocialMediaAccount } from './lib/db.js';

async function run() {
  await connectDB();
  const accounts = await SocialMediaAccount.find({ platform: 'youtube' });
  console.log(accounts.map(a => ({ id: a._id, email: a.email, isConnected: a.isConnected, metadata: a.metadata })));
  process.exit(0);
}
run();
