import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { getWhatsAppMessage } from "@/lib/schemas/enterpriseSchemas";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const decoded = await verifyToken(authHeader.replace("Bearer ", ""));
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    await connectDB();
    const WhatsAppMessage = getWhatsAppMessage();

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const phoneNumber = searchParams.get("phoneNumber");
    const status = searchParams.get("status");
    const direction = searchParams.get("direction") || "outbound";
    const limit = Math.min(parseInt(searchParams.get("limit") || "100"), 1000);

    // Build filter
    const filter: any = { direction };
    if (phoneNumber) filter.phoneNumber = phoneNumber;
    if (status) filter.status = status;

    // Date range filter
    if (from || to) {
      filter.sentAt = {};
      if (from) filter.sentAt.$gte = new Date(from);
      if (to) filter.sentAt.$lte = new Date(to);
    }

    // Query messages from MongoDB
    const messages = await WhatsAppMessage.find(filter)
      .sort({ sentAt: -1 })
      .limit(limit)
      .lean();

    // Calculate statistics
    const stats = await WhatsAppMessage.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const totalCount = await WhatsAppMessage.countDocuments(filter);

    return NextResponse.json({
      success: true,
      data: messages,
      stats: {
        total: totalCount,
        byStatus: stats,
        count: messages.length,
      },
      message: `Found ${totalCount} messages`,
    });
  } catch (error: any) {
    console.error("[broadcast-report] GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
