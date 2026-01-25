/**
 * Force Reset WhatsApp Session
 * When users get "Try again later" from WhatsApp, this endpoint:
 * 1. Clears local QR cache
 * 2. Attempts to call bridge restart with force flag
 * 3. Waits for new QR generation
 * 4. Returns fresh QR or detailed instructions
 */

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';
const BRIDGE_SECRET = process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';
const CACHE_DIR = path.join(process.cwd(), '.qr-cache');

export const dynamic = 'force-dynamic';

// Clear all QR cache files
function clearQRCache() {
  try {
    if (fs.existsSync(CACHE_DIR)) {
      const files = fs.readdirSync(CACHE_DIR);
      files.forEach(file => {
        try {
          fs.unlinkSync(path.join(CACHE_DIR, file));
        } catch (e) {
          console.warn('[Force Reset] Failed to delete:', file, e);
        }
      });
      console.log('[Force Reset] Cleared QR cache');
      return true;
    }
  } catch (err) {
    console.error('[Force Reset] Failed to clear cache:', err);
  }
  return false;
}

// Try to restart bridge with force flag
async function restartBridgeWithForce(): Promise<{ success: boolean; message: string }> {
  try {
    console.log('[Force Reset] Attempting POST /restart?force=true...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    
    const response = await fetch(`${BRIDGE_URL}/restart?force=true`, {
      method: 'POST',
      headers: {
        'x-bridge-secret': BRIDGE_SECRET,
        'Content-Type': 'application/json'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      console.log('[Force Reset] Bridge restart successful:', data);
      return { success: true, message: 'Bridge restart triggered' };
    }
    
    return { success: false, message: `Bridge returned HTTP ${response.status}` };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    console.warn('[Force Reset] Restart attempt failed:', msg);
    return { success: false, message: msg };
  }
}

// Wait for new QR with polling
async function waitForNewQR(maxWaitMs = 20000): Promise<string | null> {
  const startTime = Date.now();
  const pollInterval = 2000;
  
  while (Date.now() - startTime < maxWaitMs) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${BRIDGE_URL}/qr`, {
        method: 'GET',
        headers: { 'x-bridge-secret': BRIDGE_SECRET },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const html = await response.text();
        const match = html.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/);
        if (match) {
          console.log('[Force Reset] Got new QR after', Date.now() - startTime, 'ms');
          return match[0];
        }
      }
    } catch {
      // Expected during restart, continue polling
    }
    
    await new Promise(resolve => setTimeout(resolve, pollInterval));
  }
  
  return null;
}

export async function POST(request: NextRequest) {
  console.log('[Force Reset] === Starting force reset process ===');
  
  const results: any = {
    cacheCleared: false,
    bridgeRestarted: false,
    newQR: null,
    timestamp: new Date().toISOString()
  };
  
  try {
    // Step 1: Clear local cache
    results.cacheCleared = clearQRCache();
    
    // Step 2: Try to restart bridge
    const restartResult = await restartBridgeWithForce();
    results.bridgeRestarted = restartResult.success;
    results.bridgeMessage = restartResult.message;
    
    // Step 3: If restart worked (or not), wait for new QR
    console.log('[Force Reset] Waiting for new QR...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Give bridge time to restart
    
    const newQR = await waitForNewQR(20000);
    results.newQR = newQR;
    
    if (newQR) {
      return NextResponse.json({
        success: true,
        message: 'Session reset complete! New QR code ready.',
        qr: newQR,
        details: results
      }, { status: 200 });
    }
    
    // If we couldn't get new QR, provide instructions
    return NextResponse.json({
      success: false,
      message: 'Cache cleared but bridge session could not be reset remotely.',
      instructions: [
        'The WhatsApp "Try again later" error is from WhatsApp servers, not our app.',
        'This happens when WhatsApp detects too many connection attempts.',
        '',
        '🔑 To fix this:',
        '1. On your phone, open WhatsApp',
        '2. Go to Settings → Linked Devices',
        '3. Remove ALL linked devices',
        '4. Wait 5-10 minutes',
        '5. Try scanning the QR again',
        '',
        '⚠️ If it still fails:',
        '• Wait 30 minutes before trying again',
        '• Make sure you\'re using the correct WhatsApp account',
        '• Check if WhatsApp is up to date on your phone'
      ],
      details: results
    }, { status: 200 });
    
  } catch (err) {
    console.error('[Force Reset] Unexpected error:', err);
    
    return NextResponse.json({
      success: false,
      error: err instanceof Error ? err.message : 'Unexpected error during reset',
      instructions: [
        'An error occurred while resetting the session.',
        'Please try again or contact support if the issue persists.'
      ],
      details: results
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  // GET just returns current status
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${BRIDGE_URL}/status`, {
      method: 'GET',
      headers: { 'x-bridge-secret': BRIDGE_SECRET },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    const status = await response.json().catch(() => ({ status: 'unknown' }));
    
    return NextResponse.json({
      bridge: BRIDGE_URL,
      status: status.status || 'unknown',
      connected: status.connected || false,
      hasCache: fs.existsSync(path.join(CACHE_DIR, 'latest-qr.html'))
    });
  } catch (err) {
    return NextResponse.json({
      bridge: BRIDGE_URL,
      status: 'unreachable',
      connected: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 503 });
  }
}
