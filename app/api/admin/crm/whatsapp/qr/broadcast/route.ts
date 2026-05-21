/**
 * QR WhatsApp Broadcast API
 * POST   /api/admin/crm/whatsapp/qr/broadcast — Send bulk broadcast
 * GET    /api/admin/crm/whatsapp/qr/broadcast — List scheduled broadcasts
 * DELETE /api/admin/crm/whatsapp/qr/broadcast — Cancel a broadcast
 *
 * Access Control (role hierarchy):
 * ─────────────────────────────────────────────────────────────────
 * Super Admin      → Allowed with isolated permanentTenantId session.
 * Super Admin Team → Allowed with isolated permanentTenantId session.
 * CRM Admin        → Allowed with isolated permanentTenantId/custom bridge session.
 * CRM Admin Team   → Allowed with isolated permanentTenantId/custom bridge session.
 * Leads            → No CRM access.
 * ─────────────────────────────────────────────────────────────────
 */
import { NextRequest, NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { connectDB } from '@/lib/db';
import { getCRMUserSettings, getLead } from '@/lib/schemas/enterpriseSchemas';
import { getViewerUserId, isSuperAdmin as checkSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';


const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = getWhatsAppBridgeConfig();

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
      bridgeSessionId: settings.permanentTenantId,
      tenantId: settings.permanentTenantId,
      hasOwnBridge: true,
      qrWhatsappEnabled: !!settings.qrWhatsappEnabled,
    };
  }

  if (settings?.qrBridgeUrl) {
    return {
      bridgeUrl: settings.qrBridgeUrl,
      bridgeSecret: settings.qrBridgeSecret || BRIDGE_SECRET,
      bridgeSessionId: userId,
      tenantId: null,
      hasOwnBridge: true,
      qrWhatsappEnabled: !!settings.qrWhatsappEnabled,
    };
  }

  return {
    bridgeUrl: BRIDGE_URL,
    bridgeSecret: BRIDGE_SECRET,
    bridgeSessionId: userId,
    tenantId: null,
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

    const decoded = verifyToken(authHeader.replace("Bearer ", ""));
    // Accept admin tokens (have isAdmin:true) and regular admin users (have userId)
    if (!decoded || (!decoded.isAdmin && !decoded.userId && !decoded.username)) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const superAdmin = checkSuperAdmin(decoded);
    const viewerUserId = getViewerUserId(decoded);
    let bridgeConfig = await resolveBridgeConfig(viewerUserId);

    // Super admins always get bridge access — use global bridge if no custom one set
    if (!bridgeConfig.hasOwnBridge && superAdmin) {
      bridgeConfig = {
        bridgeUrl: BRIDGE_URL,
        bridgeSecret: BRIDGE_SECRET,
        bridgeSessionId: viewerUserId,
        tenantId: null,
        hasOwnBridge: true,
        qrWhatsappEnabled: true,
      };
    }

    if (!bridgeConfig.hasOwnBridge) {
      return NextResponse.json({
        success: false,
        error: 'Access denied. WhatsApp session not configured. Please scan QR code first.',
      }, { status: 403 });
    }

    const body = await request.json();
    const { recipients, message, imageUrl, buttons, footerText, schedule, recipientType } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json({ success: false, error: "Recipients array required" }, { status: 400 });
    }

    // Support both 'people' and 'groups'
    const type = recipientType || 'people'; // Default to people for backwards compatibility

    // ── ANTI-BAN PROTECTION: Rate limiting calculation ──
    // Import rate limiter helpers
    const { calculateRateLimitTiming, calculateHourlyBroadcastSchedule, formatBroadcastSchedule } = await import('@/lib/whatsappRateLimiter');
    const timing = calculateRateLimitTiming(recipients.length);
    console.log(`[QR-Broadcast] 📊 Rate limiting: ${recipients.length} recipients = ${timing.estimatedMinutes}min estimated time (anti-ban protection)`);

    // AUTO-SCHEDULE for large broadcasts (100+ messages over 10 hours)
    let scheduleToUse = schedule;
    let wasAutoScheduled = false;
    
    if (recipients.length > 50 && !schedule) {
      // Auto-create 10-hour schedule for safety
      const defaultHourlySchedule = calculateHourlyBroadcastSchedule(recipients.length, 10);
      
      console.log(`[QR-Broadcast] 🚨 Large broadcast detected: ${recipients.length} recipients`);
      console.log(`[QR-Broadcast] ⏱️  Auto-scheduling over 10 hours: ${defaultHourlySchedule.totalDurationMinutes} min total`);
      
      // Create schedule object with batch timings
      scheduleToUse = {
        mode: 'scheduled',
        interval: 'hourly',
        spreadHours: 10,
        batches: defaultHourlySchedule.batches.map((b, idx) => ({
          batchNumber: idx + 1,
          size: b.size,
          delaySeconds: b.delaySeconds,
          scheduledTime: b.startTime.toISOString(),
        })),
        startTime: defaultHourlySchedule.scheduleStartTime.toISOString(),
        endTime: defaultHourlySchedule.scheduleEndTime.toISOString(),
        totalDurationMinutes: defaultHourlySchedule.totalDurationMinutes,
        antiSpamApplied: true,
      };
      
      wasAutoScheduled = true;
    }
    
    // Warn if user still tries to send 100+ messages immediately (highly risky)
    if (recipients.length > 100 && !schedule && !scheduleToUse) {
      console.warn(`[QR-Broadcast] ⚠️  CRITICAL: Immediate send of ${recipients.length} messages will trigger WhatsApp rate limits!`);
      return NextResponse.json({
        success: false,
        error: `🚨 CRITICAL: Sending to ${recipients.length} recipients immediately will get your number BANNED!

✅ SOLUTION: Use scheduled broadcast (automatically enabled)
- Messages spread over 10 hours
- Random batch sizes: 3-6 per batch
- Random delays: 20-60 seconds
- Looks human-like to WhatsApp filters
- Your number remains safe

The system has automatically created a 10-hour schedule. Click "Confirm" to proceed.`,
        estimatedTime: timing.estimatedMinutes,
        riskLevel: 'CRITICAL',
        autoScheduleAvailable: true,
      }, { status: 400 });
    }

    // ── Lead-Ownership Filter for Non-Super Admin (only for people, not groups) ──
    // Non-super-admin users can only broadcast to leads they own (people broadcasts)
    // Groups don't need this check since they're already access-controlled
    let filteredRecipients = recipients;
    if (!superAdmin && type === 'people') {
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
    } else if (type === 'groups') {
      console.log(`[qr-broadcast] Group broadcast: ${recipients.length} groups (no lead check required)`);
    }

    // ── Apply rate limiting estimate to response ──
    const timingInfo = calculateRateLimitTiming(filteredRecipients.length);

    const response = await fetch(`${bridgeConfig.bridgeUrl}/broadcast`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-bridge-secret": bridgeConfig.bridgeSecret,
        "x-user-id": viewerUserId,
        "x-session-key": bridgeConfig.bridgeSessionId,
        ...(bridgeConfig.tenantId ? { "x-tenant-id": bridgeConfig.tenantId } : {}),
      },
      body: JSON.stringify({
        recipients: filteredRecipients,
        message,
        imageUrl,
        buttons,
        footerText,
        schedule: scheduleToUse, // Use auto-schedule if created
        recipientType: type, // 'people' or 'groups'
        // Pass rate limiting hints to bridge
        rateLimitBatches: timingInfo.batches,
        rateLimitEstimateSeconds: timingInfo.estimatedSeconds,
      }),
    });
    
    const data = await response.json();
    
    // Add schedule info to response if auto-scheduled
    const responseData: any = {
      ...data,
      rateLimitInfo: {
        totalRecipients: filteredRecipients.length,
        estimatedBatches: timingInfo.batches,
        estimatedMinutes: timingInfo.estimatedMinutes,
        antiSpamNote: '✅ Rate limiting applied: random batch sizes 3-6, random delays 20-60sec between batches'
      }
    };
    
    // If auto-scheduled, include schedule details
    if (wasAutoScheduled && scheduleToUse) {
      responseData.scheduling = {
        autoScheduled: true,
        spreadHours: 10,
        totalBatches: scheduleToUse.batches.length,
        durationMinutes: scheduleToUse.totalDurationMinutes,
        startTime: scheduleToUse.startTime,
        endTime: scheduleToUse.endTime,
        message: `✅ Auto-scheduled: ${filteredRecipients.length} messages over 10 hours (${scheduleToUse.totalDurationMinutes} min)`
      };
    }
    
    return NextResponse.json(responseData);
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

    const decoded = verifyToken(authHeader.replace("Bearer ", ""));
    if (!decoded || (!decoded.isAdmin && !decoded.userId && !decoded.username)) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = checkSuperAdmin(decoded);
    let bridgeConfig = await resolveBridgeConfig(viewerUserId);
    if (!bridgeConfig.hasOwnBridge && superAdmin) {
      bridgeConfig = { bridgeUrl: BRIDGE_URL, bridgeSecret: BRIDGE_SECRET, bridgeSessionId: viewerUserId, tenantId: null, hasOwnBridge: true, qrWhatsappEnabled: true };
    }
    if (!bridgeConfig.hasOwnBridge) {
      return NextResponse.json({ success: false, error: 'WhatsApp session not configured.' }, { status: 403 });
    }

    const response = await fetch(`${bridgeConfig.bridgeUrl}/broadcast/scheduled`, {
      headers: {
        "x-bridge-secret": bridgeConfig.bridgeSecret,
        "x-user-id": viewerUserId,
        "x-session-key": bridgeConfig.bridgeSessionId,
        ...(bridgeConfig.tenantId ? { "x-tenant-id": bridgeConfig.tenantId } : {}),
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

    const decoded = verifyToken(authHeader.replace("Bearer ", ""));
    if (!decoded || (!decoded.isAdmin && !decoded.userId && !decoded.username)) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 });
    }

    const viewerUserId = getViewerUserId(decoded);
    const superAdmin = checkSuperAdmin(decoded);
    let bridgeConfig = await resolveBridgeConfig(viewerUserId);
    if (!bridgeConfig.hasOwnBridge && superAdmin) {
      bridgeConfig = { bridgeUrl: BRIDGE_URL, bridgeSecret: BRIDGE_SECRET, bridgeSessionId: viewerUserId, tenantId: null, hasOwnBridge: true, qrWhatsappEnabled: true };
    }
    if (!bridgeConfig.hasOwnBridge) {
      return NextResponse.json({ success: false, error: 'WhatsApp session not configured.' }, { status: 403 });
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
        "x-session-key": bridgeConfig.bridgeSessionId,
        ...(bridgeConfig.tenantId ? { "x-tenant-id": bridgeConfig.tenantId } : {}),
      },
    });
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("[qr-broadcast] DELETE error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
