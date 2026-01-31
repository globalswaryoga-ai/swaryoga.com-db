import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { verifyToken } from '@/lib/auth';
import mongoose from 'mongoose';

// GET - Fetch admin users
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    await connectDB();
    
    // Get the users collection from the CRM database
    const crmDbName = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';
    const db = mongoose.connection.useDb(crmDbName, { useCache: true });
    const usersCollection = db.collection('users');

    // Fetch all admin users
    const adminUsers = await usersCollection.find({ isAdmin: true }).toArray();
    
    // Map to a safe response format
    const users = adminUsers.map(user => ({
      _id: user._id.toString(),
      userId: user.userId || user._id.toString(),
      name: user.name || user.email || 'Unknown',
      email: user.email || '',
      isAdmin: user.isAdmin,
      permissionsV2: user.permissionsV2 || {},
    }));

    return NextResponse.json({ 
      success: true, 
      users 
    });
  } catch (error: any) {
    console.error('[Admin Users GET] Error:', error);
    return NextResponse.json({ 
      error: error.message || 'Failed to fetch admin users' 
    }, { status: 500 });
  }
}
