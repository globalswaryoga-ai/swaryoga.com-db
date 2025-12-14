import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get IP from various headers (Vercel sets these)
    const ip = 
      request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
      request.headers.get('x-real-ip') ||
      request.headers.get('x-client-ip') ||
      request.ip ||
      'unknown';

    const headers = {
      'x-forwarded-for': request.headers.get('x-forwarded-for'),
      'x-real-ip': request.headers.get('x-real-ip'),
      'x-client-ip': request.headers.get('x-client-ip'),
      'cf-connecting-ip': request.headers.get('cf-connecting-ip'),
      'user-agent': request.headers.get('user-agent'),
    };

    return NextResponse.json({
      status: 'success',
      message: 'This is your current IP accessing the server',
      ip: ip,
      headers: headers,
      timestamp: new Date().toISOString(),
      instructions: {
        step1: 'Copy the IP address above',
        step2: 'Go to MongoDB Atlas → Network Access',
        step3: 'Click "+ ADD IP ADDRESS"',
        step4: 'Paste the IP with /32 suffix (e.g., 1.2.3.4/32)',
        step5: 'Or use 0.0.0.0/0 to allow all IPs',
        step6: 'Wait 2-3 minutes for changes to take effect'
      }
    });
  } catch (error) {
    return NextResponse.json({
      status: 'error',
      message: String(error)
    }, { status: 500 });
  }
}
