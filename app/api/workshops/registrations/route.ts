import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { notifyWorkshopEnrollment } from '@/lib/notifications';
import crypto from 'node:crypto';

export const dynamic = 'force-dynamic';

async function initRegistrationTable() {
  await bunnyExecute({
    sql: `CREATE TABLE IF NOT EXISTS workshop_registrations_sql (
      id TEXT PRIMARY KEY,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      workshop_id TEXT,
      workshop_name TEXT,
      schedule_id TEXT,
      mode TEXT,
      start_date TEXT,
      end_date TEXT,
      price REAL,
      currency TEXT,
      status TEXT,
      order_id TEXT,
      payment_status TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    )`
  });
}

export async function POST(request: NextRequest) {
  try {
    await initRegistrationTable();

    const {
      firstName,
      lastName,
      email,
      phone,
      workshopId,
      workshopName,
      scheduleId,
      mode,
      startDate,
      endDate,
      price,
      currency = 'INR',
      orderId,
    } = await request.json();

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !workshopId ||
      !workshopName ||
      !scheduleId ||
      !mode ||
      !startDate ||
      !endDate ||
      price === undefined
    ) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const regId = crypto.randomUUID();
    const paymentStatus = orderId ? 'completed' : 'pending';
    const status = 'confirmed';
    
    await bunnyExecute({
      sql: `INSERT INTO workshop_registrations_sql (
        id, first_name, last_name, email, phone, workshop_id, workshop_name,
        schedule_id, mode, start_date, end_date, price, currency,
        status, order_id, payment_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        regId, firstName, lastName, email, phone, workshopId, workshopName,
        scheduleId, mode, startDate, endDate, price, currency,
        status, orderId || null, paymentStatus
      ]
    });

    const registration = {
      _id: regId,
      firstName, lastName, email, phone, workshopId, workshopName,
      scheduleId, mode, startDate, endDate, price, currency,
      status, orderId, paymentStatus,
      registrationDate: new Date().toISOString()
    };

    if (email) {
      notifyWorkshopEnrollment(
        { name: `${firstName} ${lastName}`.trim(), email, phone },
        { workshopName, startDate, endDate, mode },
      ).catch(err => console.error('[WorkshopReg] Notification error:', err));
    }

    return NextResponse.json(
      {
        message: 'Registration successful',
        registrationId: regId,
        registration,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Workshop registration error:', error);
    return NextResponse.json(
      { error: 'Failed to create registration' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    await initRegistrationTable();

    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json(
        { error: 'Email parameter is required' },
        { status: 400 }
      );
    }

    const result = await bunnyExecute({
      sql: 'SELECT * FROM workshop_registrations_sql WHERE email = ? ORDER BY created_at DESC',
      args: [email]
    });

    const registrations = result.rows.map((r: any) => ({
      _id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email,
      phone: r.phone,
      workshopId: r.workshop_id,
      workshopName: r.workshop_name,
      scheduleId: r.schedule_id,
      mode: r.mode,
      startDate: r.start_date,
      endDate: r.end_date,
      price: r.price,
      currency: r.currency,
      status: r.status,
      orderId: r.order_id,
      paymentStatus: r.payment_status,
      registrationDate: r.created_at
    }));

    return NextResponse.json(
      {
        message: 'Registrations retrieved successfully',
        data: registrations,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching registrations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch registrations' },
      { status: 500 }
    );
  }
}
