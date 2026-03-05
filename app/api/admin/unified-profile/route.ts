// Unified User Profile API - Get all user data across all touchpoints
import { NextRequest } from 'next/server';
import { verifyToken } from '@/lib/auth';
import { connectDB, User, Contact, Order, CommunityMembership, CommunityPost, UserDevice, DeviceViolation } from '@/lib/db';
import { getLead, getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { apiError, apiSuccess } from '@/lib/api-error';

// GET - Get unified profile by userId, profileId, phone, or email
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return apiError('Unauthorized', 401);
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('Admin access required', 403);
    }
    
    await connectDB();
    
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const profileId = searchParams.get('profileId');
    const phone = searchParams.get('phone');
    const email = searchParams.get('email');
    const leadId = searchParams.get('leadId');
    
    // Build the unified profile
    const profile: {
      user: unknown;
      lead: unknown;
      orders: unknown[];
      contacts: unknown[];
      whatsappMessages: unknown[];
      communityMemberships: unknown[];
      communityPosts: unknown[];
      devices: unknown[];
      violations: unknown[];
      summary: {
        hasAccount: boolean;
        hasLead: boolean;
        totalOrders: number;
        totalContacts: number;
        totalMessages: number;
        totalDevices: number;
        totalViolations: number;
        isLinked: boolean;
      };
    } = {
      user: null,
      lead: null,
      orders: [],
      contacts: [],
      whatsappMessages: [],
      communityMemberships: [],
      communityPosts: [],
      devices: [],
      violations: [],
      summary: {
        hasAccount: false,
        hasLead: false,
        totalOrders: 0,
        totalContacts: 0,
        totalMessages: 0,
        totalDevices: 0,
        totalViolations: 0,
        isLinked: false,
      },
    };
    
    const Lead = getLead();
    const WhatsAppMessage = getWhatsAppMessage();
    
    let foundUserId: string | null = null;
    let foundPhone: string | null = null;
    let foundEmail: string | null = null;
    let foundProfileId: string | null = null;
    
    // Step 1: Find the User account
    if (userId) {
      profile.user = await User.findById(userId).lean();
    } else if (profileId) {
      profile.user = await User.findOne({ profileId }).lean();
    } else if (email) {
      profile.user = await User.findOne({ email: email.toLowerCase() }).lean();
    } else if (phone) {
      // Normalize phone
      const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
      profile.user = await User.findOne({ 
        $or: [
          { mobileNumber: { $regex: normalizedPhone } },
          { mobileNumber: normalizedPhone },
        ]
      }).lean();
    } else if (leadId) {
      // Find lead first, then try to find linked user
      const lead = await Lead.findById(leadId).lean();
      if (lead) {
        profile.lead = lead;
        foundPhone = (lead as { phoneNumber?: string }).phoneNumber || null;
        foundEmail = (lead as { email?: string }).email || null;
        
        if ((lead as { linkedUserId?: string }).linkedUserId) {
          profile.user = await User.findById((lead as { linkedUserId: string }).linkedUserId).lean();
        }
      }
    }
    
    // Extract identifiers from user
    if (profile.user) {
      const user = profile.user as { _id: { toString: () => string }; profileId?: string; email?: string; mobileNumber?: string };
      foundUserId = user._id.toString();
      foundProfileId = user.profileId || null;
      foundEmail = foundEmail || user.email || null;
      foundPhone = foundPhone || user.mobileNumber || null;
      profile.summary.hasAccount = true;
    }
    
    // Step 2: Find the Lead (CRM record)
    if (!profile.lead) {
      const leadQuery: Record<string, unknown>[] = [];
      if (foundUserId) leadQuery.push({ linkedUserId: foundUserId });
      if (foundProfileId) leadQuery.push({ linkedProfileId: foundProfileId });
      if (foundPhone) {
        const normalizedPhone = foundPhone.replace(/\D/g, '');
        leadQuery.push({ phoneNumber: { $regex: normalizedPhone.slice(-10) } });
      }
      if (foundEmail) leadQuery.push({ email: foundEmail.toLowerCase() });
      if (phone) {
        const normalizedPhone = phone.replace(/\D/g, '');
        leadQuery.push({ phoneNumber: { $regex: normalizedPhone.slice(-10) } });
      }
      if (email) leadQuery.push({ email: email.toLowerCase() });
      
      if (leadQuery.length > 0) {
        profile.lead = await Lead.findOne({ $or: leadQuery }).lean();
      }
    }
    
    if (profile.lead) {
      const lead = profile.lead as { phoneNumber?: string; email?: string };
      foundPhone = foundPhone || lead.phoneNumber || null;
      foundEmail = foundEmail || lead.email || null;
      profile.summary.hasLead = true;
      profile.summary.isLinked = !!(profile.lead as { isLinkedToAccount?: boolean }).isLinkedToAccount;
    }
    
    // Step 3: Get Orders
    if (foundUserId) {
      profile.orders = await Order.find({ userId: foundUserId }).sort({ createdAt: -1 }).limit(50).lean();
    }
    if (foundEmail && profile.orders.length === 0) {
      profile.orders = await Order.find({ email: foundEmail.toLowerCase() }).sort({ createdAt: -1 }).limit(50).lean();
    }
    profile.summary.totalOrders = profile.orders.length;
    
    // Step 4: Get Contact Form Submissions
    const contactQuery: Record<string, unknown>[] = [];
    if (foundEmail) contactQuery.push({ email: foundEmail.toLowerCase() });
    if (foundPhone) {
      const normalizedPhone = foundPhone.replace(/\D/g, '').slice(-10);
      contactQuery.push({ phone: { $regex: normalizedPhone } });
    }
    if (foundUserId) contactQuery.push({ linkedUserId: foundUserId });
    
    if (contactQuery.length > 0) {
      profile.contacts = await Contact.find({ $or: contactQuery }).sort({ createdAt: -1 }).limit(50).lean();
    }
    profile.summary.totalContacts = profile.contacts.length;
    
    // Step 5: Get WhatsApp Messages
    if (foundPhone) {
      const normalizedPhone = foundPhone.replace(/\D/g, '');
      profile.whatsappMessages = await WhatsAppMessage.find({
        $or: [
          { from: { $regex: normalizedPhone.slice(-10) } },
          { to: { $regex: normalizedPhone.slice(-10) } },
        ]
      }).sort({ createdAt: -1 }).limit(100).lean();
    }
    profile.summary.totalMessages = profile.whatsappMessages.length;
    
    // Step 6: Get Community Memberships
    if (foundUserId) {
      profile.communityMemberships = await CommunityMembership.find({ 
        $or: [{ userId: foundUserId }, { odId: foundUserId }]
      }).lean();
      
      // Get community posts
      profile.communityPosts = await CommunityPost.find({ userId: foundUserId })
        .sort({ createdAt: -1 }).limit(20).lean();
    }
    
    // Step 7: Get Devices
    if (foundUserId) {
      profile.devices = await UserDevice.find({ userId: foundUserId }).sort({ lastActive: -1 }).lean();
      profile.summary.totalDevices = profile.devices.length;
      
      // Get violations
      profile.violations = await DeviceViolation.find({ userId: foundUserId }).sort({ createdAt: -1 }).limit(50).lean();
      profile.summary.totalViolations = profile.violations.length;
    }
    
    return apiSuccess(profile);
    
  } catch (error) {
    console.error('Unified profile error:', error);
    return apiError('Failed to get unified profile', 500);
  }
}

// POST - Link a Lead to a User account
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return apiError('Unauthorized', 401);
    }
    
    const decoded = await verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return apiError('Admin access required', 403);
    }
    
    await connectDB();
    
    const body = await req.json();
    const { leadId, userId, profileId, action } = body;
    
    const Lead = getLead();
    
    if (action === 'link') {
      // Link a lead to a user account
      if (!leadId) {
        return apiError('Lead ID is required', 400);
      }
      
      let user: any = null;
      if (userId) {
        user = await User.findById(userId);
      } else if (profileId) {
        user = await User.findOne({ profileId });
      }
      
      if (!user) {
        return apiError('User not found', 404);
      }
      
      const lead = await Lead.findByIdAndUpdate(
        leadId,
        {
          linkedUserId: user._id,
          linkedProfileId: user.profileId,
          isLinkedToAccount: true,
        },
        { new: true }
      );
      
      return apiSuccess({ message: 'Lead linked to user', lead });
      
    } else if (action === 'unlink') {
      // Unlink a lead from user account
      if (!leadId) {
        return apiError('Lead ID is required', 400);
      }
      
      const lead = await Lead.findByIdAndUpdate(
        leadId,
        {
          linkedUserId: null,
          linkedProfileId: null,
          isLinkedToAccount: false,
        },
        { new: true }
      );
      
      return apiSuccess({ message: 'Lead unlinked from user', lead });
      
    } else if (action === 'auto-link') {
      // Auto-link leads to users based on phone/email match
      const users = await User.find({}).lean();
      let linked = 0;
      
      for (const user of users) {
        const userTyped = user as { _id: { toString: () => string }; profileId?: string; email?: string; mobileNumber?: string };
        const query: Record<string, unknown>[] = [];
        
        if (userTyped.email) {
          query.push({ email: userTyped.email.toLowerCase() });
        }
        if (userTyped.mobileNumber) {
          const normalizedPhone = userTyped.mobileNumber.replace(/\D/g, '');
          query.push({ phoneNumber: { $regex: normalizedPhone.slice(-10) } });
        }
        
        if (query.length > 0) {
          const result = await Lead.updateMany(
            { 
              $or: query,
              isLinkedToAccount: { $ne: true },
            },
            {
              linkedUserId: userTyped._id,
              linkedProfileId: userTyped.profileId,
              isLinkedToAccount: true,
            }
          );
          linked += result.modifiedCount;
        }
      }
      
      return apiSuccess({ message: `Auto-linked ${linked} leads to user accounts` });
      
    } else {
      return apiError('Invalid action. Use: link, unlink, or auto-link', 400);
    }
    
  } catch (error) {
    console.error('Link profile error:', error);
    return apiError('Failed to link profile', 500);
  }
}
