/**
 * Meta Instant Forms Webhook Handler
 * Receives form submissions from Facebook/Instagram ads
 * Automatically creates leads in CRM
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// Verify webhook signature from Meta
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  if (!signature) return false;
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expectedSignature;
}

// Fetch lead data from Meta Graph API
async function fetchLeadFromMeta(leadgenId: string) {
  const accessToken = process.env.META_PAGE_ACCESS_TOKEN;
  const apiVersion = process.env.META_GRAPH_API_VERSION || 'v24.0';
  
  if (!accessToken) {
    throw new Error('META_PAGE_ACCESS_TOKEN is not set');
  }

  const url = `https://graph.facebook.com/${apiVersion}/${leadgenId}?access_token=${accessToken}`;
  
  const response = await fetch(url);
  const data = await response.json();
  
  if (!response.ok) {
    throw new Error(`Meta API Error: ${data.error?.message || 'Unknown error'}`);
  }
  
  return data;
}

// Parse Meta form data and create CRM lead
async function createLeadFromMetaForm(leadData: any, metaContext: any) {
  const fieldData = leadData.field_data || [];
  
  let firstName = '';
  let lastName = '';
  let email = '';
  let phone = '';
  let workshopName = '';
  let workshopId = '';

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
      if (idMatch) {
        workshopId = idMatch[1];
      }
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
    metadata: {
      leadgen_id: leadData.id,
      rawFieldData: fieldData,
    },
    createdByUserId: 'system',
  };

  try {
    const { saveBunnyLead, getBunnyLeadByPhone } = await import('@/lib/bunnyLeadsRepository');
    
    let existing = await getBunnyLeadByPhone(lead.phoneNumber, 'system');
    
    let result;
    if (existing) {
      result = await saveBunnyLead({
        ...existing,
        ...lead, 
        labels: Array.from(new Set([...(existing.labels || []), ...(lead.labels || []), 'enquiry'])),
        notes: existing.notes ? existing.notes + '\n' + lead.notes : lead.notes
      }, existing._id || existing.id);
      console.log(`✅ Lead updated: ${result._id}`);
    } else {
      result = await saveBunnyLead(lead);
      console.log(`✅ Lead created: ${result._id}`);
    }

    return {
      success: true,
      leadId: result._id,
    };
  } catch (error) {
    console.error('❌ Error creating lead:', error);
    throw error;
  }
}

// Webhook: POST /api/webhooks/meta-instant-forms
export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-hub-signature-256') || '';
    const secret = process.env.META_APP_SECRET || '';

    if (!verifyWebhookSignature(body, signature.replace('sha256=', ''), secret)) {
      console.warn('⚠️ Invalid webhook signature - but processing anyway (SKIP_WEBHOOK_SIGNATURE=true)');
      if (!process.env.SKIP_WEBHOOK_SIGNATURE) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(body);
    console.log('📝 Meta Webhook received object:', data.object);

    // Meta Lead Ads webhooks have object === 'page'
    if (data.object === 'page') {
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          // Check if this is a lead generation event
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            
            console.log(`✅ Found leadgen event! Leadgen ID: ${leadgenId}`);

            // Fetch the actual lead data from Meta Graph API
            try {
              const leadData = await fetchLeadFromMeta(leadgenId);
              
              // Process and save to CRM
              await createLeadFromMetaForm(leadData, change.value);
            } catch (err) {
              console.error('❌ Failed to fetch or process lead from Meta:', err);
              // Note: We still return 200 to Meta so they don't retry forever and block the webhook
            }
          }
        }
      }
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // Webhook verification challenge from Meta
    if (data.hub_challenge) {
      return NextResponse.json({ hub_challenge: data.hub_challenge }, { status: 200 });
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error('❌ Webhook error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// GET: For Meta webhook verification
export async function GET(req: NextRequest) {
  const verifyToken = req.nextUrl.searchParams.get('hub.verify_token');
  const challenge = req.nextUrl.searchParams.get('hub.challenge');

  if (
    verifyToken === process.env.META_FORMS_WEBHOOK_VERIFY_TOKEN || 
    verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN ||
    verifyToken === 'kalburgifbmessenger'
  ) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse('Invalid token', { status: 403 });
}
