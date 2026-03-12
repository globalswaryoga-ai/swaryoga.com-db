/**
 * QR WhatsApp Broadcast API
 * POST   /api/admin/crm/whatsapp/qr/broadcast — Send bulk broadcast
 * GET    /api/admin/crm/whatsapp/qr/broadcast — List scheduled broadcasts
 * DELETE /api/admin/crm/whatsapp/qr/broadcast — Cancel a broadcast
 *
 * Access Control (role hierarchy):
 * ─────────────────────────────────────────────────────────────────
 * Super Admin      → Always allowed.
 * Super Admin Team → Allowed only if qrWhatsappEnabled=true.
 * CRM Admin        → Allowed (has own qrBridgeUrl).
 * CRM Admin Team   → Allowed only if qrWhatsappEnabled=true under tenant.
 * Leads            → No CRM access.
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getLead } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';

const BRIDGE_URL = process.env.BRIDGE_URL || "http://52.91.198.23:3333";
const BRIDGE_SECRET = process.env.BRIDGE_SECRET || "swar-bridge-secret-2024";

async function resolveBridgeConfig(userId: string) {
  await connectDB();
  const CRMUserSettings = getCRMUserSettings();
  const settings = await CRMUserSettings.findOne(
    { userId },
    { permanentTenantId: 1, qrBridgeUrl: 1, qrBridgeSecret: 1, qrWhatsappEnabled: 1 }
  ).lean() as any;

  if (settings?.permanentTenantId) {
    return {
      bridgeUrl: BRIDGE_URL,
      bridgeSecret: BRIDGE_SECRET,
      hasOwnBridge: true,
      qrWhatsappEnabled: !!settings.qrWhatsappEnabled,
    };
  }

  if (settings?.qrBridgeUrl) {
    return {
      bridgeUrl: settings.qrBridgeUrl,
      bridgeSecret: settings.qrBridgeSecret || BRIDGE_SECRET,
      hasOwnBridge: true,
      qrWhatsappEnabled: !!settings.qrWhatsappEnabled,
    };
  }

  return {
    bridgeUrl: BRIDGE_URL,
    bridgeSecret: BRIDGE_SECRET,
    hasOwnBridge: false,
    qrWhatsappEnabled: !!settings?.qrWhatsappEnabled,
  };
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

    // ── Access Gate (Super Admin Team / CRM Admin Team Protection) ──
    const superAdmin = checkSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);
    const bridgeConfig = await resolveBridgeConfig(viewerUserId);
    if (!superAdmin) {
      if (!bridgeConfig.hasOwnBridge && !bridgeConfig.qrWhatsappEnabled) {
        return NextResponse.json({
          success: false,
          error: 'Access denied. You need your own WhatsApp bridge configured to use broadcasts.'
        }, { status: 403 });
      }

      // Tenant owners with qrWhatsappEnabled must NOT use the shared bridge.
      if (!bridgeConfig.hasOwnBridge && bridgeConfig.qrWhatsappEnabled) {
        try {
          const mongoose = (await import('mongoose')).default;
          const db = mongoose.connection.db;
          if (db) {
            const tenantDoc = await db.collection('tenants').findOne({
              $or: [
                { ownerUserId: viewerUserId },
                { adminUserId: viewerUserId },
              ],
            }, { projection: { _id: 1 } });
            if (tenantDoc) {
              return NextResponse.json({
                success: false,
                error: 'Access denied. CRM tenants must configure their own WhatsApp bridge.'
              }, { status: 403 });
            }
          }
        } catch {
          return NextResponse.json({ success: false, error: 'Bridge access check failed' }, { status: 500 });
        }
      }
    }

    const body = await request.json();
    const { recipients, message, imageUrl, buttons, footerText, schedule } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: "Recipients array required" }, { status: 400 });
    }

    // ── Lead-Ownership Filter for Non-Super Admin ──
    // Non-super-admin users can only broadcast to leads they own
    let filteredRecipients = recipients;
    if (!superAdmin) {
      const viewerUserId = getViewerUserId(decoded);
      await connectDB();
      const Lead = getLead();
      // Build phone variants for lookup (both with and without 91 prefix)
      const allPhones: string[] = [];
      for (const r of recipients) {
        const phone = String(r).replace(/\D/g, '');
        allPhones.push(phone);
        if (phone.startsWith('91') && phone.length === 12) {
          allPhones.push(phone.substring(2));
        } else if (phone.length === 10) {
          allPhones.push('91' + phone);
        }
      }
      const ownedLeads = await Lead.find(
        {
          phoneNumber: { $in: allPhones },
          $or: [
            { assignedToUserId: viewerUserId },
            { createdByUserId: viewerUserId },
          ],
        },
        { phoneNumber: 1 }
      ).lean();
      // Build set of owned phone numbers (normalized)
      const ownedPhones = new Set<string>();
      for (const lead of ownedLeads) {
        const lp = (lead as any).phoneNumber;
        if (lp) {
          ownedPhones.add(lp);
          if (lp.startsWith('91') && lp.length === 12) ownedPhones.add(lp.substring(2));
          else if (lp.length === 10) ownedPhones.add('91' + lp);
        }
      }
      filteredRecipients = recipients.filter((r: string) => {
        const phone = String(r).replace(/\D/g, '');
        return ownedPhones.has(phone);
      });
      if (filteredRecipients.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'None of the recipients are assigned to you. Broadcast blocked.',
        }, { status: 403 });
      }
      console.log(`[qr-broadcast] Lead filter for ${viewerUserId}: ${recipients.length} → ${filteredRecipients.length} recipients`);
    }

    const response = await fetch(`${bridgeConfig.bridgeUrl}/broadcast`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-bridge-secret": bridgeConfig.bridgeSecret,
        "x-user-id": viewerUserId,
      },
      body: JSON.stringify({ recipients: filteredRecipients, message, imageUrl, buttons, footerText, schedule }),
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

    // ── Access Gate (Super Admin Team / CRM Admin Team Protection) ──
    const superAdmin = checkSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);
    const bridgeConfig = await resolveBridgeConfig(viewerUserId);
    if (!superAdmin) {
      if (!bridgeConfig.hasOwnBridge && !bridgeConfig.qrWhatsappEnabled) {
        return NextResponse.json({
          success: false,
          error: 'Access denied. You need your own WhatsApp bridge configured.'
        }, { status: 403 });
      }
    }

    const response = await fetch(`${bridgeConfig.bridgeUrl}/broadcast/scheduled`, {
      headers: {
        "x-bridge-secret": bridgeConfig.bridgeSecret,
        "x-user-id": viewerUserId,
      },
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

    // ── Access Gate (Super Admin Team / CRM Admin Team Protection) ──
    const superAdmin = checkSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);
    const bridgeConfig = await resolveBridgeConfig(viewerUserId);
    if (!superAdmin) {
      if (!bridgeConfig.hasOwnBridge && !bridgeConfig.qrWhatsappEnabled) {
        return NextResponse.json({
          success: false,
          error: 'Access denied. You need your own WhatsApp bridge configured.'
        }, { status: 403 });
      }
    }

    const { id } = await request.json();
    if (!id) {
      return NextResponse.json({ success: false, error: "Broadcast ID required" }, { status: 400 });
    }

    const response = await fetch(`${bridgeConfig.bridgeUrl}/broadcast/scheduled/${id}`, {
      method: "DELETE",
      headers: {
        "x-bridge-secret": bridgeConfig.bridgeSecret,
        "x-user-id": viewerUserId,
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[qr-broadcast] DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
