import { NextRequest, NextResponse } from 'next/server';
import { bunnyExecute } from '@/lib/bunnyDatabase';
import { initCommunitySchema } from '@/lib/bunnyCommunityRepository';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    await initCommunitySchema();

    const { userId, email, mobile } = await request.json();

    // Validate inputs
    if (!userId || !email || !mobile) {
      return NextResponse.json(
        { error: 'userId, email, and mobile are required' },
        { status: 400 }
      );
    }

    // Validate User ID format (6 digits)
    if (!/^\d{6}$/.test(userId)) {
      return NextResponse.json(
        { error: 'User ID must be exactly 6 digits' },
        { status: 400 }
      );
    }

    // Clean mobile number
    const cleanMobile = mobile.replace(/\D/g, '');
    const cleanEmail = email.trim().toLowerCase();

    // Check if user ID already exists in CommunityMember
    const memberRes = await bunnyExecute({
      sql: 'SELECT id FROM community_members_sql WHERE user_id = ? LIMIT 1',
      args: [userId],
    });

    if (memberRes.rows.length > 0) {
      return NextResponse.json(
        { 
          success: false,
          error: 'This User ID is already registered in the community',
        },
        { status: 409 }
      );
    }

    // Look for matching order in sales database (orders_sql)
    let orderRow: any = null;
    try {
      const orderRes = await bunnyExecute({
        sql: `SELECT id, shipping_address_json, user_id FROM orders_sql
              WHERE (shipping_address_json LIKE ? OR shipping_address_json LIKE ? OR user_id = ?)
              AND payment_status IN ('completed', 'pending_manual', 'PAID', 'SUCCESS')
              LIMIT 1`,
        args: [`%${cleanEmail}%`, `%${cleanMobile}%`, userId],
      });
      orderRow = orderRes.rows[0];
    } catch (e) {
      console.warn('orders_sql check failed, falling back:', e);
    }

    // Also check mongo_documents orders if not found in orders_sql
    if (!orderRow) {
      try {
        const mongoOrder = await bunnyExecute({
          sql: `SELECT document_id, document_json FROM mongo_documents 
                WHERE collection_name = 'orders' 
                AND (document_json LIKE ? OR document_json LIKE ?)
                LIMIT 1`,
          args: [`%${cleanEmail}%`, `%${cleanMobile}%`],
        });
        if (mongoOrder.rows[0]) {
          orderRow = {
            id: mongoOrder.rows[0].document_id,
            shipping_address_json: mongoOrder.rows[0].document_json,
          };
        }
      } catch (e) {
        console.warn('mongo_documents orders check failed:', e);
      }
    }

    if (!orderRow) {
      return NextResponse.json(
        {
          success: false,
          error: 'No matching sales record found. Please verify your email and mobile number match your order.',
          code: 'NO_ORDER_FOUND',
        },
        { status: 404 }
      );
    }

    // User ID validation successful
    return NextResponse.json(
      {
        success: true,
        message: 'User ID verified successfully. Please complete your profile to join the community.',
        data: {
          userId,
          orderFound: true,
          verifiedEmail: true,
          verifiedMobile: true,
          orderId: String(orderRow.id),
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('User ID validation error:', error);
    return NextResponse.json(
      { error: 'Failed to validate User ID' },
      { status: 500 }
    );
  }
}
