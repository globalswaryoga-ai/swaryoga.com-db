/**
 * Migration: Align DB communities with COMMUNITY_DESIGNS
 * 
 * 1. Add missing communities (swar-yoga-l1..l5, aahar, etc.)
 * 2. Migrate the 1 member from "swar-yoga" to "swar-yoga-l1" 
 * 3. Archive stale communities that no longer have a join form
 */
const { MongoClient } = require('mongodb');
require('dotenv').config({ path: '.env.local' });

// The canonical communities from communityColorSystem.ts
const CANONICAL_COMMUNITIES = [
  { id: 'global', name: 'Global Community', type: 'global' },
  { id: 'old-sadhak-community', name: 'Swar Yoga Sadhak Community', type: 'workshop_active' },
  { id: 'swar-yoga-l1', name: 'Swar Yoga L-1', type: 'workshop_active' },
  { id: 'swar-yoga-l2', name: 'Swar Yoga L-2', type: 'workshop_active' },
  { id: 'swar-yoga-l3', name: 'Swar Yoga L-3', type: 'workshop_active' },
  { id: 'swar-yoga-l4', name: 'Swar Yoga L-4', type: 'workshop_active' },
  { id: 'swar-yoga-l5', name: 'Swar Yoga L-5', type: 'workshop_active' },
  { id: 'aahar', name: 'Aahar (Diet & Nutrition)', type: 'workshop_active' },
  { id: 'i-am-fit', name: 'I am Fit', type: 'workshop_active' },
  { id: 'pre-planning-garbh-sankar', name: 'Pre Planning Garbh Sankar', type: 'workshop_active' },
  { id: '9-month-garbha-sanskar', name: '9 Month Garbha Sanskar Sadhana', type: 'workshop_active' },
  { id: 'youth', name: 'Youth Swar Yoga', type: 'workshop_active' },
  { id: 'children', name: 'Children Yoga', type: 'workshop_active' },
  { id: 'yogasana', name: 'Yogasana Practice', type: 'workshop_active' },
];

async function migrate() {
  const client = new MongoClient(process.env.MONGODB_URI_MAIN);
  await client.connect();
  const db = client.db('swaryogaDB');
  const commCol = db.collection('communities');
  const memberCol = db.collection('communitymembers');

  console.log('=== Step 1: Archive stale communities first (avoid name conflicts) ===');
  const staleIds = ['swar-yoga', 'aham-bramhasmi', 'astavakra', 'shivoham', 'investors', 
                    'married-couple', 'english-yoga', 'shankara', 'amrut-bhoj', 'businessman',
                    'children-yoga', 'youth-yoga', 'general'];
  for (const id of staleIds) {
    const result = await commCol.updateOne(
      { id, isArchived: { $ne: true } },
      { $set: { isArchived: true, archivedAt: new Date(), updatedAt: new Date() } }
    );
    if (result.modifiedCount > 0) {
      console.log(`  ARCHIVED: ${id}`);
    }
  }
  
  // Also remove the name uniqueness from archived ones so we can reuse names
  // Rename archived ones to avoid conflict
  for (const id of staleIds) {
    await commCol.updateOne(
      { id, isArchived: true },
      { $set: { name: `[Archived] ${id}` } }
    );
  }

  console.log('\n=== Step 2: Upsert canonical communities ===');
  for (const comm of CANONICAL_COMMUNITIES) {
    const existing = await commCol.findOne({ id: comm.id, isArchived: { $ne: true } });
    if (existing) {
      // Update name and joinLink
      await commCol.updateOne(
        { id: comm.id, isArchived: { $ne: true } },
        { $set: { name: comm.name, joinLink: `https://swaryoga.com/join/${comm.id}`, updatedAt: new Date() } }
      );
      console.log(`  UPDATED: ${comm.id} -> "${comm.name}"`);
    } else {
      // Insert new
      await commCol.insertOne({
        id: comm.id,
        name: comm.name,
        description: '',
        type: comm.type,
        joinLink: `https://swaryoga.com/join/${comm.id}`,
        whatsappGroupId: '',
        isArchived: false,
        members: [],
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`  CREATED: ${comm.id} -> "${comm.name}"`);
    }
  }

  console.log('\n=== Step 3: Migrate swar-yoga member to swar-yoga-l1 ===');
  const swaryogaMembers = await memberCol.find({ communityId: 'swar-yoga' }).toArray();
  console.log(`  Found ${swaryogaMembers.length} member(s) in swar-yoga`);
  for (const m of swaryogaMembers) {
    // Check if already in swar-yoga-l1
    const existsInL1 = await memberCol.findOne({ communityId: 'swar-yoga-l1', mobile: m.mobile });
    if (existsInL1) {
      console.log(`  SKIP: ${m.name} (${m.mobile}) — already in swar-yoga-l1`);
    } else {
      await memberCol.insertOne({
        ...m,
        _id: undefined,
        communityId: 'swar-yoga-l1',
        communityName: 'Swar Yoga L-1',
        updatedAt: new Date(),
      });
      console.log(`  MIGRATED: ${m.name} (${m.mobile}) -> swar-yoga-l1`);
    }
  }

  // Final check
  console.log('\n=== Final State ===');
  const activeCommunities = await commCol.find({ isArchived: { $ne: true } }).toArray();
  console.log(`Active communities: ${activeCommunities.length}`);
  for (const c of activeCommunities) {
    const memberCount = await memberCol.countDocuments({ communityId: c.id });
    console.log(`  ${c.id} | "${c.name}" | ${memberCount} members | joinLink: ${c.joinLink}`);    
  }

  await client.close();
  console.log('\nDone!');
}

migrate().catch(console.error);
