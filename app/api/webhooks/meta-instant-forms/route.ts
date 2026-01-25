/**
 * Meta Instant Forms Webhook Handler
 * Receives form submissions from Facebook/Instagram ads
 * Automatically creates leads in CRM linked to the workshop
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { MongoClient } from 'mongodb';

// Verify webhook signature from Meta
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  const crypto = require('crypto');
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return signature === expectedSignature;
}

// Parse Meta form data and create CRM lead
async function createLeadFromMetaForm(formData: any) {
  const db = await connectDB();
  const crmDb = db.getDb(process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm');

  // Extract form fields
  const {
    first_name,
    last_name,
    email,
    phone_number,
    workshop_id, // Custom field: workshop ID from ad
    workshop_name, // Custom field: workshop name from ad
    source_campaign, // Campaign name for tracking
    source_ad_set, // Ad set name
    timestamp,
  } = formData;

  // Create lead object
  const lead = {
    phone: phone_number ? phone_number.replace(/\D/g, '') : '', // Normalize phone
    name: `${first_name || ''} ${last_name || ''}`.trim(),
    email: email || '',
    source: 'meta_instant_form',
    status: 'new',
    workshopId: workshop_id || null,
    workshopName: workshop_name || 'Unknown Workshop',
    campaignName: source_campaign || 'Direct',
    adSet: source_ad_set || '',
    formSource: 'facebook_instagram_ads',
    createdAt: new Date(timestamp || Date.now()),
    notes: `Lead from Meta Instant Form - Campaign: ${source_campaign}, Ad Set: ${source_ad_set}`,
    tags: ['meta_instant_form', 'facebook_ads', workshop_id ? `workshop_${workshop_id}` : ''].filter(Boolean),
  };

  // Create lead in CRM
  try {
    const leadsCollection = crmDb.collection('leads');
    const result = await leadsCollection.insertOne(lead);

    console.log(`✅ Lead created: ${result.insertedId}`);

    return {
      success: true,
      leadId: result.insertedId,
      workshopId: workshop_id,
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

    // Verify webhook authenticity from Meta
    const secret = process.env.META_WEBHOOK_SECRET || process.env.META_APP_SECRET || '';
    
    if (!verifyWebhookSignature(body, signature.replace('sha256=', ''), secret)) {
      console.warn('⚠️ Invalid webhook signature - but processing anyway (SKIP_WEBHOOK_SIGNATURE=true)');
      // For development, allow it. In production, reject unsigned requests.
      if (!process.env.SKIP_WEBHOOK_SIGNATURE) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const data = JSON.parse(body);
    console.log('📝 Meta Instant Form webhook received:', JSON.stringify(data, null, 2));

    // Handle different webhook event types
    if (data.object === 'lead_form') {
      // Process the form submission
      for (const entry of data.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen_conditional_questions_responses') {
            const leadId = change.value.lead_id;
            const formResponses = change.value.response || [];

            // Map form responses to our lead object
            const mappedData = mapMetaFormResponses(formResponses, {
              leadId,
              campaignName: data.campaign_name,
              adId: data.ad_id,
            });

            // Create lead in CRM
            await createLeadFromMetaForm(mappedData);
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

  if (verifyToken === process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge }, { status: 200 });
  }

  return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
}

// Helper: Map Meta form responses to our lead format
function mapMetaFormResponses(
  responses: any[],
  metadata: { leadId?: string; campaignName?: string; adId?: string }
) {
  const mapped: any = {
    timestamp: Date.now(),
    ...metadata,
  };

  for (const response of responses) {
    const question = response.question_text || '';
    const answer = response.response || '';

    // Map common Meta form fields
    if (question.toLowerCase().includes('first name') || response.field_key === 'first_name') {
      mapped.first_name = answer;
    } else if (question.toLowerCase().includes('last name') || response.field_key === 'last_name') {
      mapped.last_name = answer;
    } else if (
      question.toLowerCase().includes('email') ||
      question.toLowerCase().includes('e-mail') ||
      response.field_key === 'email'
    ) {
      mapped.email = answer;
    } else if (
      question.toLowerCase().includes('phone') ||
      question.toLowerCase().includes('mobile') ||
      response.field_key === 'phone_number'
    ) {
      mapped.phone_number = answer;
    } else if (question.toLowerCase().includes('workshop') || response.field_key === 'workshop') {
      mapped.workshop_name = answer;
      // Try to extract workshop ID if it's in format "Workshop Name (ID)"
      const idMatch = answer.match(/\(([a-f0-9]{24})\)/);
      if (idMatch) {
        mapped.workshop_id = idMatch[1];
      }
    } else if (question.toLowerCase().includes('interested') || response.field_key === 'interest') {
      mapped.interest = answer;
    } else if (question.toLowerCase().includes('class') || response.field_key === 'class') {
      mapped.class_preference = answer;
    }
  }

  return mapped;
}
