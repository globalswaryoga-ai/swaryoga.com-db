import { NextRequest, NextResponse } from 'next/server';
import { getUserByEmail } from '@/lib/repositories/userRepository';
import { loadBunnyLeads } from '@/lib/bunnyLeadsRepository';

export const dynamic = 'force-dynamic';

const cleanEmail = (value: unknown) => String(value ?? '').trim().toLowerCase();

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

    const [user, leads] = await Promise.all([
      getUserByEmail(email),
      loadBunnyLeads(),
    ]);
    const lead = leads.filter(candidate => String(candidate.email || '').trim().toLowerCase() === email)
      .sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')))[0];

    if (!user && !lead) {
      return NextResponse.json({ found: false });
    }

    const metadata = lead?.metadata && typeof lead.metadata === 'object' ? lead.metadata : {};
    const source = { ...(lead || {}), ...metadata } as Record<string, any>;

    return NextResponse.json({
      found: true,
      user: {
        profileId: lead?.leadNumber || '',
        leadNumber: lead?.leadNumber || '',
        name: source.name || user?.name || '',
        email: source.email || user?.email || email,
        phone: user?.phone || lead?.phoneNumber || '',
        countryCode: source.countryCode || '+91',
        country: source.country || 'India',
        state: source.state || '',
        gender: source.gender || '',
        age: source.age ?? '',
        profession: source.profession || '',
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
