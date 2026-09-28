import { connectDB, SocialMediaAccount } from './lib/db';
import mongoose from 'mongoose';

async function run() {
  await connectDB();
  const accounts = await SocialMediaAccount.find({}).lean();
  console.log(JSON.stringify(accounts.map(a => ({ platform: a.platform, name: a.accountName, handle: a.accountHandle })), null, 2));
  mongoose.disconnect();
}
run();
