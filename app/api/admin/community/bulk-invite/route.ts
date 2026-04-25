import { NextRequest, NextResponse } from 'next/server';
import { connectDB, CommunityMember } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import { getLead } from '@/lib/schemas/enterpriseSchemas';

export const dynamic = 'force-dynamic';


// Community Join Links — canonical /join/<id> form
// Any communityId not listed here will auto-generate: https://swaryoga.com/join/<id>
const COMMUNITY_JOIN_LINKS: Record<string, string> = {
  'global': 'https://swaryoga.com/join/global',
  'old-sadhak-community': 'https://swaryoga.com/join/old-sadhak-community',
  'swar-yoga-l1': 'https://swaryoga.com/join/swar-yoga-l1',
  'swar-yoga-l2': 'https://swaryoga.com/join/swar-yoga-l2',
  'swar-yoga-l3': 'https://swaryoga.com/join/swar-yoga-l3',
  'swar-yoga-l4': 'https://swaryoga.com/join/swar-yoga-l4',
  'swar-yoga-l5': 'https://swaryoga.com/join/swar-yoga-l5',
  'aahar': 'https://swaryoga.com/join/aahar',
  'i-am-fit': 'https://swaryoga.com/join/i-am-fit',
  'pre-planning-garbh-sankar': 'https://swaryoga.com/join/pre-planning-garbh-sankar',
  '9-month-garbha-sanskar': 'https://swaryoga.com/join/9-month-garbha-sanskar',
  'youth': 'https://swaryoga.com/join/youth',
  'children': 'https://swaryoga.com/join/children',
  'yogasana': 'https://swaryoga.com/join/yogasana',
};

// POST - Send bulk community invites
export async function POST(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const {
      targetCommunityId,  // Community to invite to
      sourceCommunityId,  // Get members from this community (optional)
      useLeads,           // Use CRM leads instead of community members
      workshopFilter,     // Filter leads by workshop (optional)
      customPhones,       // Custom list of phone numbers
      customMessage,      // Custom WhatsApp message
      provider,           // 'meta' or 'qr'
    } = body;

    if (!targetCommunityId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Target community ID is required' 
      }, { status: 400 });
    }

    const joinLink = COMMUNITY_JOIN_LINKS[targetCommunityId] || `https://swaryoga.com/join/${targetCommunityId}`;
    if (!targetCommunityId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Invalid target community ID' 
      }, { status: 400 });
    }

    // Collect phone numbers based on source
    let phoneNumbers: Array<{ mobile: string; name: string; fullPhone: string }> = [];

    if (customPhones && Array.isArray(customPhones) && customPhones.length > 0) {
      // Use custom phone list
      phoneNumbers = customPhones.map((p: any) => ({
        mobile: p.mobile || p,
        name: p.name || 'Member',
        fullPhone: `91${String(p.mobile || p).replace(/\D/g, '').slice(-10)}`,
      }));
    } else if (useLeads) {
      // Use CRM Leads
      const Lead = getLead();
      const query: any = {};
      if (workshopFilter) {
        query.workshopName = workshopFilter;
      }
      
      const leads = await Lead.find(query)
        .select('name phoneNumber')
        .lean();

      // Get phones already in target community
      const existingPhones = await CommunityMember.find({ 
        communityId: targetCommunityId, 
        status: 'active' 
      }).distinct('mobile');
      const existingSet = new Set(existingPhones.map((p: string) => p.replace(/\D/g, '').slice(-10)));

      phoneNumbers = leads
        .filter((l: any) => {
          const normalized = String(l.phoneNumber || '').replace(/\D/g, '').slice(-10);
          return !existingSet.has(normalized);
        })
        .map((l: any) => ({
          mobile: l.phoneNumber,
          name: l.name || 'Sadhak',
          fullPhone: `91${String(l.phoneNumber).replace(/\D/g, '').slice(-10)}`,
        }));
    } else if (sourceCommunityId) {
      // Get from source community, exclude those already in target
      const sourceMembers = await CommunityMember.find({ 
        communityId: sourceCommunityId, 
        status: 'active' 
      }).select('mobile name').lean();

      const targetPhones = await CommunityMember.find({ 
        communityId: targetCommunityId, 
        status: 'active' 
      }).distinct('mobile');
      const targetSet = new Set(targetPhones.map((p: string) => p.replace(/\D/g, '').slice(-10)));

      phoneNumbers = sourceMembers
        .filter((m: any) => {
          const normalized = String(m.mobile || '').replace(/\D/g, '').slice(-10);
          return !targetSet.has(normalized);
        })
        .map((m: any) => ({
          mobile: m.mobile,
          name: m.name || 'Member',
          fullPhone: `91${String(m.mobile).replace(/\D/g, '').slice(-10)}`,
        }));
    }

    if (phoneNumbers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No eligible phone numbers found for invite',
      }, { status: 400 });
    }

    // Build invite message
    const communityNames: Record<string, string> = {
      'global': 'Swar Yoga Global Community',
      'swar-yoga': 'Swar Yoga Community',
      'aham-bramhasmi': 'Aham Bramhasmi Community',
      'astavakra': 'Astavakra Community',
      'shivoham': 'Shivoham Community',
      'i-am-fit': 'I am Fit Community',
      'youth': 'Youth Community',
      'children': 'Children Community',
    };

    const defaultMessage = `🙏 नमस्कार {name} जी,

आपको *${communityNames[targetCommunityId] || 'Swar Yoga Community'}* में आमंत्रित किया जा रहा है! 

🎬 यहाँ आपको मिलेगा:
• Workshop recordings & class videos
• Daily spiritual content
• Experiences & transformations
• Tips और guidance

👇 Join करने के लिए यहाँ click करें:
${joinLink}

🙏 स्वर योग परिवार`;

    const message = customMessage || defaultMessage;

    // Return preview data (actual sending happens via broadcast page)
    return NextResponse.json({
      success: true,
      data: {
        targetCommunity: targetCommunityId,
        joinLink,
        phoneCount: phoneNumbers.length,
        phones: phoneNumbers.slice(0, 100), // Preview first 100
        totalPhones: phoneNumbers.length,
        messagePreview: message,
        readyForBroadcast: true,
        instructions: 'Use the Broadcast page with these phone numbers and template',
      },
    });
  } catch (error: any) {
    console.error('[Bulk Invite API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// GET - Get invite preview stats
export async function GET(request: NextRequest) {
  try {
    await connectDB();
    
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const targetCommunityId = searchParams.get('targetCommunityId');

    // Get stats
    const Lead = getLead();
    const totalLeads = await Lead.countDocuments({});
    
    // Count by workshop
    const workshopCounts = await Lead.aggregate([
      { $group: { _id: '$workshopName', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // Community member counts
    const communityCounts = await CommunityMember.aggregate([
      { $match: { status: 'active' } },
      { $group: { _id: '$communityId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // If target specified, count how many NOT in that community
    let eligibleForInvite = 0;
    if (targetCommunityId) {
      const targetPhones = await CommunityMember.find({ 
        communityId: targetCommunityId, 
        status: 'active' 
      }).distinct('mobile');
      const targetSet = new Set(targetPhones.map((p: string) => p.replace(/\D/g, '').slice(-10)));

      const leads = await Lead.find({}).select('phoneNumber').lean();
      eligibleForInvite = leads.filter((l: any) => {
        const normalized = String(l.phoneNumber || '').replace(/\D/g, '').slice(-10);
        return !targetSet.has(normalized);
      }).length;
    }

    return NextResponse.json({
      success: true,
      data: {
        totalLeads,
        workshopCounts,
        communityCounts,
        eligibleForInvite,
        communityJoinLinks: COMMUNITY_JOIN_LINKS,
      },
    });
  } catch (error: any) {
    console.error('[Bulk Invite API] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
