import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { listSubmissions, createSubmission } from '@/lib/bunny-forms-db';

export const dynamic = 'force-dynamic';


// Path to store enquiries as JSON file
const enquiriesDir = path.join(process.cwd(), 'data');
const enquiriesFilePath = path.join(enquiriesDir, 'enquiries.json');

// Ensure data directory exists
function ensureDataDirExists() {
  if (!fs.existsSync(enquiriesDir)) {
    fs.mkdirSync(enquiriesDir, { recursive: true });
  }
}

// Get all enquiries
function getEnquiries() {
  try {
    ensureDataDirExists();
    if (!fs.existsSync(enquiriesFilePath)) {
      return [];
    }
    const data = fs.readFileSync(enquiriesFilePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading enquiries:', error);
    return [];
  }
}

// Save enquiries
function saveEnquiries(enquiries: any[]) {
  try {
    ensureDataDirExists();
    fs.writeFileSync(enquiriesFilePath, JSON.stringify(enquiries, null, 2));
  } catch (error) {
    console.error('Error saving enquiries (likely read-only FS):', error);
  }
}

// GET: Fetch all enquiries (SUPERADMIN ONLY)
//
// Sources data from BOTH:
//   1. MongoDB Leads with label 'enquiry' (persistent, survives Vercel deploys)
//   2. Legacy data/enquiries.json (kept for any old local entries)
// MongoDB results take priority; JSON entries are merged in only if the same
// phone number isn't already present from Mongo.
export async function GET(request: NextRequest) {
  try {
    // Verify superadmin access
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.slice('Bearer '.length);
    const decoded = verifyToken(token);

    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    // Only superadmins can see all enquiries
    if (!isSuperAdmin(decoded)) {
      return NextResponse.json(
        { error: 'Access denied: Superadmin access required for enquiries' },
        { status: 403 }
      );
    }

    const url = new URL(request.url);
    const workshopId = url.searchParams.get('workshopId');

    // ── Primary source: MongoDB Leads labelled as enquiry ──
    let mongoEnquiries: any[] = [];
    try {
      await connectDB();
      const Lead = getLead();
      const query: any = { labels: 'enquiry' };
      const leads = await Lead.find(query).sort({ createdAt: -1 }).limit(2000).lean();
      mongoEnquiries = (leads as any[]).map((l: any) => {
        const meta = l.metadata?.lastEnquiry || l.metadata || {};
        const payment = l.metadata?.payment;
        return {
          id: l.leadNumber || String(l._id),
          leadId: String(l._id),
          leadNumber: l.leadNumber,
          workshopId: meta.workshopId || '',
          workshopName: meta.workshopName || l.workshopName || 'Enquiry',
          name: l.name || 'Unknown',
          mobile: l.phoneNumber || '',
          email: l.email || meta.email || '',
          gender: meta.gender || '',
          city: meta.city || '',
          country: meta.country || '',
          mode: meta.mode || '',
          language: meta.language || '',
          month: meta.month || '',
          submittedAt: (meta.submittedAt || l.createdAt || new Date()).toString(),
          status: ['registered', 'enrolled', 'completed', 'customer'].includes(l.status) ? 'registered'
            : l.status === 'contacted' ? 'contacted'
            : 'new',
          notes: l.notes || '',
          labels: l.labels || [],
          timeSlot: meta.timeSlot || null,
          dynamicAnswers: meta.dynamicAnswers || {},
          // Include 'pending' (Pay Later link sent, not yet paid) too — not just
          // 'paid' — so the admin can see amount due, not just amount received.
          payment: payment
            ? {
                status: payment.status || ((l.labels || []).includes('paid') ? 'paid' : 'pending'),
                amount: payment.amount,
                currency: payment.currency || 'INR',
                paidAt: payment.paidAt || null,
              }
            : null,
        };
      });
      if (workshopId) {
        mongoEnquiries = mongoEnquiries.filter(e => e.workshopId === workshopId);
      }
    } catch (mongoErr) {
      console.error('[enquiries GET] Mongo read failed (will fall back to JSON only):', mongoErr);
    }

    // ── BunnyDB source: form_submissions ──
    let bunnyEnquiries: any[] = [];
    try {
      const bSubs = await listSubmissions(workshopId || undefined);
      bunnyEnquiries = bSubs.map(s => ({
        id: s.id,
        workshopId: s.formId,
        workshopName: s.formId,
        name: s.name,
        mobile: s.mobile,
        email: s.email,
        gender: s.gender,
        city: s.city,
        submittedAt: s.submittedAt,
        dynamicAnswers: s.dynamicAnswers,
        status: 'new',
        payment: {
          status: s.paymentStatus,
          amount: s.amount,
          currency: s.currency,
        }
      }));
    } catch (bErr) {
      console.error('[enquiries GET] BunnyDB read failed:', bErr);
    }

    // ── Legacy JSON file: merge in any rows whose phone isn't already in Mongo/Bunny ──
    const jsonEnquiries = getEnquiries();
    const existingIds = new Set([...mongoEnquiries, ...bunnyEnquiries].map(e => e.id));
    const extras = (jsonEnquiries as any[])
      .filter((e: any) => !existingIds.has(e.id))
      .filter((e: any) => !workshopId || e.workshopId === workshopId);

    const merged = [...bunnyEnquiries, ...mongoEnquiries, ...extras];

    return NextResponse.json(
      {
        message: 'Enquiries retrieved successfully',
        data: merged,
        count: merged.length,
        sources: { bunny: bunnyEnquiries.length, mongo: mongoEnquiries.length, json: extras.length },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching enquiries:', error);
    return NextResponse.json(
      { message: 'Failed to fetch enquiries', error: String(error) },
      { status: 500 }
    );
  }
}

// POST: Add new enquiry
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validation
    if (!body.name || !body.mobile || !body.gender || !body.country || !body.workshopId) {
      return NextResponse.json(
        { message: 'Missing required fields: name, mobile, gender, country, workshopId' },
        { status: 400 }
      );
    }

    // Removed JSON file usage entirely
    const newEnquiryId = `ENQ-${Date.now()}`;
    const timestamp = body.submittedAt || new Date().toISOString();

    // Save to BunnyDB form_submissions
    let submissionId = newEnquiryId;
    let paymentSessionId = undefined;
    let cashfreeOrderId = undefined;
    
    try {
      submissionId = await createSubmission({
        formId: body.workshopId,
        name: body.name,
        mobile: body.mobile,
        email: body.email || '',
        gender: body.gender,
        city: body.country || body.city || '', // Map country to city column for backwards compat
        dynamicAnswers: body.dynamicAnswers || {},
        paymentStatus: 'pending',
        amount: body.amount || 0,
        currency: body.currency || 'INR',
      });
      
      // Auto-add to workshop cohorts as student
      const { upsertStudent } = await import('@/lib/workshopBunnyRepository');
      await upsertStudent({
        cohortId: body.workshopId,
        name: body.name,
        phone: body.mobile,
        email: body.email || '',
        source: 'enquiry_form',
      });
      
      // Cashfree integration
      if (body.amount > 0) {
        const { cashfreeCreateOrder, getCashfreeReturnUrl, getCashfreeWebhookUrl } = await import('@/lib/payments/cashfree');
        cashfreeOrderId = `FORM-${submissionId}-${Date.now()}`;
        
        const cfUrl = new URL(request.url);
        const baseUrl = `${cfUrl.protocol}//${cfUrl.host}`;
        
        const cf = await cashfreeCreateOrder({
          order_id: cashfreeOrderId,
          order_amount: Number(body.amount),
          order_currency: body.currency || 'INR',
          customer_details: {
            customer_id: `cust_${submissionId}`,
            customer_name: body.name.trim(),
            customer_email: body.email || 'guest@example.com',
            customer_phone: String(body.mobile).replace(/[^0-9]/g, '').slice(-10),
          },
          order_note: body.workshopName || 'Form Payment',
          order_meta: {
            return_url: `${baseUrl}/api/payments/cashfree/return?order_id={order_id}`,
            notify_url: `${baseUrl}/api/payments/cashfree/webhook`,
          },
        });
        
        paymentSessionId = cf.payment_session_id;
        
        // Save the cashfreeOrderId to the submission metadata/DB if needed
        // For now, it will be in the Orders collection or handled by webhook
      }
    } catch (bErr) {
      console.error('[enquiries POST] BunnyDB/Cashfree failed:', bErr);
    }

    // Also create/update CRM Lead so enquiries appear under Leads for unknown users
    let leadNumber: string | null = null;
    try {
      await connectDB();
      const Lead = getLead();
      const cleanedPhone = normalizePhone(body.mobile);
      const cleanedName = String(body.name || '').trim();

      if (cleanedPhone) {
        const existingLead = await Lead.findOne({ phoneNumber: cleanedPhone });

        if (existingLead) {
          // Update existing lead with enquiry info
          if (!existingLead.leadNumber) {
            const { leadNumber: num } = await allocateNextLeadNumber();
            existingLead.leadNumber = num;
          }
          if (cleanedName && !existingLead.name) existingLead.name = cleanedName;
          existingLead.labels = Array.from(new Set([
            ...(existingLead.labels || []),
            'enquiry',
            'admin-form',
            body.workshopName || 'general',
          ]));
          existingLead.metadata = {
            ...(existingLead.metadata || {}),
            lastEnquiry: {
              workshopId: body.workshopId,
              workshopName: body.workshopName,
              gender: body.gender,
              city: body.country || body.city || '',
              submittedAt: new Date(),
              dynamicAnswers: body.dynamicAnswers || {},
            },
          };
          await existingLead.save();
          await addLeadToMainBroadcastList(existingLead);
          leadNumber = existingLead.leadNumber;
        } else {
          // Create new lead for unknown user
          const { leadNumber: allocatedLeadNumber } = await allocateNextLeadNumber();
          const newLead = await Lead.create({
            leadNumber: allocatedLeadNumber,
            name: cleanedName || 'Unknown User',
            phoneNumber: cleanedPhone,
            status: 'lead',
            source: 'website',
            workshopName: body.workshopName || 'Enquiry Form',
            labels: ['enquiry', 'admin-form', body.workshopName || 'general'],
            createdByUserId: 'system',
            assignedToUserId: 'system',
            metadata: {
              formType: 'admin-enquiry',
              workshopId: body.workshopId,
              workshopName: body.workshopName,
              gender: body.gender,
              city: body.city,
              submittedAt: new Date(),
              dynamicAnswers: body.dynamicAnswers || {},
            },
          });
          await addLeadToMainBroadcastList(newLead);
          leadNumber = allocatedLeadNumber;
          console.log(`✅ New CRM lead created from admin enquiry: ${allocatedLeadNumber}`);
        }
      }
    } catch (leadError) {
      // Non-fatal: enquiry should still succeed even if CRM write fails
      console.error('❌ CRM lead creation from admin enquiry failed:', leadError);
    }
    
    // Send email with unique reference code
    const uniqueId = leadNumber || submissionId;
    if (body.email && body.email.trim() !== '') {
      try {
        const { sendEmail, wrapInEmailTemplate } = await import('@/lib/email');
        const emailContent = `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2>Thank You for Reaching Out!</h2>
            <p>Hi ${body.name || 'there'},</p>
            <p>Your form submission for <strong>${body.workshopName || 'Swar Yoga'}</strong> has been received successfully.</p>
            <p>Your unique reference code is: <strong style="font-size: 1.2em; color: #2d6a4f;">${uniqueId}</strong></p>
            <p>If you have any further questions or if you want to update your submission later, you can use this reference code or your email/mobile number.</p>
            <p>Warm regards,<br/>The Swar Yoga Team</p>
          </div>
        `;
        await sendEmail({
          to: body.email,
          subject: 'Form Submission Confirmation - Swar Yoga',
          html: wrapInEmailTemplate(emailContent, 'Submission Confirmation')
        });
      } catch (emailErr) {
        console.error('❌ Failed to send confirmation email:', emailErr);
      }
    }

    return NextResponse.json(
      {
        message: 'Enquiry submitted successfully',
        data: { id: submissionId, leadNumber: uniqueId },
        paymentSessionId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating enquiry:', error);
    return NextResponse.json(
      { message: 'Failed to create enquiry', error: String(error) },
      { status: 500 }
    );
  }
}

// DELETE: Delete an enquiry (for admin use)
export async function DELETE(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const enquiryId = url.searchParams.get('id');

    if (!enquiryId) {
      return NextResponse.json(
        { message: 'Enquiry ID is required' },
        { status: 400 }
      );
    }

    // Get existing enquiries
    const enquiries = getEnquiries();

    // Filter out the enquiry to delete
    const filteredEnquiries = enquiries.filter((e: any) => e.id !== enquiryId);

    if (filteredEnquiries.length === enquiries.length) {
      return NextResponse.json(
        { message: 'Enquiry not found' },
        { status: 404 }
      );
    }

    // Save enquiries
    saveEnquiries(filteredEnquiries);

    return NextResponse.json(
      {
        message: 'Enquiry deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting enquiry:', error);
    return NextResponse.json(
      { message: 'Failed to delete enquiry', error: String(error) },
      { status: 500 }
    );
  }
}

// Map the enquiry status (UI) → the underlying Lead status enum.
const ENQUIRY_TO_LEAD_STATUS: Record<string, string> = {
  new: 'new_lead',
  contacted: 'contacted',
  registered: 'enrolled',
};

// PATCH: Update enquiry status
//
// Enquiries are sourced primarily from MongoDB Leads (label 'enquiry'), where
// the enquiry id is the lead's leadNumber (e.g. "007007"). So the update must
// target the Lead in Mongo — not just the legacy data/enquiries.json file,
// which doesn't contain Mongo-sourced rows (and isn't writable on Vercel).
export async function PATCH(request: NextRequest) {
  try {
    // Superadmin auth (parity with GET — enquiries are superadmin-only).
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const decoded = verifyToken(authHeader.slice('Bearer '.length));
    if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 401 });
    }

    const url = new URL(request.url);
    const enquiryId = url.searchParams.get('id');
    const body = await request.json();

    if (!enquiryId) {
      return NextResponse.json({ message: 'Enquiry ID is required' }, { status: 400 });
    }

    const hasName = typeof body.name === 'string' && body.name.trim() !== '';
    const hasMobile = typeof body.mobile === 'string' && body.mobile.trim() !== '';
    if (!body.status && !hasName && !hasMobile && !body.notes) {
      return NextResponse.json({ message: 'Nothing to update (status, name, mobile or notes required)' }, { status: 400 });
    }

    // ── Primary: update the MongoDB Lead this enquiry was sourced from ──
    try {
      await connectDB();
      const Lead = getLead();
      const or: any[] = [{ leadNumber: enquiryId }];
      if (mongoose.Types.ObjectId.isValid(enquiryId)) or.push({ _id: enquiryId });

      const lead =
        (await Lead.findOne({ $or: or, labels: 'enquiry' })) ||
        (await Lead.findOne({ $or: or }));

      if (lead) {
        if (body.status) lead.status = ENQUIRY_TO_LEAD_STATUS[body.status] || body.status;
        if (hasName) lead.name = body.name.trim();
        if (hasMobile) {
          const cleaned = normalizePhone(body.mobile) || String(body.mobile).trim();
          lead.phoneNumber = cleaned;
        }
        if (body.notes) lead.notes = body.notes;
        await lead.save();
        return NextResponse.json(
          { message: 'Enquiry updated successfully', data: { id: enquiryId, name: lead.name, mobile: lead.phoneNumber, status: body.status } },
          { status: 200 }
        );
      }
    } catch (mongoErr) {
      console.error('[enquiries PATCH] Mongo update failed, falling back to JSON:', mongoErr);
    }

    // ── Fallback: legacy JSON file (old local-only entries) ──
    const enquiries = getEnquiries();
    const enquiry = enquiries.find((e: any) => e.id === enquiryId);
    if (!enquiry) {
      return NextResponse.json({ message: 'Enquiry not found' }, { status: 404 });
    }

    if (body.status) enquiry.status = body.status;
    if (hasName) enquiry.name = body.name.trim();
    if (hasMobile) enquiry.mobile = String(body.mobile).trim();
    if (body.notes) enquiry.notes = body.notes;
    enquiry.updatedAt = new Date().toISOString();
    saveEnquiries(enquiries);

    return NextResponse.json(
      { message: 'Enquiry updated successfully', data: enquiry },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error updating enquiry:', error);
    return NextResponse.json(
      { message: 'Failed to update enquiry', error: String(error) },
      { status: 500 }
    );
  }
}
