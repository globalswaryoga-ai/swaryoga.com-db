import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin } from '@/lib/crm-handlers';
import {
  getSadhanaSchedule,
  updateSadhanaSchedule,
} from '@/lib/bunnySadhanaSchedulerRepository';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/sadhana-scheduler/participants
 * Add or update participants for a schedule in Bunny Database
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);

    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const body = await request.json();
    const { scheduleId, email, phone, emails, phones, replace } = body;

    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId is required' }, { status: 400 });
    }

    const schedule = await getSadhanaSchedule(scheduleId);
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    let participantEmails: string[] = replace ? [] : [...(schedule.participantEmails || [])];
    let participantPhones: string[] = replace ? [] : [...(schedule.participantPhones || [])];

    if (email && !emails) {
      if (!participantEmails.includes(email)) {
        participantEmails.push(email);
      }
    }

    if (phone && !phones) {
      const normalizedPhone = phone.replace(/\D/g, '');
      if (normalizedPhone && !participantPhones.includes(normalizedPhone)) {
        participantPhones.push(normalizedPhone);
      }
    }

    if (emails && Array.isArray(emails)) {
      for (const e of emails) {
        if (!participantEmails.includes(e)) participantEmails.push(e);
      }
    }

    if (phones && Array.isArray(phones)) {
      for (const p of phones) {
        const normalized = String(p).replace(/\D/g, '');
        if (normalized && !participantPhones.includes(normalized)) {
          participantPhones.push(normalized);
        }
      }
    }

    participantEmails = participantEmails.slice(0, 299);
    participantPhones = participantPhones.slice(0, 299);

    const updated = await updateSadhanaSchedule(scheduleId, {
      participantEmails,
      participantPhones,
    });

    return NextResponse.json({
      success: true,
      message: 'Participants updated',
      schedule: {
        id: updated?.id,
        name: updated?.name,
        emailCount: updated?.participantEmails?.length || 0,
        phoneCount: updated?.participantPhones?.length || 0,
        emails: updated?.participantEmails || [],
        phones: updated?.participantPhones || [],
      },
    });
  } catch (error) {
    return handleCrmError(error, 'POST participants');
  }
}

/**
 * GET /api/admin/crm/sadhana-scheduler/participants
 */
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);

    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const scheduleId = request.nextUrl.searchParams.get('scheduleId');
    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId required' }, { status: 400 });
    }

    const schedule = await getSadhanaSchedule(scheduleId);
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    return NextResponse.json(
      {
        success: true,
        schedule: {
          id: schedule.id,
          name: schedule.name,
          emailCount: schedule.participantEmails?.length || 0,
          phoneCount: schedule.participantPhones?.length || 0,
          emails: schedule.participantEmails || [],
          phones: schedule.participantPhones || [],
          enableEmailReminders: schedule.enableEmailReminders || false,
          enableWhatsAppReminders: schedule.enableWhatsAppReminders || false,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'GET participants');
  }
}

/**
 * DELETE /api/admin/crm/sadhana-scheduler/participants
 */
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace(/^Bearer\s+/i, '');
    const decoded = verifyToken(token);

    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const body = await request.json();
    const { scheduleId, email, phone } = body;

    if (!scheduleId) {
      return NextResponse.json({ error: 'scheduleId required' }, { status: 400 });
    }

    const schedule = await getSadhanaSchedule(scheduleId);
    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    let participantEmails = schedule.participantEmails || [];
    let participantPhones = schedule.participantPhones || [];

    if (email) {
      participantEmails = participantEmails.filter((e) => e !== email);
    }
    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '');
      participantPhones = participantPhones.filter((p) => p !== normalizedPhone);
    }

    const updated = await updateSadhanaSchedule(scheduleId, {
      participantEmails,
      participantPhones,
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Participant removed',
        schedule: {
          id: updated?.id,
          name: updated?.name,
          emailCount: updated?.participantEmails?.length || 0,
          phoneCount: updated?.participantPhones?.length || 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'DELETE participants');
  }
}
