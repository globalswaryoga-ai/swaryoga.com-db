/**
 * WhatsApp Connection Manager - Prevents Auto-Signout
 *
 * Problem: During 1-2 hour operations, WhatsApp session expires
 * Cause: No keepalive mechanism, connection times out
 * Solution: Heartbeat every 5 minutes + auto-reconnect on disconnect
 *
 * This prevents:
 * - Auto-signout mid-operation
 * - Cascading failed attempts
 * - Account ban from repeated failures
 */

interface SessionHealth {
  connected: boolean;
  lastHeartbeat: Date;
  heartbeatIntervalMs: number;
  reconnectAttempts: number;
  maxReconnectAttempts: number;
  status: 'healthy' | 'disconnected' | 'reconnecting' | 'failed';
  message: string;
}

/**
 * Check if session is still connected
 * Uses tenant-scoped GET /status. Never lists all sessions or falls back to
 * another tenant's connected account.
 */
export async function checkSessionHealth(
  userId: string,
  sessionKey: string,
  bridgeUrl: string,
  bridgeSecret: string
): Promise<SessionHealth> {
  try {
    const response = await fetch(`${bridgeUrl}/status`, {
      method: 'GET',
      headers: {
        'x-bridge-secret': bridgeSecret,
        'x-user-id': userId,
        'x-session-key': sessionKey,
        'x-tenant-id': sessionKey,
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!response.ok) {
      return {
        connected: false,
        lastHeartbeat: new Date(),
        heartbeatIntervalMs: 300000,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        status: 'disconnected',
        message: `❌ Bridge unreachable (HTTP ${response.status})`,
      };
    }

    const data = await response.json();
    if (data?.connected === true || data?.status === 'connected') {
      return {
        connected: true,
        lastHeartbeat: new Date(),
        heartbeatIntervalMs: 300000,
        reconnectAttempts: 0,
        maxReconnectAttempts: 5,
        status: 'healthy',
        message: `✅ Session ${sessionKey} connected (${data?.phone?.id || 'no phone'})`,
      };
    }
    const reconnecting = data?.status === 'connecting';
    return {
      connected: false,
      lastHeartbeat: new Date(),
      heartbeatIntervalMs: 300000,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      status: reconnecting ? 'reconnecting' : 'disconnected',
      message: reconnecting
        ? '🔄 WhatsApp session reconnecting — scan QR again if needed'
        : '❌ No WhatsApp session connected — scan QR code',
    };
  } catch (error) {
    return {
      connected: false,
      lastHeartbeat: new Date(),
      heartbeatIntervalMs: 300000,
      reconnectAttempts: 0,
      maxReconnectAttempts: 5,
      status: 'disconnected',
      message: `❌ Bridge unreachable: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Attempt to reconnect session
 * CRITICAL: Called when auto-signout detected
 */
export async function reconnectSession(
  userId: string,
  sessionKey: string,
  bridgeUrl: string,
  bridgeSecret: string,
  attemptNumber: number = 1
): Promise<{
  success: boolean;
  reconnected: boolean;
  message: string;
  newSessionKey?: string;
}> {
  try {
    const response = await fetch(`${bridgeUrl}/reconnect`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bridge-secret': bridgeSecret,
        'x-user-id': userId,
        'x-session-key': sessionKey,
        'x-tenant-id': sessionKey,
      },
      body: JSON.stringify({
        userId,
        sessionKey,
        attemptNumber,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return {
        success: false,
        reconnected: false,
        message: `❌ Reconnect failed (HTTP ${response.status})`,
      };
    }

    const data = await response.json();

    if (data.reconnected) {
      return {
        success: true,
        reconnected: true,
        message: '✅ Session reconnected successfully',
        newSessionKey: data.newSessionKey || sessionKey,
      };
    }

    return {
      success: false,
      reconnected: false,
      message: data.message || '❌ Reconnection failed',
    };
  } catch (error) {
    return {
      success: false,
      reconnected: false,
      message: `❌ Reconnect error: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Send heartbeat to keep session alive
 * CRITICAL: Call every 5 minutes during long operations
 *
 * Pattern:
 * - Operation starts → schedule heartbeat every 5 min
 * - Each heartbeat checks session health
 * - If disconnected → attempt reconnect
 * - If reconnect fails → pause operation
 * - When reconnected → resume operation
 */
export async function sendSessionHeartbeat(
  userId: string,
  sessionKey: string,
  bridgeUrl: string,
  bridgeSecret: string
): Promise<{
  alive: boolean;
  reconnectNeeded: boolean;
  message: string;
}> {
  try {
    // Check health
    const health = await checkSessionHealth(userId, sessionKey, bridgeUrl, bridgeSecret);

    if (health.connected) {
      console.log(`[Connection Manager] ✅ Heartbeat OK - Session alive`);
      return {
        alive: true,
        reconnectNeeded: false,
        message: '✅ Session alive',
      };
    }

    console.warn(
      `[Connection Manager] ⚠️ Auto-signout detected during operation. Attempting reconnect...`
    );

    // Attempt reconnect
    const reconnectResult = await reconnectSession(userId, sessionKey, bridgeUrl, bridgeSecret, 1);

    if (reconnectResult.reconnected) {
      console.log(`[Connection Manager] ✅ Successfully reconnected`);
      return {
        alive: true,
        reconnectNeeded: false,
        message: '✅ Reconnected successfully',
      };
    }

    console.error(`[Connection Manager] ❌ Reconnect failed`);
    return {
      alive: false,
      reconnectNeeded: true,
      message: '❌ Session lost. Manual reconnection needed.',
    };
  } catch (error) {
    console.error(`[Connection Manager] Heartbeat error:`, error);
    return {
      alive: false,
      reconnectNeeded: true,
      message: `❌ Heartbeat failed: ${error instanceof Error ? error.message : 'Unknown'}`,
    };
  }
}

/**
 * Get connection status for operation monitoring
 */
export async function getConnectionStatus(
  userId: string,
  sessionKey: string,
  bridgeUrl: string,
  bridgeSecret: string
): Promise<{
  status: 'healthy' | 'disconnected' | 'reconnecting';
  uptime: number; // seconds
  lastCheck: Date;
  recommendations: string[];
}> {
  const health = await checkSessionHealth(userId, sessionKey, bridgeUrl, bridgeSecret);

  const recommendations: string[] = [];

  if (!health.connected) {
    recommendations.push('🔴 Session disconnected - operation paused');
    recommendations.push('⚡ Attempting automatic reconnection...');
    recommendations.push('💡 If manual reconnect needed, visit QR code page');
  }

  if (health.connected) {
    recommendations.push('✅ Session healthy - operations resuming');
  }

  return {
    status: health.connected ? 'healthy' : 'disconnected',
    uptime: Date.now() - health.lastHeartbeat.getTime(),
    lastCheck: health.lastHeartbeat,
    recommendations,
  };
}

/**
 * Format connection issue for user display
 */
export function formatConnectionIssue(
  operationType: string,
  disconnectReason: string
): string {
  return `
⚠️ ${operationType} Operation Paused
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reason: ${disconnectReason}

What happened:
1. WhatsApp auto-signout detected during operation
2. System automatically paused the operation
3. Attempting to reconnect...

What to do:
- Wait 30 seconds for automatic reconnection
- If still disconnected: Go to QR code page to manually scan
- Once connected: Operation will resume automatically

Why this prevents bans:
- Stops operation when session dies
- Prevents cascading failed attempts
- Reconnects instead of spamming failed requests
- WhatsApp doesn't see repeated failures
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `.trim();
}

/**
 * Middleware for operations that need heartbeat
 * Usage: Wrap cron processor to add heartbeat checks
 */
export function createHeartbeatInterval(
  userId: string,
  sessionKey: string,
  bridgeUrl: string,
  bridgeSecret: string,
  intervalMs: number = 300000 // 5 minutes default
): {
  start: () => NodeJS.Timeout;
  stop: (timer: NodeJS.Timeout) => void;
} {
  return {
    start() {
      return setInterval(async () => {
        try {
          const result = await sendSessionHeartbeat(userId, sessionKey, bridgeUrl, bridgeSecret);
          console.log(`[Connection Manager] Heartbeat: ${result.message}`);
        } catch (error) {
          console.error(`[Connection Manager] Heartbeat error:`, error);
        }
      }, intervalMs);
    },

    stop(timer: NodeJS.Timeout) {
      clearInterval(timer);
    },
  };
}
