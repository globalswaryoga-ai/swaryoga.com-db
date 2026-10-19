import { NextRequest, NextResponse } from 'next/server';
import crypto from 'node:crypto';
import { getCourseBySlug, getCourseById, saveEnrollment, registerDevice } from '@/lib/bunnyCourseRepository';
import { saveBunnyLead } from '@/lib/bunnyLeadsRepository';
import { updateVisitorLeadInfo, recordVisitor } from '@/lib/bunnyVisitorRepository';

export const dynamic = 'force-dynamic';

function parseDeviceDetails(userAgent: string) {
  let deviceName = 'Web Browser';
  let deviceType = 'desktop';
  let browser = 'Web Browser';
  let os = 'Unknown OS';

  if (!userAgent) return { deviceName, deviceType, browser, os };

  if (/iPhone/i.test(userAgent)) {
    deviceName = 'Apple iPhone';
    deviceType = 'mobile';
    os = 'iOS';
  } else if (/iPad/i.test(userAgent)) {
    deviceName = 'Apple iPad';
    deviceType = 'tablet';
    os = 'iPadOS';
  } else if (/Android.*Mobile|Mobile/i.test(userAgent)) {
    deviceName = 'Android Mobile';
    deviceType = 'mobile';
    os = 'Android';
  } else if (/Android/i.test(userAgent)) {
    deviceName = 'Android Tablet';
    deviceType = 'tablet';
    os = 'Android';
  } else if (/Macintosh|Mac OS X/i.test(userAgent)) {
    deviceName = 'MacBook / Mac OS';
    deviceType = 'desktop';
    os = 'macOS';
  } else if (/Windows NT 10.0/i.test(userAgent)) {
    deviceName = 'Windows 10/11 PC';
    deviceType = 'desktop';
    os = 'Windows 10/11';
  } else if (/Windows/i.test(userAgent)) {
    deviceName = 'Windows PC';
    deviceType = 'desktop';
    os = 'Windows';
  } else if (/Linux/i.test(userAgent)) {
    deviceName = 'Linux PC';
    deviceType = 'desktop';
    os = 'Linux';
  }

  if (/Edg\//i.test(userAgent)) browser = 'Microsoft Edge';
  else if (/Chrome\//i.test(userAgent)) browser = 'Google Chrome';
  else if (/Safari\//i.test(userAgent)) browser = 'Apple Safari';
  else if (/Firefox\//i.test(userAgent)) browser = 'Mozilla Firefox';

  return { deviceName, deviceType, browser, os };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      country,
      state,
      city,
      gender,
      courseId,
      slug,
      sessionId,
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }
    if (!email?.trim() || !email.includes('@')) {
      return NextResponse.json({ error: 'A valid email is required' }, { status: 400 });
    }
    if (!phone?.trim() || phone.replace(/\D/g, '').length < 7) {
      return NextResponse.json({ error: 'A valid WhatsApp number is required' }, { status: 400 });
    }
    if (!country?.trim()) {
      return NextResponse.json({ error: 'Country is required' }, { status: 400 });
    }
    if (!state?.trim()) {
      return NextResponse.json({ error: 'State is required' }, { status: 400 });
    }
    if (!city?.trim()) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 });
    }
    if (!gender?.trim()) {
      return NextResponse.json({ error: 'Gender is required' }, { status: 400 });
    }

    // Resolve course
    let course: any = null;
    if (courseId) {
      course = await getCourseById(courseId);
    }
    if (!course && slug) {
      course = await getCourseBySlug(slug);
    }
    if (!course) {
      course = await getCourseBySlug('why-swaryoga');
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanPhone = phone.trim();
    const cleanName = name.trim();
    const cleanGender = gender.trim();
    const cleanCountry = country.trim();
    const cleanState = state.trim();
    const cleanCity = city.trim();

    // 1. Save / update CRM Lead
    const leadDocId = crypto.createHash('md5').update(`${cleanEmail}_${cleanPhone}`).digest('hex');
    let savedLead: any = null;
    try {
      savedLead = await saveBunnyLead(
        {
          _id: leadDocId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          phoneNumber: cleanPhone,
          whatsappNumber: cleanPhone,
          country: cleanCountry,
          state: cleanState,
          city: cleanCity,
          gender: cleanGender,
          source: `E-Learning: ${course?.title || slug || 'why-swaryoga'}`,
          stage: 'lead',
          tags: ['e-learning-lead', course?.slug || 'why-swaryoga', 'all-videos-unlocked'],
          notes: `Registered from e-learning video gate to unlock all course videos. Location: ${cleanCity}, ${cleanState}, ${cleanCountry}. Gender: ${cleanGender}.`,
          unlockedCourseId: course?.id,
          unlockedCourseSlug: course?.slug,
          unlockedAt: new Date().toISOString(),
        },
        leadDocId
      );
    } catch (leadErr) {
      console.warn('[E-Learning Unlock] Error saving CRM lead:', leadErr);
    }

    // 2. Link visitor session with lead info in website_visitors_sql
    if (sessionId) {
      try {
        await updateVisitorLeadInfo({
          sessionId,
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          country: cleanCountry,
          state: cleanState,
          city: cleanCity,
          gender: cleanGender,
        });
      } catch (visitorErr) {
        console.warn('[E-Learning Unlock] Error updating visitor info:', visitorErr);
      }
    } else {
      // Record a new visitor event for this lead submission
      try {
        const ip =
          request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
          request.headers.get('x-real-ip') ||
          '';
        await recordVisitor({
          pageUrl: `/e-learning/${course?.slug || 'why-swaryoga'}/videos`,
          ip,
          userAgent: request.headers.get('user-agent') || '',
          country: cleanCountry,
          state: cleanState,
          city: cleanCity,
          visitorName: cleanName,
          visitorEmail: cleanEmail,
          visitorPhone: cleanPhone,
          visitorGender: cleanGender,
          source: 'e-learning-form',
        });
      } catch (vErr) {
        // ignore
      }
    }

    // 3. Save course enrollment and register device
    const clientIp =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      '';
    const userAgent = request.headers.get('user-agent') || '';
    const parsedDevice = parseDeviceDetails(userAgent);
    const deviceFingerprint = crypto
      .createHash('sha256')
      .update([cleanEmail, userAgent, clientIp].join('|'))
      .digest('hex');

    if (course) {
      try {
        const enrollId = `${cleanEmail}_${course.id}`;
        await saveEnrollment({
          id: enrollId,
          userId: cleanEmail,
          courseId: course.id,
          status: 'active',
          data: {
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            country: cleanCountry,
            state: cleanState,
            city: cleanCity,
            gender: cleanGender,
            ipAddress: clientIp,
            userAgent,
            deviceName: parsedDevice.deviceName,
            unlockedAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        });

        // Register student device
        await registerDevice({
          userId: cleanEmail,
          courseId: course.id,
          deviceFingerprint,
          deviceName: parsedDevice.deviceName,
          deviceType: parsedDevice.deviceType,
          browser: parsedDevice.browser,
          os: parsedDevice.os,
          ip: clientIp,
        });
      } catch (enrollErr) {
        console.warn('[E-Learning Unlock] Error saving enrollment/device:', enrollErr);
      }
    }

    // Generate lightweight unlock token
    const unlockPayload = {
      email: cleanEmail,
      name: cleanName,
      phone: cleanPhone,
      country: cleanCountry,
      state: cleanState,
      city: cleanCity,
      gender: cleanGender,
      courseId: course?.id,
      unlockedAt: Date.now(),
    };

    return NextResponse.json({
      success: true,
      message: 'All videos unlocked successfully!',
      unlockToken: Buffer.from(JSON.stringify(unlockPayload)).toString('base64'),
      user: {
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        country: cleanCountry,
        state: cleanState,
        city: cleanCity,
        gender: cleanGender,
      },
    });
  } catch (error: any) {
    console.error('[E-Learning Unlock API Error]:', error);
    return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
  }
}
