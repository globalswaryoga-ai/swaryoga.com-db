/**
 * Ritucharya Diet Plan API
 * GET  /api/admin/crm/ritucharya-diet?ritu=grishma&phase=peak  → get one plan
 * GET  /api/admin/crm/ritucharya-diet                          → get all plans
 * POST /api/admin/crm/ritucharya-diet                          → save/upsert plan
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

// ─── Schema ───────────────────────────────────────────────────────────────────

const mealSlotSchema = new mongoose.Schema({
  slotKey:  String, // 'brahma_muhurta' | 'herbal_drink' | 'breakfast' | 'lunch' | 'dinner' | 'before_sleep'
  time:     String,
  label:    String,
  emoji:    String,
  foods:    [String],
  tip:      String,
}, { _id: false });

const dietPlanSchema = new mongoose.Schema({
  ritu:          { type: String, required: true }, // 'shishir' | 'vasant' | ...
  phase:         { type: String, required: true }, // 'begin' | 'peak' | 'last'
  meals:         [mealSlotSchema],
  herbs:         [String],
  lifestyleTips: [String],
  avoidFoods:    [String],
  specialNotes:  String,
  updatedAt:     { type: Date, default: Date.now },
}, { timestamps: true });

// Compound unique index — one plan per ritu+phase
dietPlanSchema.index({ ritu: 1, phase: 1 }, { unique: true });

function getDietPlan() {
  return mongoose.models.RitucharyaDietPlan ||
    mongoose.model('RitucharyaDietPlan', dietPlanSchema);
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const DietPlan = getDietPlan();

    const { searchParams } = new URL(req.url);
    const ritu  = searchParams.get('ritu');
    const phase = searchParams.get('phase');

    if (ritu && phase) {
      const plan = await DietPlan.findOne({ ritu, phase }).lean();
      return NextResponse.json({ success: true, plan: plan || null });
    }

    // Return all plans
    const plans = await DietPlan.find({}).lean();
    return NextResponse.json({ success: true, plans });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

// ─── POST (upsert) ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const DietPlan = getDietPlan();
    const body = await req.json();

    const { ritu, phase, meals, herbs, lifestyleTips, avoidFoods, specialNotes } = body;
    if (!ritu || !phase) {
      return NextResponse.json({ success: false, error: 'ritu and phase are required' }, { status: 400 });
    }

    const plan = await DietPlan.findOneAndUpdate(
      { ritu, phase },
      { $set: { meals, herbs, lifestyleTips, avoidFoods, specialNotes, updatedAt: new Date() } },
      { upsert: true, new: true }
    ).lean();

    return NextResponse.json({ success: true, plan });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
