/**
 * Ritucharya Logic Table API
 * Admin saves weather → Ritu mapping for all 18 Ritu-Phase combinations
 *
 * GET  /api/admin/crm/ritucharya-logic          → all 18 rows
 * POST /api/admin/crm/ritucharya-logic          → upsert one row
 * PUT  /api/admin/crm/ritucharya-logic          → save all rows at once
 */

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

const logicSchema = new mongoose.Schema({
  ritu:           { type: String, required: true },  // 'shishir' | 'vasant' | ...
  phase:          { type: String, required: true },  // 'begin' | 'peak' | 'last'
  tempMin:        { type: Number, default: 0   },
  tempMax:        { type: Number, default: 40  },
  humidMin:       { type: Number, default: 20  },
  humidMax:       { type: Number, default: 80  },
  windMin:        { type: Number, default: 10  },
  windMax:        { type: Number, default: 40  },
  skyConditions:  { type: [String], default: [] },  // ['Clear', 'Partly Cloudy', ...]
  aqiMin:         { type: Number, default: 0   },
  aqiMax:         { type: Number, default: 300 },
  ayana:          { type: String, default: ''  },   // 'uttarayan' | 'dakshinayan'
  characterEn:    { type: String, default: ''  },
  characterHi:    { type: String, default: ''  },
  dateStart:      { type: String, default: ''  },   // 'MM-DD' e.g. '01-15'
  dateEnd:        { type: String, default: ''  },   // 'MM-DD' e.g. '02-10'
  updatedAt:      { type: Date,   default: Date.now },
});

logicSchema.index({ ritu: 1, phase: 1 }, { unique: true });

function getLogicModel() {
  return mongoose.models.RitucharyaLogic ||
    mongoose.model('RitucharyaLogic', logicSchema);
}

export async function GET() {
  try {
    await connectDB();
    const rows = await getLogicModel().find({}).sort({ ritu: 1, phase: 1 }).lean();
    return NextResponse.json({ success: true, rows });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { ritu, phase, ...rest } = body;
    if (!ritu || !phase) {
      return NextResponse.json({ success: false, error: 'ritu and phase required' }, { status: 400 });
    }
    const row = await getLogicModel().findOneAndUpdate(
      { ritu, phase },
      { $set: { ...rest, updatedAt: new Date() } },
      { upsert: true, new: true }
    ).lean();
    return NextResponse.json({ success: true, row });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await connectDB();
    const { rows } = await req.json();
    if (!Array.isArray(rows)) {
      return NextResponse.json({ success: false, error: 'rows array required' }, { status: 400 });
    }
    const Model = getLogicModel();
    const ops = rows.map((row: any) => ({
      updateOne: {
        filter: { ritu: row.ritu, phase: row.phase },
        update: { $set: { ...row, updatedAt: new Date() } },
        upsert: true,
      },
    }));
    await Model.bulkWrite(ops);
    return NextResponse.json({ success: true, saved: rows.length });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
