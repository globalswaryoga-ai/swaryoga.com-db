/**
 * Sadhana Participants API - Upload/Manage email and WhatsApp numbers
 * Supports bulk upload and manual add
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { handleCrmError, isSuperAdmin } from '@/lib/crm-handlers';
import mongoose from 'mongoose';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/crm/sadhana-scheduler/participants
 * Add or update participants for a schedule
 *
 * Body options:
 * 1. Add single: { scheduleId, email?: string, phone?: string }
 * 2. Bulk add: { scheduleId, emails: string[], phones: string[] }
 * 3. Replace: { scheduleId, emails: string[], phones: string[], replace: true }
 */
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { scheduleId, email, phone, emails, phones, replace } = body;

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'scheduleId is required' },
        { status: 400 }
      );
    }

    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const SadhanaSchedule = db.model('SadhanaSchedule');

    // Find schedule
    const schedule = await SadhanaSchedule.findById(scheduleId);
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Option 1: Add single email
    if (email && !emails) {
      if (!schedule.participantEmails) schedule.participantEmails = [];
      if (schedule.participantEmails.length >= 299) {
        return NextResponse.json(
          { error: 'Maximum 299 emails allowed' },
          { status: 400 }
        );
      }
      if (!schedule.participantEmails.includes(email)) {
        schedule.participantEmails.push(email);
      }
    }

    // Option 2: Add single phone
    if (phone && !phones) {
      if (!schedule.participantPhones) schedule.participantPhones = [];
      if (schedule.participantPhones.length >= 299) {
        return NextResponse.json(
          { error: 'Maximum 299 phone numbers allowed' },
          { status: 400 }
        );
      }
      // Normalize phone: keep only digits
      const normalizedPhone = phone.replace(/\D/g, '');
      if (!schedule.participantPhones.includes(normalizedPhone)) {
        schedule.participantPhones.push(normalizedPhone);
      }
    }

    // Option 3: Bulk add emails
    if (emails && Array.isArray(emails)) {
      if (replace) {
        schedule.participantEmails = [];
      }
      if (!schedule.participantEmails) schedule.participantEmails = [];

      for (const e of emails) {
        if (schedule.participantEmails.length >= 299) break;
        if (!schedule.participantEmails.includes(e)) {
          schedule.participantEmails.push(e);
        }
      }

      if (schedule.participantEmails.length > 299) {
        schedule.participantEmails = schedule.participantEmails.slice(0, 299);
      }
    }

    // Option 4: Bulk add phones
    if (phones && Array.isArray(phones)) {
      if (replace) {
        schedule.participantPhones = [];
      }
      if (!schedule.participantPhones) schedule.participantPhones = [];

      for (const p of phones) {
        if (schedule.participantPhones.length >= 299) break;
        const normalizedPhone = p.replace(/\D/g, '');
        if (normalizedPhone && !schedule.participantPhones.includes(normalizedPhone)) {
          schedule.participantPhones.push(normalizedPhone);
        }
      }

      if (schedule.participantPhones.length > 299) {
        schedule.participantPhones = schedule.participantPhones.slice(0, 299);
      }
    }

    // Save
    await schedule.save();

    console.log(
      `[Participants] ✅ Updated schedule ${scheduleId}: ${schedule.participantEmails?.length || 0} emails, ${schedule.participantPhones?.length || 0} phones`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Participants updated',
        schedule: {
          id: schedule._id,
          name: schedule.name,
          emailCount: schedule.participantEmails?.length || 0,
          phoneCount: schedule.participantPhones?.length || 0,
          emails: schedule.participantEmails || [],
          phones: schedule.participantPhones || [],
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'POST participants');
  }
}

/**
 * GET /api/admin/crm/sadhana-scheduler/participants
 * Get participants for a schedule
 * ?scheduleId=xxx
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const scheduleId = request.nextUrl.searchParams.get('scheduleId');

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'scheduleId required' },
        { status: 400 }
      );
    }

    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const SadhanaSchedule = db.model('SadhanaSchedule');

    const schedule = await SadhanaSchedule.findById(scheduleId);
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        schedule: {
          id: schedule._id,
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
 * Remove participant from schedule
 * Body: { scheduleId, email?, phone? }
 */
export async function DELETE(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { scheduleId, email, phone } = body;

    if (!scheduleId) {
      return NextResponse.json(
        { error: 'scheduleId required' },
        { status: 400 }
      );
    }

    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const SadhanaSchedule = db.model('SadhanaSchedule');

    const schedule = await SadhanaSchedule.findById(scheduleId);
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    if (email) {
      schedule.participantEmails = (schedule.participantEmails || []).filter(e => e !== email);
    }

    if (phone) {
      const normalizedPhone = phone.replace(/\D/g, '');
      schedule.participantPhones = (schedule.participantPhones || []).filter(p => p !== normalizedPhone);
    }

    await schedule.save();

    return NextResponse.json(
      {
        success: true,
        message: 'Participant removed',
        emailCount: schedule.participantEmails?.length || 0,
        phoneCount: schedule.participantPhones?.length || 0,
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'DELETE participants');
  }
}

/**
 * PUT /api/admin/crm/sadhana-scheduler/participants/bulk-upload
 * Bulk upload CSV/JSON data
 *
 * Body: {
 *   scheduleId: "xxx",
 *   data: [
 *     { email: "person1@example.com", phone: "919876543210", name: "John" },
 *     { email: "person2@example.com", phone: "919876543211", name: "Jane" }
 *   ],
 *   replace: false
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    await connectDB();

    const token = request.headers.get('authorization')?.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded || !isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { scheduleId, data, replace } = body;

    if (!scheduleId || !data || !Array.isArray(data)) {
      return NextResponse.json(
        { error: 'scheduleId and data array required' },
        { status: 400 }
      );
    }

    const db = mongoose.connection.useDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');
    const SadhanaSchedule = db.model('SadhanaSchedule');

    const schedule = await SadhanaSchedule.findById(scheduleId);
    if (!schedule) {
      return NextResponse.json(
        { error: 'Schedule not found' },
        { status: 404 }
      );
    }

    // Reset if replace
    if (replace) {
      schedule.participantEmails = [];
      schedule.participantPhones = [];
    }

    let emailCount = 0;
    let phoneCount = 0;
    let skipped = 0;

    for (const item of data) {
      // Add email
      if (item.email && emailCount < 299) {
        if (!schedule.participantEmails.includes(item.email)) {
          schedule.participantEmails.push(item.email);
          emailCount++;
        }
      }

      // Add phone
      if (item.phone && phoneCount < 299) {
        const normalizedPhone = String(item.phone).replace(/\D/g, '');
        if (normalizedPhone && !schedule.participantPhones.includes(normalizedPhone)) {
          schedule.participantPhones.push(normalizedPhone);
          phoneCount++;
        }
      }

      if (emailCount >= 299 && phoneCount >= 299) break;
    }

    skipped = data.length - emailCount - phoneCount;

    await schedule.save();

    console.log(
      `[Participants] ✅ Bulk upload complete: +${emailCount} emails, +${phoneCount} phones, skipped ${skipped}`
    );

    return NextResponse.json(
      {
        success: true,
        message: 'Bulk upload completed',
        added: emailCount + phoneCount,
        skipped,
        schedule: {
          id: schedule._id,
          name: schedule.name,
          emailCount: schedule.participantEmails?.length || 0,
          phoneCount: schedule.participantPhones?.length || 0,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    return handleCrmError(error, 'PUT bulk-upload');
  }
}
