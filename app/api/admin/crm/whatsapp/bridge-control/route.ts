/**
 * Bridge Control & Auto-Repair API
 * Allows manual restart and auto-healing of bridge issues
 */

import { NextRequest, NextResponse } from 'next/server';
import { execSync } from 'child_process';
import { verifyToken } from '@/lib/auth';
import { isSuperAdmin } from '@/lib/crm-handlers';
import { getWhatsAppBridgeUrl } from '@/lib/whatsappBridgeConfig';

export const dynamic = 'force-dynamic';

function requireSuperAdmin(request: NextRequest) {
  const token = request.headers.get('authorization')?.slice('Bearer '.length);
  const decoded = verifyToken(token);
  if (!decoded?.isAdmin || !isSuperAdmin(decoded)) {
    return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
  }
  return null;
}

const BRIDGE_URL = getWhatsAppBridgeUrl();

async function checkBridgeStatus(): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BRIDGE_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
    });

    clearTimeout(timeout);
    return response.ok || response.status === 404; // 404 means bridge is responding
  } catch {
    return false;
  }
}

async function restartBridgeService(): Promise<{ success: boolean; message: string }> {
  try {
    // Try Docker first
    try {
      execSync('docker restart whatsapp-bridge 2>/dev/null', { stdio: 'pipe' });
      return { success: true, message: '✅ Docker container restarted' };
    } catch (err) {
      console.log('Docker restart attempt failed');
    }

    // Try systemd
    try {
      execSync('systemctl restart whatsapp-bridge 2>/dev/null', { stdio: 'pipe' });
      return { success: true, message: '✅ Service restarted via systemd' };
    } catch (err) {
      console.log('Systemd restart attempt failed');
    }

    // Try PM2
    try {
      execSync('pm2 restart whatsapp-bridge 2>/dev/null', { stdio: 'pipe' });
      return { success: true, message: '✅ Process restarted via PM2' };
    } catch (err) {
      console.log('PM2 restart attempt failed');
    }

    return { success: false, message: '❌ Unable to restart bridge via Docker, systemd, or PM2' };
  } catch (err) {
    return {
      success: false,
      message: `Error during restart: ${err instanceof Error ? err.message : 'Unknown error'}`,
    };
  }
}

export async function POST(request: NextRequest) {
  const authErr = requireSuperAdmin(request);
  if (authErr) return authErr;
  try {
    const { action } = await request.json();

    if (action === 'status') {
      const isHealthy = await checkBridgeStatus();
      return NextResponse.json({
        bridgeRunning: isHealthy,
        bridgeUrl: BRIDGE_URL,
        timestamp: new Date().toISOString(),
      });
    }

    if (action === 'restart') {
      const result = await restartBridgeService();

      if (result.success) {
        // Wait a bit for service to start
        await new Promise((resolve) => setTimeout(resolve, 3000));

        // Verify bridge is running
        const isHealthy = await checkBridgeStatus();
        return NextResponse.json({
          success: true,
          message: result.message,
          bridgeRunning: isHealthy,
          timestamp: new Date().toISOString(),
        });
      } else {
        return NextResponse.json({ success: false, message: result.message }, { status: 500 });
      }
    }

    if (action === 'auto-repair') {
      const isHealthy = await checkBridgeStatus();

      if (!isHealthy) {
        const result = await restartBridgeService();
        return NextResponse.json({
          action: 'auto-repair',
          bridgeWasDown: true,
          repaired: result.success,
          message: result.message,
          timestamp: new Date().toISOString(),
        });
      }

      return NextResponse.json({
        action: 'auto-repair',
        bridgeWasDown: false,
        message: 'Bridge is already healthy',
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: status, restart, or auto-repair' },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const authErr = requireSuperAdmin(request);
  if (authErr) return authErr;
  try {
    const action = request.nextUrl.searchParams.get('action');

    if (action === 'status') {
      const isHealthy = await checkBridgeStatus();
      return NextResponse.json({
        bridgeRunning: isHealthy,
        bridgeUrl: BRIDGE_URL,
        timestamp: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use: ?action=status' },
      { status: 400 }
    );
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
