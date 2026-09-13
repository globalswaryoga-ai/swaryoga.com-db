import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getUser } from '@/lib/db';
import { getLead } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';

const cleanEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * GET /api/forms/contact-lookup?email=person@example.com
 * Returns the saved account and latest form submission for email-based editing.
 */
export async function GET(request: NextRequest) {
  try {
    const email = cleanEmail(request.nextUrl.searchParams.get('email'));
    if (!email || !email.includes('@')) {
      return NextResponse.json({ found: false, error: 'Valid email is required' }, { status: 400 });
    }

    await connectDB();

    const emailQuery = { email: { $regex: new RegExp(`^${escapeRegex(email)}$`, 'i') } };
    const User = getUser();
    const Lead = getLead();

    const [user, lead] = await Promise.all([
      User.findOne(emailQuery)
        .select('name email phone countryCode country state gender age profession profileId')
        .lean() as any,
      Lead.findOne(emailQuery)
        .sort({ updatedAt: -1, createdAt: -1 })
        .select('leadNumber name email phoneNumber countryCode country state city metadata updatedAt')
        .lean() as any,
    ]);

    if (!user && !lead) {
      return NextResponse.json({ found: false });
    }

    const metadata = lead?.metadata && typeof lead.metadata === 'object' ? lead.metadata : {};
    const source = { ...(lead || {}), ...metadata } as Record<string, any>;

    return NextResponse.json({
      found: true,
      user: {
        profileId: user?.profileId || '',
        leadNumber: lead?.leadNumber || '',
        name: source.name || user?.name || '',
        email: source.email || user?.email || email,
        phone: user?.phone || lead?.phoneNumber || '',
        countryCode: user?.countryCode || source.countryCode || '+91',
        country: user?.country || source.country || 'India',
        state: user?.state || source.state || '',
        gender: user?.gender || source.gender || '',
        age: user?.age ?? source.age ?? '',
        profession: user?.profession || source.profession || '',
        interest: source.interest || '',
        workshopName: source.workshopName || '',
        workshopLanguage: source.workshopLanguage || '',
        workshopMode: source.workshopMode || '',
        educationStatus: source.educationStatus || '',
        batchPreference: source.batchPreference || '',
        participantStatus: source.participantStatus || '',
        city: source.city || '',
        timeAvailable: source.timeAvailable || '',
        videoOnDuringClass: source.videoOnDuringClass || '',
        regularAttendance: source.regularAttendance || '',
        healthIssues: source.healthIssues || '',
        deviceForWorkshop: source.deviceForWorkshop || '',
        donationReady: source.donationReady || '',
        awarenessConfirmed: Boolean(source.awarenessConfirmed),
        finalConfirmation: Boolean(source.finalConfirmation),
        courseName: source.courseName || '',
        paymentMode: source.paymentMode || '',
        message: source.message || '',
      },
    });
  } catch (error) {
    console.error('[ContactLookup] Error:', error);
    return NextResponse.json({ found: false, error: 'Lookup failed' }, { status: 500 });
  }
}
