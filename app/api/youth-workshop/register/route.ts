import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { Lead } from '@/lib/schemas/enterpriseSchemas';
import { allocateNextLeadNumber } from '@/lib/crm/leadNumber';
import { addLeadToMainBroadcastList } from '@/lib/crm/broadcast-automation';

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

    let leadToUse: any;
    let isExisting = false;

    if (existingLead) {
      // UNIFIED ID: Reuse existing lead - update with youth workshop info
      isExisting = true;
      
      // Ensure leadNumber exists on legacy leads
      if (!existingLead.leadNumber) {
        const { leadNumber } = await allocateNextLeadNumber();
        existingLead.leadNumber = leadNumber;
      }

      // Update existing lead with youth workshop labels
      await Lead.updateOne(
        { _id: existingLead._id },
        {
          $addToSet: { labels: { $each: ['youth-workshop', 'website-form'] } },
          $set: {
            workshopName: existingLead.workshopName || 'Youth Workshop',
            'metadata.youthWorkshop': {
              state: state.trim(),
              registeredAt: new Date(),
            },
          },
        }
      );
      
      // Auto-add to main broadcast list
      await addLeadToMainBroadcastList(existingLead);
      leadToUse = existingLead;
    } else {
      // Allocate next lead number for new lead
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

      // Auto-add to main broadcast list
      await addLeadToMainBroadcastList(newLead);
      leadToUse = newLead;
    }

    console.log(`✓ Youth workshop lead ${isExisting ? 'updated' : 'created'}: ${leadToUse._id}`);

    return NextResponse.json(
      {
        success: true,
        message: isExisting 
          ? 'You are already registered! Your information has been updated.' 
          : 'Registration successful! We will contact you soon.',
        data: {
          leadId: leadToUse._id,
          leadNumber: leadToUse.leadNumber,
          name: leadToUse.name,
          email: leadToUse.email,
          isExisting,
        },
      },
      { status: isExisting ? 200 : 201 }
    );
  } catch (error) {
    console.error('Youth workshop registration error:', error);
    const message = error instanceof Error ? error.message : 'Failed to register';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
