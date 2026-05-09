/**
 * Seed Swar Yoga Bot join history for all past Sadhana sessions
 * This ensures that all sessions show at least 1 participant
 */

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const ADMIN_CRM_DB = 'swaryoga_admin_crm';

async function seedBotJoinHistory() {
  try {
    console.log('🤖 Seeding Swar Yoga Bot join history...');

    await mongoose.connect(MONGODB_URI);
    const db = mongoose.connection.useDb(ADMIN_CRM_DB);

    const joinHistoryCol = db.collection('sadhana_join_history');

    // Get all programs from the same database
    const programsCol = db.collection('sadhana_programs');
    const programs = await programsCol.find({}).toArray();

    console.log(`Found ${programs.length} programs`);

    let totalAdded = 0;

    // For each program, add bot to last 30 days of sessions
    for (const program of programs) {
      if (!program.slug || !program.timeSlots) continue;

      const timeSlots = program.timeSlots || ['06:00'];
      const now = new Date();

      // Generate dates for last 30 days
      for (let i = 1; i <= 30; i++) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);

        // For each time slot, create a bot join record
        for (const slot of timeSlots) {
          const [hours, minutes] = slot.split(':').map(Number);
          const joinedAt = new Date(date);
          joinedAt.setHours(hours, minutes, 0, 0);

          // Check if bot already joined this slot
          const existingJoin = await joinHistoryCol.findOne({
            programSlug: program.slug,
            name: 'Swar Yoga Bot',
            joinedAt: {
              $gte: new Date(joinedAt.getTime() - 60000), // within 1 minute
              $lte: new Date(joinedAt.getTime() + 60000),
            },
          });

          if (!existingJoin) {
            // Add bot join record
            const leftAt = new Date(joinedAt);
            leftAt.setMinutes(leftAt.getMinutes() + 40); // 40 minute session

            await joinHistoryCol.insertOne({
              programSlug: program.slug,
              name: 'Swar Yoga Bot',
              email: 'bot@swaryoga.com',
              joinedAt,
              leftAt,
              deviceFingerprint: 'swar-yoga-bot-device',
              ipAddress: '127.0.0.1',
              createdAt: new Date(),
            });

            totalAdded++;
          }
        }
      }
    }

    console.log(`✅ Added ${totalAdded} Swar Yoga Bot join records`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding bot join history:', error);
    process.exit(1);
  }
}

seedBotJoinHistory();
