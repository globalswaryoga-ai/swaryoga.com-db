/**
 * LID Mapping Sync Endpoint
 * Extracts LID->Phone mappings from historical CRM messages and syncs to bridge
 * 
 * LIDs (Locally-Generated IDs) are WhatsApp's internal identifiers that some accounts use
 * instead of phone numbers. This endpoint helps maintain a mapping table.
 */

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { getWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';
import { verifyToken } from '@/lib/auth';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

export const dynamic = 'force-dynamic';

/**
 * Extract LID->Phone mappings from CRM messages
 * Pattern: waMessageId contains "false_<LID>@lid_<msgId>"
 */
async function extractMappingsFromCRM(): Promise<Record<string, string>> {
  const WhatsAppMessage = getWhatsAppMessage();
  
  // Find messages with LID pattern in waMessageId
  const messagesWithLid = await WhatsAppMessage.find({
    waMessageId: /@lid/i,
    phoneNumber: { $exists: true, $ne: null }
  }).select('waMessageId phoneNumber').limit(1000);
  
  const mappings: Record<string, string> = {};
  
  for (const msg of messagesWithLid) {
    // Extract LID from waMessageId pattern: false_1606351380725@lid_...
    const match = msg.waMessageId?.match(/false_(\d+)@lid/);
    if (match && match[1] && msg.phoneNumber) {
      const lid = match[1];
      const phone = msg.phoneNumber.replace(/\D/g, '');
      
      // Only map if phone looks valid (10-15 digits)
      if (phone.length >= 10 && phone.length <= 15) {
        mappings[lid] = phone;
      }
    }
  }
  
  return mappings;
}

/**
 * GET - Retrieve current LID mappings from bridge
 */
export async function GET(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    // Get current mappings from bridge
    const bridgeRes = await fetch(`${BRIDGE_URL}/lid-mappings`, {
      headers: { 'x-bridge-secret': BRIDGE_SECRET }
    });
    
    if (!bridgeRes.ok) {
      return NextResponse.json({ error: 'Failed to fetch from bridge', status: bridgeRes.status }, { status: 500 });
    }
    
    const bridgeData = await bridgeRes.json();
    
    // Also get potential mappings from CRM
    await connectDB();
    const crmMappings = await extractMappingsFromCRM();
    
    return NextResponse.json({
      success: true,
      bridge: bridgeData,
      crm: {
        count: Object.keys(crmMappings).length,
        mappings: crmMappings
      }
    });
  } catch (err: any) {
    console.error('[SYNC-LID] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST - Sync LID mappings from CRM to bridge
 */
export async function POST(req: NextRequest) {
  try {
    const decoded = await verifyToken(req);
    if (!decoded?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }
    
    await connectDB();
    
    // Extract mappings from CRM messages
    const crmMappings = await extractMappingsFromCRM();
    const mappingsArray = Object.entries(crmMappings).map(([lid, phone]) => ({ lid, phone }));
    
    if (mappingsArray.length === 0) {
      return NextResponse.json({ success: true, synced: 0, message: 'No mappings found in CRM' });
    }
    
    // Push to bridge
    const bridgeRes = await fetch(`${BRIDGE_URL}/lid-mappings/bulk`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': BRIDGE_SECRET
      },
      body: JSON.stringify({ mappings: mappingsArray })
    });
    
    if (!bridgeRes.ok) {
      const errText = await bridgeRes.text();
      return NextResponse.json({ error: 'Bridge sync failed', details: errText }, { status: 500 });
    }
    
    const bridgeResult = await bridgeRes.json();
    
    return NextResponse.json({
      success: true,
      extracted: mappingsArray.length,
      synced: bridgeResult.added,
      total: bridgeResult.total,
      mappings: crmMappings
    });
  } catch (err: any) {
    console.error('[SYNC-LID] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
