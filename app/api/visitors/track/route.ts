import { NextRequest, NextResponse } from 'next/server';
import { recordVisitor } from '@/lib/bunnyVisitorRepository';

export const dynamic = 'force-dynamic';

function detectDevice(userAgent: string): 'mobile' | 'desktop' | 'tablet' {
  const ua = userAgent.toLowerCase();
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tablet';
  }
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(ua)) {
    return 'mobile';
  }
  return 'desktop';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));

    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      '';

    const userAgent = request.headers.get('user-agent') || '';
    const deviceType = body.deviceType || detectDevice(userAgent);

    const country =
      body.country ||
      request.headers.get('x-vercel-ip-country') ||
      '';

    const state =
      body.state ||
      request.headers.get('x-vercel-ip-country-region') ||
      '';

    const city =
      body.city ||
      request.headers.get('x-vercel-ip-city') ||
      '';

    const visitor = await recordVisitor({
      sessionId: body.sessionId,
      ip,
      pageUrl: body.pageUrl || request.headers.get('referer') || '/',
      referrer: body.referrer || '',
      userAgent,
      deviceType,
      country,
      state,
      city,
      visitorName: body.visitorName,
      visitorEmail: body.visitorEmail,
      visitorPhone: body.visitorPhone,
      visitorGender: body.visitorGender,
      source: body.source || 'website',
      data: body.data || {},
    });

    return NextResponse.json({
      success: true,
      sessionId: visitor.sessionId,
      visitorId: visitor.id,
      detectedLocation: { country, state, city },
    });
  } catch (error: any) {
    console.error('[Track Visitor Error]:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
