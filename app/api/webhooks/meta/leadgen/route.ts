import { NextResponse } from 'next/server';
import { createHmac } from 'crypto';
import { connectDB } from '@/lib/db';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';

const APP_SECRET = process.env.META_APP_SECRET || '';
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || '';
const GRAPH_API_VERSION = process.env.META_GRAPH_API_VERSION || 'v19.0';
const PAGE_ACCESS_TOKEN = process.env.META_PAGE_ACCESS_TOKEN || '';

/**
 * Verify webhook signature from Meta
 */
function verifySignature(payload: string, signature: string): boolean {
  const hash = createHmac('sha256', APP_SECRET)
    .update(payload)
    .digest('hex');
  return hash === signature;
}

/**
 * Fetch leadgen field details from Graph API
 */
async function fetchLeadgenDetails(leadgenId: string) {
  try {
    const url = `https://graph.instagram.com/${GRAPH_API_VERSION}/${leadgenId}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${PAGE_ACCESS_TOKEN}`,
      },
    });

    if (!response.ok) {
      console.error(`Graph API error: ${response.status}`, await response.text());
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error('Fetch leadgen details error:', error);
    return null;
  }
}

/**
 * Pick field value by field name from leadgen data
 */
function pickFieldValue(fieldData: any[], fieldName: string): string {
  const field = fieldData?.find(f => f.name === fieldName);
  return field?.values?.[0] || '';
}

/**
 * Build lead name from field data
 */
function buildLeadName(fieldData: any[]): string {
  const firstName = pickFieldValue(fieldData, 'first_name');
  const lastName = pickFieldValue(fieldData, 'last_name');
  const fullName = pickFieldValue(fieldData, 'full_name');

  if (fullName) return fullName;
  if (firstName && lastName) return `${firstName} ${lastName}`;
  if (firstName) return firstName;
  return '';
}

/**
 * Upsert lead from Meta leadgen webhook
 */
async function upsertLeadFromMeta(leadgenData: any) {
  try {
    const fieldData = leadgenData.field_data || [];

    const leadgenId = leadgenData.id;
    const metaLeadgenId = `meta_${leadgenId}`;

    // Extract phone and email
    let phone = pickFieldValue(fieldData, 'phone_number') || pickFieldValue(fieldData, 'phone');
    let email = pickFieldValue(fieldData, 'email');
    const name = buildLeadName(fieldData);

    // Normalize phone
    if (phone) {
      phone = normalizePhone(phone);
    }

    // If no phone/email, cannot process
    if (!phone && !email) {
      console.warn('No phone or email in leadgen:', leadgenId);
      return { success: false, error: 'No contact info' };
    }

    // Check for duplicates (by phone, email, or metaLeadgenId)
    const orFilters: Record<string, unknown>[] = [];
    if (phone) orFilters.push({ phoneNumber: phone });
    if (email) orFilters.push({ email });
    orFilters.push({ 'metadata.metaLeadgenId': metaLeadgenId });

    const existingLead = await Lead.findOne({ $or: orFilters });

    if (existingLead) {
      // Update existing lead with Meta metadata
      existingLead.metadata = existingLead.metadata || {};
      existingLead.metadata.metaLeadgenId = metaLeadgenId;
      existingLead.source = 'meta_leadgen';
      await existingLead.save();
      console.log(`Updated existing lead: ${existingLead._id}`);
      return { success: true, leadId: existingLead._id, action: 'updated' };
    }

    // Create new lead
    const leadNumber = await allocateNextLeadNumber();
    const newLead = await Lead.create({
      leadNumber,
      phoneNumber: phone || undefined,
      email: email || undefined,
      name: name || 'Instagram Lead',
      status: 'lead',
      source: 'meta_leadgen',
      metadata: {
        metaLeadgenId,
        rawFieldData: fieldData,
      },
    });

    console.log(`Created new lead: ${newLead._id}`);
    return { success: true, leadId: newLead._id, action: 'created' };
  } catch (error) {
    console.error('Upsert lead error:', error);
    return { success: false, error: String(error) };
  }
}

/**
 * GET: Meta webhook verification handshake
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const challenge = searchParams.get('hub.challenge');
  const token = searchParams.get('hub.verify_token');

  // Verify token
  if (token !== VERIFY_TOKEN) {
    console.warn('Invalid verify token:', token);
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  // Return challenge as plain text (required by Meta)
  return new NextResponse(challenge ?? '', {
    status: 200,
    headers: { 'Content-Type': 'text/plain' },
  });
}

/**
 * POST: Process incoming leadgen webhook
 */
export async function POST(req: Request) {
  try {
    const body = await req.text();
    const signature = req.headers.get('x-hub-signature-256');

    // Verify signature
    if (!signature || !verifySignature(body, signature.replace('sha256=', ''))) {
      console.warn('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    const payload = JSON.parse(body);
    console.log('META WEBHOOK:', JSON.stringify(payload, null, 2));

    // Connect to database
    await connectDB();

    // Process leadgen entries
    if (payload.object === 'page' && payload.entry) {
      for (const entry of payload.entry) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadgenId = change.value.leadgen_id;
            console.log(`Processing leadgen: ${leadgenId}`);

            // Fetch full leadgen details from Graph API
            const leadgenData = await fetchLeadgenDetails(leadgenId);
            if (leadgenData) {
              // Upsert into CRM
              const result = await upsertLeadFromMeta(leadgenData);
              console.log(`Upsert result:`, result);
            } else {
              console.error(`Failed to fetch leadgen details: ${leadgenId}`);
            }
          }
        }
      }
    }

    return NextResponse.json({ status: 'ok' }, { status: 200 });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json(
      { error: 'Processing failed', details: String(error) },
      { status: 500 }
    );
  }
}
