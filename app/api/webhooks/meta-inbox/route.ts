import { NextRequest, NextResponse } from 'next/server';
import {
  getMetaInboxVerifyToken,
  ingestMetaSocialEvent,
  parseMetaSocialWebhookPayload,
  verifyMetaInboxSignature,
} from '@/lib/socialInbox';

export const dynamic = 'force-dynamic';
import { logError } from '@/lib/api-error';


export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');
  const expectedToken = getMetaInboxVerifyToken();

  if (mode === 'subscribe' && token === expectedToken && challenge) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { 'Content-Type': 'text/plain' },
    });
  }

  return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get('x-hub-signature-256') || request.headers.get('x-hub-signature');
    if (!verifyMetaInboxSignature(rawBody, signatureHeader)) {
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(rawBody || '{}');
    
    // 1. Process Inbox Messaging Events
    const events = parseMetaSocialWebhookPayload(payload);
    for (const event of events) {
      await ingestMetaSocialEvent(event);
    }

    // 2. Process Leadgen Events (Instant Forms)
    if (payload.object === 'page') {
      for (const entry of payload.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            console.log(`✅ Found leadgen event in inbox webhook! Leadgen ID: ${leadgenId}`);
            try {
              const leadData = await fetchLeadFromMeta(leadgenId);
              await createLeadFromMetaForm(leadData, change.value);
            } catch (err) {
              console.error('❌ Failed to fetch/process lead from Meta in inbox webhook:', err);
            }
          }
        }
      }
    }

    return NextResponse.json({ success: true, processed: events.length }, { status: 200 });
  } catch (error) {
    logError('meta-inbox webhook POST', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Webhook processing failed' },
      { status: 500 }
    );
  }
}

// Fetch lead data from Meta Graph API
async function fetchLeadFromMeta(leadgenId: string) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const apiVersion = process.env.META_GRAPH_API_VERSION || 'v24.0';
  if (!accessToken) throw new Error('META_PAGE_ACCESS_TOKEN is not set');
  const url = `https://graph.facebook.com/${apiVersion}/${leadgenId}?access_token=${accessToken}`;
  const response = await fetch(url);
  const data = await response.json();
  if (!response.ok) throw new Error(`Meta API Error: ${data.error?.message || 'Unknown error'}`);
  return data;
}

// Parse Meta form data and create CRM lead
async function createLeadFromMetaForm(leadData: any, metaContext: any) {
  const fieldData = leadData.field_data || [];
  let firstName = '', lastName = '', email = '', phone = '', workshopName = '', workshopId = '';

  fieldData.forEach((field: any) => {
    const name = field.name.toLowerCase();
    const value = field.values[0] || '';
    if (name.includes('first_name')) firstName = value;
    else if (name.includes('last_name')) lastName = value;
    else if (name.includes('full_name')) {
      const parts = value.split(' ');
      firstName = parts[0];
      lastName = parts.slice(1).join(' ');
    }
    else if (name.includes('email')) email = value;
    else if (name.includes('phone')) phone = value;
    else if (name.includes('workshop')) {
      workshopName = value;
      const idMatch = value.match(/\(([a-f0-9]{24})\)/);
      if (idMatch) workshopId = idMatch[1];
    }
  });

  const lead = {
    phoneNumber: phone ? phone.replace(/\D/g, '') : '',
    name: `${firstName} ${lastName}`.trim(),
    email: email,
    source: 'meta_instant_form',
    status: 'new',
    workshopId: workshopId || null,
    workshopName: workshopName || 'Unknown Workshop',
    campaignName: metaContext.campaign_id || 'Meta Ad',
    adSet: metaContext.adset_id || '',
    formSource: `form_${metaContext.form_id}`,
    createdAt: new Date(leadData.created_time || Date.now()).toISOString(),
    notes: `Lead from Meta Instant Form (Form ID: ${metaContext.form_id}, Ad ID: ${metaContext.ad_id})`,
    labels: ['meta_instant_form', 'facebook_ads', 'enquiry', workshopId ? `workshop_${workshopId}` : ''].filter(Boolean),
    metadata: { leadgen_id: leadData.id, rawFieldData: fieldData },
    createdByUserId: 'system',
  };

  const { saveBunnyLead, getBunnyLeadByPhone } = await import('@/lib/bunnyLeadsRepository');
  let existing = await getBunnyLeadByPhone(lead.phoneNumber, 'system');
  if (existing) {
    await saveBunnyLead({
      ...existing, ...lead,
      labels: Array.from(new Set([...(existing.labels || []), ...(lead.labels || []), 'enquiry'])),
      notes: existing.notes ? existing.notes + '\n' + lead.notes : lead.notes
    }, existing._id || existing.id);
  } else {
    await saveBunnyLead(lead);
  }
}

