import { NextRequest, NextResponse } from 'next/server';
import { connectDB, getUser } from '@/lib/db';

/**
 * GET /api/forms/user-lookup?userId=xxx
 * Fetch user data by userId/profileId for form auto-fill
 * Accepts: "SWARYOGA-123456" or just "123456"
 */
export async function GET(request: NextRequest) {
  try {
    let userId = request.nextUrl.searchParams.get('userId');
    
    if (!userId || userId.trim().length < 3) {
      return NextResponse.json({ error: 'Invalid user ID' }, { status: 400 });
    }
    
    // Clean up the ID - remove SWARYOGA- prefix if present
    userId = userId.toUpperCase().trim();
    if (userId.startsWith('SWARYOGA-')) {
      userId = userId.replace('SWARYOGA-', '');
    }
    
    await connectDB();
    const User = getUser();
    
    // Try multiple formats for profileId lookup
    // - Original input (e.g., "007131")
    // - Without leading zeros (e.g., "7131")  
    // - Padded to 6 digits (e.g., "007131")
    const searchTerms = [userId];
    
    // Add version without leading zeros
    const withoutLeadingZeros = userId.replace(/^0+/, '');
    if (withoutLeadingZeros && !searchTerms.includes(withoutLeadingZeros)) {
      searchTerms.push(withoutLeadingZeros);
    }
    
    // Add zero-padded 6-digit version
    const paddedVersion = withoutLeadingZeros.padStart(6, '0');
    if (!searchTerms.includes(paddedVersion)) {
      searchTerms.push(paddedVersion);
    }
    
    // Search by profileId (the 6-digit numeric ID)
    const user = await User.findOne({ profileId: { $in: searchTerms } })
      .select('name email phone countryCode country state gender age profession profileId')
      .lean();
    
    if (!user) {
      return NextResponse.json({ found: false });
    }
    
    return NextResponse.json({
      found: true,
      user: {
        profileId: user.profileId || '',
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        countryCode: user.countryCode || '+91',
        country: user.country || 'India',
        state: user.state || '',
        gender: user.gender || '',
        age: user.age || '',
        profession: user.profession || '',
      }
    });
    
  } catch (error) {
    console.error('User lookup error:', error);
    return NextResponse.json({ error: 'Lookup failed' }, { status: 500 });
  }
}
