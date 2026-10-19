import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { bunnyExecute } from '@/lib/bunnyDatabase';

/**
 * POST /api/crm-site/contact
 * Stores a contact-us form submission in BunnyDB.
 * 100% Bunny Database: saves to crm_site_contacts_sql and syncs as a new lead to leads_sql.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    // Validate
    if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
      return NextResponse.json(
        { error: 'Name, email, subject, and message are required.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Invalid email address.' }, { status: 400 });
    }

    const trimmedName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone?.trim() || '';
    const cleanSubject = subject.trim();
    const cleanMessage = message.trim();
    const id = `contact_${crypto.randomBytes(8).toString('hex')}`;
    const now = new Date().toISOString();

    // 1. Ensure crm_site_contacts_sql table exists in BunnyDB
    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS crm_site_contacts_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        subject TEXT NOT NULL,
        message TEXT NOT NULL,
        source TEXT DEFAULT 'crm-site-contact-form',
        status TEXT DEFAULT 'new',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        data_json TEXT NOT NULL
      )
    `);

    const contactPayload = {
      id,
      name: trimmedName,
      email: cleanEmail,
      phone: cleanPhone,
      subject: cleanSubject,
      message: cleanMessage,
      source: 'crm-site-contact-form',
      status: 'new',
      createdAt: now,
      updatedAt: now,
    };

    // 2. Insert into crm_site_contacts_sql
    await bunnyExecute({
      sql: `
        INSERT INTO crm_site_contacts_sql (
          id, name, email, phone, subject, message, source, status, created_at, updated_at, data_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      args: [
        id,
        trimmedName,
        cleanEmail,
        cleanPhone,
        cleanSubject,
        cleanMessage,
        'crm-site-contact-form',
        'new',
        now,
        now,
        JSON.stringify(contactPayload),
      ],
    });

    // 3. Seamlessly sync to leads_sql so Super Admin sees it in CRM Leads dashboard
    try {
      const leadPayload = {
        _id: id,
        name: trimmedName,
        email: cleanEmail,
        phoneNumber: cleanPhone,
        source: 'crm_website_contact',
        status: 'new',
        notes: `Subject: ${cleanSubject}\nMessage: ${cleanMessage}`,
        tags: ['crm-site', 'contact-inquiry', cleanSubject],
        createdByUserId: 'mohan@swaryoga.com',
        ownerUserId: 'mohan@swaryoga.com',
        createdAt: now,
        updatedAt: now,
      };

      await bunnyExecute({
        sql: `
          INSERT INTO leads_sql (document_id, lead_key, owner_user_id, lead_number, data_json, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(document_id) DO UPDATE SET data_json=excluded.data_json, updated_at=excluded.updated_at
        `,
        args: [
          id,
          `inquiry#${cleanEmail}#${Date.now()}`,
          'mohan@swaryoga.com',
          cleanPhone || cleanEmail,
          JSON.stringify(leadPayload),
          now,
          now,
        ],
      });
    } catch (leadSyncErr) {
      console.warn('[CRM Site Contact] Lead sync warning (non-fatal):', leadSyncErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Message received and stored in Bunny Database.',
      id,
    });
  } catch (err: any) {
    console.error('CRM Site Contact Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to submit contact form. Please try again.' },
      { status: 500 }
    );
  }
}
