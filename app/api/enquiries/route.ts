import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { connectDB } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { normalizePhone } from '@/lib/whatsapp';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

export const dynamic = 'force-dynamic';


// Path to store enquiries as JSON file (same as admin enquiries)
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
    console.error('Error saving enquiries:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workshopId, workshopName, mode, language, month, name, mobile, email, gender, city } = body;

    // Validation
    if (!workshopId || !workshopName || !name || !mobile || !email || !gender || !city) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get existing enquiries
    const enquiries = getEnquiries();

    // Create new enquiry
    const newEnquiry = {
      id: `ENQ-${Date.now()}`,
      workshopId,
      workshopName,
      mode,
      language,
      month,
      name: name.trim(),
      mobile: mobile.trim(),
      email: email.trim(),
      gender,
      city: city.trim(),
      status: 'new',
      submittedAt: new Date().toISOString(),
    };

    enquiries.push(newEnquiry);
    saveEnquiries(enquiries);

    // Also create/update CRM Lead so enquiries appear under Leads for unknown users
    let leadNumber: string | null = null;
    try {
      await connectDB();
      const Lead = getLead();
      const cleanedPhone = normalizePhone(mobile);
      const cleanedEmail = String(email || '').trim().toLowerCase();
      const cleanedName = String(name || '').trim();

      if (cleanedPhone) {
        // Check for existing lead by phone or email
        const searchQuery: any[] = [{ phoneNumber: cleanedPhone }];
        if (cleanedEmail) searchQuery.push({ email: cleanedEmail });

        const existingLead = await Lead.findOne({ $or: searchQuery });

        if (existingLead) {
          // Update existing lead with enquiry info
          if (!existingLead.leadNumber) {
            const { leadNumber: num } = await allocateNextLeadNumber();
            existingLead.leadNumber = num;
          }
          // Merge missing fields
          if (cleanedName && !existingLead.name) existingLead.name = cleanedName;
          if (cleanedEmail && !existingLead.email) existingLead.email = cleanedEmail;
          existingLead.labels = Array.from(new Set([
            ...(existingLead.labels || []),
            'enquiry',
            'website-form',
            workshopName || 'general',
          ]));
          existingLead.metadata = {
            ...(existingLead.metadata || {}),
            lastEnquiry: {
              workshopId,
              workshopName,
              mode,
              language,
              month,
              gender,
              city: city?.trim(),
              submittedAt: new Date(),
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
            email: cleanedEmail,
            phoneNumber: cleanedPhone,
            status: 'lead',
            source: 'website',
            workshopName: workshopName || 'Enquiry Form',
            labels: ['enquiry', 'website-form', workshopName || 'general'],
            createdByUserId: 'system',
            assignedToUserId: 'system',
            metadata: {
              formType: 'enquiry',
              workshopId,
              workshopName,
              mode,
              language,
              month,
              gender,
              city: city?.trim(),
              submittedAt: new Date(),
            },
          });
          await addLeadToMainBroadcastList(newLead);
          leadNumber = allocatedLeadNumber;
          console.log(`✅ New CRM lead created from enquiry: ${allocatedLeadNumber}`);
        }
      }
    } catch (leadError) {
      // Non-fatal: enquiry should still succeed even if CRM write fails
      console.error('❌ CRM lead creation from enquiry failed:', leadError);
    }

    return NextResponse.json(
      { success: true, data: { ...newEnquiry, leadNumber } },
      { status: 201 }
    );
  } catch (error) {
    console.error('Enquiry submission error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to submit inquiry' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const enquiries = getEnquiries();

    // Support filtering by workshop
    const url = new URL(request.url);
    const workshopId = url.searchParams.get('workshopId');

    let filteredEnquiries = enquiries;
    if (workshopId) {
      filteredEnquiries = enquiries.filter((e: any) => e.workshopId === workshopId);
    }

    return NextResponse.json({ success: true, data: filteredEnquiries }, { status: 200 });
  } catch (error) {
    console.error('Enquiry fetch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch inquiries' },
      { status: 500 }
    );
  }
}
