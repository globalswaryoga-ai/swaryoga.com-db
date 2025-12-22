#!/usr/bin/env node

/**
 * Check what's actually in MongoDB for the schedule
 * Run: node check-database.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const mongoUri = process.env.MONGODB_URI;

if (!mongoUri) {
  console.error('❌ MONGODB_URI not set in .env');
  process.exit(1);
}

const workshopScheduleSchema = new mongoose.Schema(
  {
    _id: { type: String, required: true },
    workshopSlug: { type: String, required: true, index: true },
    workshopName: { type: String, default: '' },
    mode: {
      type: String,
      enum: ['online', 'offline', 'residential', 'recorded'],
      required: true,
    },
    batch: {
      type: String,
      enum: ['morning', 'evening', 'full-day', 'anytime'],
      default: 'morning',
    },
    language: {
      type: String,
      enum: ['Hindi', 'English', 'Marathi'],
      default: 'Hindi',
    },
    startDate: { type: Date, required: false },
    endDate: { type: Date, required: false },
    price: { type: Number, default: 0 },
    currency: { type: String, enum: ['INR', 'USD', 'NPR'], default: 'INR' },
  },
  { timestamps: true, id: false }
);

const WorkshopSchedule = mongoose.model('WorkshopSchedule', workshopScheduleSchema);

async function checkDatabase() {
  try {
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000,
    });

    console.log('✅ Connected to MongoDB\n');

    const schedule = await WorkshopSchedule.findOne({ workshopSlug: 'basic-swar-yoga' }).lean();

    if (schedule) {
      console.log('📋 Found schedule in database:\n');
      console.log(JSON.stringify(schedule, null, 2));

      console.log('\n✅ Language field:', schedule.language || 'NOT SET');
      console.log('✅ Mode:', schedule.mode);
      console.log('✅ Workshop:', schedule.workshopName);
    } else {
      console.log('❌ Schedule not found');
    }

    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

checkDatabase();
