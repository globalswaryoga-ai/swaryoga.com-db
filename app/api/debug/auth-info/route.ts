import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) return NextResponse.json({ error: 'No token' });

  try {
    const decoded = jwt.decode(token);
    let verified = false;
    try {
      jwt.verify(token, JWT_SECRET);
      verified = true;
    } catch (e) {}

    return NextResponse.json({
      decoded,
      verified,
      secretPrefix: JWT_SECRET.substring(0, 4),
      envKeys: Object.keys(process.env).filter(k => k.includes('JWT') || k.includes('SECRET'))
    });
  } catch (error) {
    return NextResponse.json({ error: 'Decode failed' });
  }
}
