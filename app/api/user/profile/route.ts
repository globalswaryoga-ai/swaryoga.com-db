import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
import { connectDB, User } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';
import { normalizePhone } from '@/lib/whatsapp';

export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token || "");
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Fetch user data
    const user = await User.findById(decoded.userId).select('-password');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Fetch CRM leadNumber (serial 6-digit ID) for this user.
    // This is the canonical human-friendly ID that should match leads/community.
    let leadNumber: string | null = null;
    try {
      const Lead = getLead();
      const phoneNumber = user.phone ? normalizePhone(String(user.phone)) : '';
      const email = user.email ? String(user.email).trim().toLowerCase() : '';

      const lead: any = await Lead.findOne({
        $or: [
          ...(phoneNumber ? [{ phoneNumber }] : []),
          ...(email ? [{ email }] : []),
        ],
      })
        .select({ leadNumber: 1 })
        .lean();

      if (lead?.leadNumber) {
        leadNumber = String(lead.leadNumber);
        
        // Sync leadNumber → profileId on the User so it's always consistent
        if (user.profileId !== leadNumber) {
          await User.findByIdAndUpdate(decoded.userId, { profileId: leadNumber });
          user.profileId = leadNumber;
        }
      }
    } catch (e) {
      // Non-fatal: profile should still load even if CRM is unavailable.
      console.warn('Profile leadNumber lookup failed:', e);
    }

    // Use leadNumber as the display ID; fall back to profileId
    const displayId = leadNumber || user.profileId || null;

    return NextResponse.json({
      id: user._id,
      profileId: displayId,
      leadNumber: displayId,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
      state: user.state,
      gender: user.gender,
      age: user.age,
      profession: user.profession,
      countryCode: user.countryCode,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Profile fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    await connectDB();
    
    // Verify token
    const authHeader = request.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decoded = verifyToken(token || "");
    
    if (!decoded || !decoded.userId) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    
    // Update only allowed fields
    const updateData: any = {};
    
    if (body.profileImage !== undefined) {
      updateData.profileImage = body.profileImage;
    }
    if (body.name) {
      updateData.name = body.name;
    }
    if (body.phone) {
      updateData.phone = body.phone;
    }
    if (body.profession) {
      updateData.profession = body.profession;
    }
    if (body.country) {
      updateData.country = body.country;
    }
    if (body.state) {
      updateData.state = body.state;
    }
    if (body.age !== undefined) {
      updateData.age = body.age;
    }

    updateData.updatedAt = new Date();

    // Update user
    const user = await User.findByIdAndUpdate(
      decoded.userId,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user._id,
      profileId: user.profileId,
      // Keep response shape consistent with GET
      leadNumber: undefined,
      name: user.name,
      email: user.email,
      phone: user.phone,
      country: user.country,
      state: user.state,
      gender: user.gender,
      age: user.age,
      profession: user.profession,
      countryCode: user.countryCode,
      profileImage: user.profileImage,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    });
  } catch (error) {
    console.error('Profile update error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
