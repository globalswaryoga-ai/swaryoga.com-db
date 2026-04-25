/**
 * QR Fallback Endpoint
 * Provides QR code with automatic retry and fallback mechanisms
 * Handles bridge crashes gracefully by:
 * - Attempting bridge fetch with retries
 * - Returning cached QR if available
 * - Auto-triggering bridge restart if down
 */

import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { getWhatsAppBridgeConfig } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';

const execAsync = promisify(exec);

const { url: BRIDGE_URL, secret: BRIDGE_SECRET } = getWhatsAppBridgeConfig();
const CACHE_DIR = path.join(process.cwd(), '.qr-cache');
const QR_CACHE_FILE = path.join(CACHE_DIR, 'latest-qr.html');


// Ensure cache directory exists
function ensureCacheDir() {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
  } catch (err) {
    console.error('[QR Fallback] Failed to create cache dir:', err);
  }
}

// Cache QR code
function cacheQR(qrHtml: string) {
  try {
    ensureCacheDir();
    fs.writeFileSync(QR_CACHE_FILE, qrHtml, 'utf-8');
    console.log('[QR Fallback] QR cached successfully');
  } catch (err) {
    console.error('[QR Fallback] Failed to cache QR:', err);
  }
}

// Retrieve cached QR
function getCachedQR(): string | null {
  try {
    if (fs.existsSync(QR_CACHE_FILE)) {
      const content = fs.readFileSync(QR_CACHE_FILE, 'utf-8');
      if (content && content.includes('data:image/png;base64')) {
        console.log('[QR Fallback] Retrieved cached QR');
        
        // If cached content is HTML, extract the data URL
        if (content.startsWith('<html') || content.startsWith('<!DOCTYPE')) {
          const match = content.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/);
          if (match) {
            return match[0];
          }
        }
        
        // If it's already a clean data URL, return it
        if (content.startsWith('data:image/png;base64')) {
          return content;
        }
        
        return content;
      }
    }
  } catch (err) {
    console.error('[QR Fallback] Failed to read cache:', err);
  }
  return null;
}

// Attempt to restart bridge via SSH
async function restartBridgeViaSSH() {
  try {
    console.log('[QR Fallback] Attempting to restart bridge via API...');
    const restartUrl = new URL('/api/admin/crm/whatsapp/bridge-control', process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');
    
    const restartResponse = await fetch(restartUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'restart' })
    });
    
    if (restartResponse.ok) {
      console.log('[QR Fallback] Bridge restart triggered');
      return true;
    }
  } catch (err) {
    console.error('[QR Fallback] Failed to trigger restart:', err);
  }
  return false;
}

// Fetch QR with retries
async function fetchQRWithRetries(retries = 3): Promise<string | null> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`[QR Fallback] Attempt ${attempt}/${retries} to fetch QR from bridge...`);
      
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000); // 8 second timeout
      
      const response = await fetch(`${BRIDGE_URL}/qr`, {
        method: 'GET',
        headers: {
          'x-bridge-secret': BRIDGE_SECRET,
          'Accept': 'text/html,application/json',
          'User-Agent': 'SwarYoga-QR-Fallback'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeout);
      
      if (response.ok) {
        const html = await response.text();
        if (html && html.includes('data:image/png;base64')) {
          console.log('[QR Fallback] Successfully fetched QR from bridge');
          
          // Extract the data URL from the HTML
          const match = html.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/);
          if (match) {
            const dataUrl = match[0];
            console.log('[QR Fallback] Extracted QR data URL (length:', dataUrl.length, ')');
            cacheQR(dataUrl); // Cache the clean data URL
            return dataUrl;
          }
          
          // If extraction failed, cache full HTML as fallback
          cacheQR(html);
          return html;
        }
      }
      
      console.warn(`[QR Fallback] Attempt ${attempt} failed: HTTP ${response.status}`);
    } catch (err) {
      console.warn(`[QR Fallback] Attempt ${attempt} error:`, err instanceof Error ? err.message : 'Unknown error');
      
      // If bridge is down, trigger restart
      if (attempt === Math.ceil(retries / 2)) {
        console.log('[QR Fallback] Bridge appears to be down, triggering restart...');
        await restartBridgeViaSSH();
      }
    }
    
    // Wait before retry (exponential backoff)
    if (attempt < retries) {
      const waitTime = Math.min(1000 * Math.pow(1.5, attempt - 1), 5000);
      console.log(`[QR Fallback] Waiting ${waitTime}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }
  
  return null;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const useCacheOnly = searchParams.get('cacheOnly') === 'true';
    
    // Try to fetch from bridge
    let qrHtml = await fetchQRWithRetries(3);
    
    // If bridge fails, try cache
    if (!qrHtml) {
      console.log('[QR Fallback] Bridge unavailable, checking cache...');
      qrHtml = getCachedQR();
      
      if (qrHtml) {
        return NextResponse.json(
          {
            qr: qrHtml,
            source: 'cache',
            warning: 'Bridge is unavailable. Using cached QR code. Try reconnecting.',
            bridgeStatus: 'offline'
          },
          { status: 200 }
        );
      }
      
      // No cache and no bridge
      return NextResponse.json(
        {
          error: 'Bridge unavailable and no cached QR',
          source: 'none',
          bridgeStatus: 'offline',
          message: 'WhatsApp bridge is temporarily offline. Please wait and try again in a moment.'
        },
        { status: 503 }
      );
    }
    
    // Success - bridge is responding
    return NextResponse.json(
      {
        qr: qrHtml,
        source: 'bridge',
        bridgeStatus: 'online'
      },
      { status: 200 }
    );
    
  } catch (err) {
    console.error('[QR Fallback] Unexpected error:', err);
    
    // Last resort: return cached QR
    const cachedQR = getCachedQR();
    if (cachedQR) {
      return NextResponse.json(
        {
          qr: cachedQR,
          source: 'cache-fallback',
          error: 'Bridge error occurred',
          bridgeStatus: 'unknown'
        },
        { status: 200 }
      );
    }
    
    return NextResponse.json(
      {
        error: 'Unable to retrieve QR code',
        bridgeStatus: 'unknown'
      },
      { status: 500 }
    );
  }
}
