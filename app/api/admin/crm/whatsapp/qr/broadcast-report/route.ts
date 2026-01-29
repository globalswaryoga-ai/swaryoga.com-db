import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://52.91.198.23:3333";
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || "swar-bridge-secret-2024";

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

    const { searchParams } = new URL(request.url);
    const broadcastId = searchParams.get("broadcastId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let url = `${BRIDGE_URL}/broadcast/report`;
    const params = new URLSearchParams();
    if (broadcastId) params.append("broadcastId", broadcastId);
    if (from) params.append("from", from);
    if (to) params.append("to", to);
    if (params.toString()) url += `?${params.toString()}`;

    const response = await fetch(url, {
      headers: { "x-bridge-secret": BRIDGE_SECRET },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[broadcast-report] GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
