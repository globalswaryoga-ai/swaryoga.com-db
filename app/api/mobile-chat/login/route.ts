import { NextResponse } from 'next/server';
import { generateToken } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { userId, password } = await request.json();

    if (userId === '9779006820' && password === 'Raahdaa@drac') {
      // 30 days token
      const token = generateToken({ userId: 'admin', isAdmin: true, role: 'superadmin' }, '30d');
      return NextResponse.json({ success: true, token });
    }

    return NextResponse.json(
      { error: 'Invalid credentials', success: false },
      { status: 401 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error', success: false },
      { status: 500 }
    );
  }
}
