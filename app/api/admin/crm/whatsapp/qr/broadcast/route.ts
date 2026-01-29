import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";

const BRIDGE_URL = process.env.BRIDGE_URL || "http://52.91.198.23:3333";
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || "swar-bridge-secret-2024";

// Send bulk broadcast via QR bridge
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
    const { recipients, message, imageUrl, buttons, footerText, schedule } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: "Recipients array required" }, { status: 400 });
    }

    const response = await fetch(`${BRIDGE_URL}/broadcast`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-bridge-secret": BRIDGE_SECRET 
      },
      body: JSON.stringify({ recipients, message, imageUrl, buttons, footerText, schedule }),
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[qr-broadcast] POST error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Get scheduled broadcasts
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

    const response = await fetch(`${BRIDGE_URL}/broadcast/scheduled`, {
      headers: { "x-bridge-secret": BRIDGE_SECRET },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[qr-broadcast] GET error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Cancel scheduled broadcast
export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }
    
    const decoded = await verifyToken(authHeader.replace("Bearer ", ""));
    if (!decoded || !decoded.isAdmin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Broadcast ID required" }, { status: 400 });
    }

    const response = await fetch(`${BRIDGE_URL}/broadcast/scheduled/${id}`, {
      method: "DELETE",
      headers: { "x-bridge-secret": BRIDGE_SECRET },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[qr-broadcast] DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
