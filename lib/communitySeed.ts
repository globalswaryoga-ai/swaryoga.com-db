import { connectDB } from '@/lib/db';
import { Community } from '@/models/Community';

export const DEFAULT_COMMUNITY_NAMES = ['Swar Yoga Sadhak', 'Swar Yoga New Sadhak'] as const;

export async function ensureDefaultCommunities(): Promise<void> {
  await connectDB();

  await Promise.all(
    DEFAULT_COMMUNITY_NAMES.map(async (name) => {
      await Community.updateOne(
        { name },
        { $setOnInsert: { name, members: [], createdAt: new Date() } },
        { upsert: true }
      );
    })
  );
}
