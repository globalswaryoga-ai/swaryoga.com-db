import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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
    console.error('Error saving enquiries:', error);
    throw error;
  }
}

// GET: Fetch all enquiries
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

    return NextResponse.json(
      {
        message: 'Enquiries retrieved successfully',
        data: filteredEnquiries,
        count: filteredEnquiries.length,
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
    if (!body.name || !body.mobile || !body.gender || !body.city || !body.workshopId) {
      return NextResponse.json(
        { message: 'Missing required fields: name, mobile, gender, city, workshopId' },
        { status: 400 }
      );
    }

    // Get existing enquiries
    const enquiries = getEnquiries();

    // Create new enquiry
    const newEnquiry = {
      id: `ENQ-${Date.now()}`,
      workshopId: body.workshopId,
      workshopName: body.workshopName,
      name: body.name,
      mobile: body.mobile,
      gender: body.gender,
      city: body.city,
      submittedAt: body.submittedAt || new Date().toISOString(),
      status: 'new', // new, contacted, registered
    };

    // Add to enquiries
    enquiries.push(newEnquiry);

    // Save enquiries
    saveEnquiries(enquiries);

    return NextResponse.json(
      {
        message: 'Enquiry submitted successfully',
        data: newEnquiry,
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

// PATCH: Update enquiry status
export async function PATCH(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const enquiryId = url.searchParams.get('id');
    const body = await request.json();

    if (!enquiryId) {
      return NextResponse.json(
        { message: 'Enquiry ID is required' },
        { status: 400 }
      );
    }

    if (!body.status) {
      return NextResponse.json(
        { message: 'Status is required' },
        { status: 400 }
      );
    }

    // Get existing enquiries
    const enquiries = getEnquiries();

    // Find and update enquiry
    const enquiry = enquiries.find((e: any) => e.id === enquiryId);
    if (!enquiry) {
      return NextResponse.json(
        { message: 'Enquiry not found' },
        { status: 404 }
      );
    }

    enquiry.status = body.status;
    if (body.notes) {
      enquiry.notes = body.notes;
    }
    enquiry.updatedAt = new Date().toISOString();

    // Save enquiries
    saveEnquiries(enquiries);

    return NextResponse.json(
      {
        message: 'Enquiry updated successfully',
        data: enquiry,
      },
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
