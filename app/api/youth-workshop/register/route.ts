import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';

export async function POST(request: NextRequest) {
  try {
    const { name, email, phoneNumber, state } = await request.json();

    // Validation
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email?.trim()) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    if (!phoneNumber?.trim()) {
      return NextResponse.json({ error: 'Phone number is required' }, { status: 400 });
    }
    if (!state?.trim()) {
      return NextResponse.json({ error: 'State is required' }, { status: 400 });
    }

    await connectDB();

    // Check if lead already exists by phone or email
    const existingLead = await Lead.findOne({
      $or: [
        { phoneNumber: phoneNumber.trim() },
        { email: email.trim().toLowerCase() },
      ],
    });

    if (existingLead) {
      return NextResponse.json(
        { error: 'This phone number or email is already registered', data: existingLead },
        { status: 409 }
      );
    }

    // Allocate next lead number
    const { leadNumber } = await allocateNextLeadNumber();

    // Create new lead with youth workshop source
    const newLead = await Lead.create({
      leadNumber,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phoneNumber: phoneNumber.trim(),
      status: 'lead',
      source: 'website', // Youth workshop form
      workshopName: 'Youth Workshop', // ← This is the key field for filtering in CRM
      labels: ['youth-workshop', 'website-form'],
      metadata: {
        state: state.trim(),
        formType: 'youth-workshop',
        submittedAt: new Date(),
      },
    });

    console.log(`✓ Youth workshop lead created: ${newLead._id}`);

    return NextResponse.json(
      {
        success: true,
        message: 'Registration successful! We will contact you soon.',
        data: {
          leadId: newLead._id,
          leadNumber: newLead.leadNumber,
          name: newLead.name,
          email: newLead.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Youth workshop registration error:', error);
    const message = error instanceof Error ? error.message : 'Failed to register';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
