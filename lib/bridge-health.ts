/**
 * Bridge Health Check & Validation Utilities
 * Prevents 404 errors by validating bridge connectivity and response formats
 */

interface BridgeHealthStatus {
  ok: boolean;
  status: number;
  message: string;
  connected: boolean;
  endpoints: {
    [key: string]: boolean;
  };
}

const healthCheckCache = new Map<
  string,
  { result: BridgeHealthStatus; expiry: number }
>();
const HEALTH_CHECK_TTL_MS = 30 * 1000; // 30 second cache

/**
 * Check if a bridge URL is accessible and working
 * Returns cached result if available
 */
export async function checkBridgeHealth(
  bridgeUrl: string,
  bridgeSecret: string
): Promise<BridgeHealthStatus> {
  const cacheKey = `${bridgeUrl}:${bridgeSecret}`;
  const cached = healthCheckCache.get(cacheKey);

  if (cached && cached.expiry > Date.now()) {
    return cached.result;
  }

  const result: BridgeHealthStatus = {
    ok: false,
    status: 0,
    message: 'Unknown',
    connected: false,
    endpoints: {},
  };

  try {
    // Test basic connectivity
    const statusRes = await fetch(`${bridgeUrl}/status`, {
      method: 'GET',
      headers: {
        'x-bridge-secret': bridgeSecret,
      },
      signal: AbortSignal.timeout(5000),
    }).catch(() => null);

    if (!statusRes) {
      result.message = 'Bridge unreachable';
      result.status = 503;
      result.ok = false;
    } else if (statusRes.ok) {
      const data = await statusRes.json().catch(() => ({}));
      result.ok = true;
      result.status = 200;
      result.connected = data.connected || false;
      result.message = result.connected
        ? 'Bridge connected and ready'
        : 'Bridge running but WhatsApp not connected';
      result.endpoints = {
        status: true,
        chats: true,
        messages: true,
      };
    } else if (statusRes.status === 404) {
      result.message = 'Bridge endpoints not found (/status returns 404)';
      result.status = statusRes.status;
      result.ok = false;
    } else {
      result.message = `Bridge error: ${statusRes.status}`;
      result.status = statusRes.status;
      result.ok = false;
    }
  } catch (err) {
    result.message = err instanceof Error ? err.message : 'Unknown error';
    result.status = 500;
    result.ok = false;
  }

  // Cache the result
  healthCheckCache.set(cacheKey, {
    result,
    expiry: Date.now() + HEALTH_CHECK_TTL_MS,
  });

  return result;
}

/**
 * Validate that a bridge URL has proper format
 */
export function validateBridgeUrl(url: string): {
  valid: boolean;
  error?: string;
} {
  if (!url) {
    return { valid: false, error: 'Bridge URL is required' };
  }

  try {
    const urlObj = new URL(url);
    if (!urlObj.protocol.match(/^https?:/)) {
      return { valid: false, error: 'Bridge URL must use http or https' };
    }
    if (!urlObj.hostname) {
      return {
        valid: false,
        error: 'Bridge URL must have a valid hostname',
      };
    }
    return { valid: true };
  } catch (err) {
    return { valid: false, error: 'Invalid bridge URL format' };
  }
}

/**
 * Get helpful error message based on HTTP status and context
 */
export function getBridgeErrorMessage(
  status: number,
  path: string
): {
  userMessage: string;
  debugMessage: string;
} {
  const debugMessage = `Bridge returned ${status} for ${path}`;

  switch (status) {
    case 404:
      return {
        userMessage: `Endpoint not found on bridge: ${path}`,
        debugMessage,
      };
    case 503:
    case 502:
      return {
        userMessage:
          'WhatsApp bridge service is temporarily unavailable. Please try again in a moment.',
        debugMessage,
      };
    case 401:
    case 403:
      return {
        userMessage:
          'Bridge authentication failed. Please check your bridge configuration.',
        debugMessage,
      };
    case 400:
      return {
        userMessage: 'Invalid request format sent to bridge',
        debugMessage,
      };
    case 408:
      return {
        userMessage: 'Request to bridge timed out',
        debugMessage,
      };
    case 429:
      return {
        userMessage: 'Too many requests to bridge. Please slow down.',
        debugMessage,
      };
    default:
      return {
        userMessage: 'Bridge error occurred. Please try again.',
        debugMessage,
      };
  }
}

/**
 * Clear the health check cache (useful for testing or when bridge restarts)
 */
export function clearBridgeHealthCache(): void {
  healthCheckCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getBridgeHealthCacheStats(): {
  entries: number;
  maxAge: string;
} {
  return {
    entries: healthCheckCache.size,
    maxAge: `${HEALTH_CHECK_TTL_MS / 1000}s`,
  };
}
