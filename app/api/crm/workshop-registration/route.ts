import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { notifyWorkshopEnrollment } from '@/lib/notifications';

export const dynamic = 'force-dynamic';


/**
 * POST /api/crm/workshop-registration
 * 
 * Saves workshop registration data to CRM (can be used for sales tracking)
 * - Required: workshopSlug, workshopName, firstName, email, phone, city
 * - Optional: lastName, state, country
 * - Auth: Optional (can submit without authentication)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workshopSlug,
      workshopName,
      firstName,
      lastName,
      email,
      phone,
      city,
      state,
      country,
      source,
    } = body;

    // Validate required fields
    if (!workshopSlug || !workshopName || !firstName || !email || !phone || !city) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    await connectDB();

    // Get user ID from token if authenticated
    let userId = 'anonymous';
    const authHeader = request.headers.get('authorization');
    if (authHeader) {
      try {
        const token = authHeader.replace('Bearer ', '');
        const decoded = verifyToken(token) as any;
        userId = decoded.userId || decoded.id || 'anonymous';
      } catch {}
    }

    // Try to use Lead model from CRM database
    try {
      const { Lead } = await import('@/lib/schemas/enterpriseSchemas');

      // Create or update lead record
      const leadData = {
        name: `${firstName} ${lastName || ''}`.trim(),
        email: email,
        phoneNumber: phone.replace(/\D/g, ''),
        city: city,
        state: state || undefined,
        country: country || 'India',
        status: 'lead',
        source: source || 'workshop-registration-url',
        workshopName: workshopName,
        workshopSlug: workshopSlug,
        labels: ['workshop-registration', workshopSlug],
        metadata: {
          registrationSource: 'workshop-registration-url',
          registeredAt: new Date().toISOString(),
          userId: userId,
        },
      };

      // Upsert lead (create if doesn't exist, update if does)
      const lead = await Lead.findOneAndUpdate(
        { email: email },
        {
          $set: leadData,
          $addToSet: {
            labels: { $each: leadData.labels },
          },
        },
        { upsert: true, new: true }
      );

      // Send workshop enrollment email notification
      if (email) {
        notifyWorkshopEnrollment(
          { name: `${firstName} ${lastName || ''}`.trim(), email, phone },
          { workshopName, leadNumber: lead.leadNumber },
        ).catch(err => console.error('[WorkshopReg] Notification error:', err));
      }

      return NextResponse.json({
        success: true,
        message: 'Registration saved successfully',
        leadId: lead._id,
      });
    } catch (crmError) {
      // If CRM fails, still return success (data is in cart)
      console.error('CRM save error:', crmError);
      return NextResponse.json({
        success: true,
        message: 'Registration submitted (CRM save in progress)',
      });
    }
  } catch (error) {
    console.error('Workshop registration error:', error);
    return NextResponse.json(
      { error: 'Failed to process registration' },
      { status: 500 }
    );
  }
}
