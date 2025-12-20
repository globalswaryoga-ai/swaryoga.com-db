import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

    return NextResponse.json(
      { success: true, data: newEnquiry },
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
