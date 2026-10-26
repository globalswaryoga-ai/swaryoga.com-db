import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, phone, category = 'General', preferredTime = 'Anytime', note = '', communityId = 'global' } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }

    const cleanPhone = phone.trim().replace(/\s+/g, '');
    const cleanName = name.trim();
    const cleanCategory = String(category || 'General').trim();
    const cleanTime = String(preferredTime || 'Anytime').trim();
    const cleanNote = String(note || '').trim();
    const nowIso = new Date().toISOString();
    const requestId = `call_${Date.now()}_${randomUUID().slice(0, 8)}`;

    // Ensure community_call_requests table exists
    await bunnyExecute(`
      CREATE TABLE IF NOT EXISTS community_call_requests (
        id TEXT PRIMARY KEY,
        name TEXT,
        phone TEXT,
        category TEXT,
        preferred_time TEXT,
        note TEXT,
        community_id TEXT,
        status TEXT DEFAULT 'pending',
        created_at TEXT,
        data_json TEXT
      )
    `);

    const recordData = {
      id: requestId,
      name: cleanName,
      phone: cleanPhone,
      category: cleanCategory,
      preferredTime: cleanTime,
      note: cleanNote,
      communityId,
      source: 'community_call_request',
      status: 'pending',
      createdAt: nowIso,
    };

    // Insert into community_call_requests table
    await bunnyExecute({
      sql: `INSERT INTO community_call_requests (id, name, phone, category, preferred_time, note, community_id, status, created_at, data_json)
            VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
      args: [
        requestId,
        cleanName,
        cleanPhone,
        cleanCategory,
        cleanTime,
        cleanNote,
        communityId,
        nowIso,
        JSON.stringify(recordData),
      ],
    });

    // Also register in leads_sql for CRM visibility
    try {
      const leadId = `lead_call_${requestId}`;
      const leadData = {
        _id: leadId,
        name: cleanName,
        phoneNumber: cleanPhone,
        source: 'Community Call Request',
        status: 'lead',
        workshopName: communityId,
        labels: ['Call Request', cleanCategory],
        notes: `Call Request for ${cleanCategory}. Preferred Time: ${cleanTime}. Note: ${cleanNote}`,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      await bunnyExecute({
        sql: `INSERT OR REPLACE INTO leads_sql (document_id, data_json, created_at, updated_at) VALUES (?, ?, ?, ?)`,
        args: [leadId, JSON.stringify(leadData), nowIso, nowIso],
      });
    } catch (crmErr) {
      console.warn('Non-fatal CRM sync error for call request:', crmErr);
    }

    return NextResponse.json({
      success: true,
      message: 'Call request submitted successfully! We will connect with you soon.',
      requestId,
    });
  } catch (error: any) {
    console.error('Call request error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to submit call request' },
      { status: 500 }
    );
  }
}
