import { connectDB, Community } from '@/lib/db';

// Community IDs used across the app (URLs, membership checks).
// Names are human-friendly labels stored in the Community collection.
export const DEFAULT_COMMUNITIES = [
  { id: 'general', name: 'Global Community for General' },
  { id: 'swar-yoga', name: 'Swar Yoga' },
  { id: 'aham-bramhasmi', name: 'Aham Bramhasmi' },
  { id: 'astavakra', name: 'Astavakra' },
  { id: 'shivoham', name: 'Shivoham' },
  { id: 'i-am-fit', name: 'I am Fit' },
  // Requested new community groups
  { id: 'youth', name: 'Youth' },
  { id: 'children', name: 'Children' },
  { id: 'married-couple', name: 'Married Couple' },
  { id: 'investors', name: 'Investors' },
  // Legacy / existing groups
  { id: 'children-yoga', name: 'Children Swar Yoga' },
  { id: 'youth-yoga', name: 'Youth Swar Yoga' },
  { id: 'english-yoga', name: 'English Swar Yoga' },
  { id: 'shankara', name: 'Shankara' },
  { id: 'amrut-bhoj', name: 'Amrut Bhoj' },
  { id: 'yogasana', name: 'Yogasana' },
  { id: 'businessman', name: 'Businessman' },
] as const;

// Back-compat export: older code seeded only by names.
export const DEFAULT_COMMUNITY_NAMES = DEFAULT_COMMUNITIES.map((c) => c.name);

export async function ensureDefaultCommunities(): Promise<void> {
  await connectDB();

  await Promise.all(
    DEFAULT_COMMUNITIES.map(async ({ id, name }) => {
      await Community.updateOne(
        // Prefer id-based lookup, but keep compatibility with old name-only communities.
        { $or: [{ id }, { name }] },
        { $setOnInsert: { id, name, members: [], createdAt: new Date() } },
        { upsert: true }
      );
    })
  );
}
