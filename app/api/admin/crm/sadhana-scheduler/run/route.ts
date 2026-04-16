import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { handleCrmError } from '@/lib/crm-handlers';
import { sendWhatsAppText } from '@/lib/whatsapp';
import mongoose from 'mongoose';

const sadhanaScheduleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    videoUrl: { type: String, required: true },
    zoomLink: { type: String },
    zoomId: { type: String },
    zoomPassword: { type: String },
    schedule: {
      times: [String],
      days: [Number],
      repeatFrequency: String,
      startDate: String,
      timezone: { type: String, default: 'Asia/Kolkata' },
    },
    status: { type: String, default: 'active' },
    userId: String,
    tenantId: String,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { collection: 'sadhana_schedules' }
);

async function getSadhanaScheduleModel() {
  const db = mongoose.connection.useDb('swaryoga_admin_crm');
  return db.models.SadhanaSchedule || db.model('SadhanaSchedule', sadhanaScheduleSchema);
}

/**
 * Check if current time matches any scheduled time
 */
function isTimeToRun(scheduleItem: any, now: Date, timezone: string): boolean {
  const times = scheduleItem.schedule.times || [];
  const days = scheduleItem.schedule.days || [];
  const freq = scheduleItem.schedule.repeatFrequency || 'weekly';

  // Get current day of week (0 = Sunday, 1 = Monday, etc.)
  const currentDay = now.getDay();

  // Check if today is in the scheduled days
  if (!days.includes(currentDay)) {
    return false;
  }

  // Get current time in HH:MM format
  const currentHour = String(now.getHours()).padStart(2, '0');
  const currentMin = String(now.getMinutes()).padStart(2, '0');
  const currentTime = `${currentHour}:${currentMin}`;

  // Check if current time matches any scheduled time (within 1-minute window)
  return times.some((time: string) => {
    const [schedHour, schedMin] = time.split(':');
    const timeDiff = Math.abs(
      parseInt(currentHour + currentMin) - parseInt(schedHour + schedMin)
    );
    return timeDiff === 0; // Exact minute match
  });
}

/**
 * POST /api/admin/crm/sadhana-scheduler/run
 * Run scheduled Sadhana messages (called by cron)
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided = request.headers.get('x-cron-secret') || 
                       request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!provided || provided !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Allow Vercel Cron
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent.includes('vercel-cron') && cronSecret && 
        !request.headers.get('x-cron-secret')) {
      // Require cron secret if not Vercel
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const Model = await getSadhanaScheduleModel();
    const Lead = mongoose.connection.db?.collection('leads');

    // Find all active schedules
    const schedules = await Model.find({ status: 'active' }).lean();

    let sent = 0;
    let failed = 0;

    for (const schedule of schedules) {
      try {
        // Check if it's time to send
        if (!isTimeToRun(schedule, now, schedule.schedule.timezone)) {
          continue;
        }

        // Build message
        const message = buildSadhanaMessage(schedule);

        // Get leads assigned to this user
        const leads = await Lead?.find({ assignedToUserId: schedule.userId }).toArray();

        if (!leads || leads.length === 0) {
          continue;
        }

        // Send to each lead
        for (const lead of leads) {
          try {
            const phoneNumber = lead.phone || lead.phoneNumber;
            if (!phoneNumber) continue;
            
            await sendWhatsAppText(
              phoneNumber,
              message,
              'meta'
            );
            sent++;
          } catch (err) {
            console.error(`Failed to send to lead ${lead.phone}:`, err);
            failed++;
          }
        }
      } catch (err) {
        console.error(`Error processing schedule ${schedule._id}:`, err);
        failed++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        sent,
        failed,
        processed: schedules.length,
        timestamp: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'POST sadhana-scheduler/run');
  }
}

/**
 * Build message for Sadhana schedule
 */
function buildSadhanaMessage(schedule: any): string {
  let message = `🧘‍♀️ *${schedule.name}*\n\n`;

  message += `📹 *Sadhana Video:*\n${schedule.videoUrl}\n\n`;

  if (schedule.zoomLink) {
    message += `🎥 *Join Zoom Meeting:*\n${schedule.zoomLink}\n`;
  } else if (schedule.zoomId) {
    message += `🎥 *Zoom Meeting:*\n`;
    message += `ID: ${schedule.zoomId}\n`;
    if (schedule.zoomPassword) {
      message += `Password: ${schedule.zoomPassword}\n`;
    }
  }

  message += `\n🙏 Namaste!\n`;
  message += `_Sent automatically - Mon to Fri at scheduled times_`;

  return message;
}

/**
 * GET /api/admin/crm/sadhana-scheduler/run
 * GET endpoint for Vercel Cron (they send GET requests)
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    // Verify cron secret if configured
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret) {
      const provided = request.headers.get('x-cron-secret') || 
                       request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
      if (!provided || provided !== cronSecret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    // Allow Vercel Cron
    const userAgent = request.headers.get('user-agent') || '';
    if (!userAgent.includes('vercel-cron')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();
    const Model = await getSadhanaScheduleModel();
    const LeadModel = mongoose.connection.db?.collection('leads');

    const schedules = await Model.find({ status: 'active' }).lean();

    let sent = 0;
    let failed = 0;

    for (const schedule of schedules) {
      try {
        if (!isTimeToRun(schedule, now, schedule.schedule.timezone)) {
          continue;
        }

        const message = buildSadhanaMessage(schedule);
        const leads = await LeadModel?.find({ userId: schedule.userId }).toArray();

        if (!leads || leads.length === 0) {
          continue;
        }

        for (const lead of leads) {
          try {
            await sendWhatsAppText(
              lead.phoneNumber,
              message,
              'meta'
            );
            sent++;
          } catch (err) {
            console.error(`Failed to send to lead ${lead.phoneNumber}:`, err);
            failed++;
          }
        }
      } catch (err) {
        console.error(`Error processing schedule ${schedule._id}:`, err);
        failed++;
      }
    }

    return NextResponse.json(
      {
        success: true,
        sent,
        failed,
        processed: schedules.length,
        timestamp: now.toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET sadhana-scheduler/run');
  }
}
