import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';


const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = getWhatsAppBridgeConfig();

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

    const response = await fetch(`${BRIDGE_URL}/broadcast/settings`, {
      headers: { "x-bridge-secret": BRIDGE_SECRET },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[broadcast-settings] GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const decoded = await verifyToken(authHeader.replace("Bearer ", ""));
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const body = await request.json();
    
    const response = await fetch(`${BRIDGE_URL}/broadcast/settings`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-bridge-secret": BRIDGE_SECRET 
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[broadcast-settings] POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
