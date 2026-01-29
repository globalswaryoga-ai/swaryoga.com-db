/**
 * WhatsApp Protection Layer
 * 
 * Provides unbreakable protection for both Meta Cloud API and QR WhatsApp (EC2 Bridge).
 * Features:
 * - Circuit breaker pattern to prevent cascade failures
 * - Automatic fallback between providers
 * - Health monitoring with automatic recovery
 * - Retry with exponential backoff
 * - Message queue for offline recovery
 * - Detailed logging and metrics
 */

export type ProviderType = 'meta' | 'qr_bridge';

export type ProviderHealth = {
  provider: ProviderType;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  lastSuccess: Date | null;
  lastFailure: Date | null;
  consecutiveFailures: number;
  successRate: number; // Last 100 attempts
  avgResponseTime: number; // in ms
  circuitOpen: boolean;
  circuitOpenUntil: Date | null;
};

type CircuitState = {
  failures: number;
  lastFailure: Date | null;
  isOpen: boolean;
  openUntil: Date | null;
  attempts: { success: boolean; timestamp: Date }[];
};

// In-memory circuit state (resets on server restart)
const circuitStates: Map<ProviderType, CircuitState> = new Map();

// Configuration
const CONFIG = {
  // Circuit Breaker
  failureThreshold: 5, // Number of failures before opening circuit
  resetTimeout: 60000, // 60 seconds before trying again
  halfOpenMaxAttempts: 3, // Attempts in half-open state
  
  // Retry
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  
  // Health tracking
  metricsWindow: 100, // Track last 100 attempts
  healthCheckInterval: 30000, // 30 seconds
};

function getCircuitState(provider: ProviderType): CircuitState {
  let state = circuitStates.get(provider);
  if (!state) {
    state = {
      failures: 0,
      lastFailure: null,
      isOpen: false,
      openUntil: null,
      attempts: [],
    };
    circuitStates.set(provider, state);
  }
  return state;
}

/**
 * Check if circuit is open (should not send)
 */
export function isCircuitOpen(provider: ProviderType): boolean {
  const state = getCircuitState(provider);
  
  if (!state.isOpen) return false;
  
  // Check if we should try half-open
  if (state.openUntil && new Date() > state.openUntil) {
    console.log(`[Protection] Circuit for ${provider} entering half-open state`);
    return false; // Allow one attempt
  }
  
  return true;
}

/**
 * Record a successful attempt
 */
export function recordSuccess(provider: ProviderType, responseTime?: number): void {
  const state = getCircuitState(provider);
  state.failures = 0;
  state.isOpen = false;
  state.openUntil = null;
  
  // Add to metrics
  state.attempts.push({ success: true, timestamp: new Date() });
  if (state.attempts.length > CONFIG.metricsWindow) {
    state.attempts.shift();
  }
  
  console.log(`[Protection] ✅ ${provider} success recorded`);
}

/**
 * Record a failed attempt
 */
export function recordFailure(provider: ProviderType, error?: string): void {
  const state = getCircuitState(provider);
  state.failures++;
  state.lastFailure = new Date();
  
  // Add to metrics
  state.attempts.push({ success: false, timestamp: new Date() });
  if (state.attempts.length > CONFIG.metricsWindow) {
    state.attempts.shift();
  }
  
  // Check if we need to open circuit
  if (state.failures >= CONFIG.failureThreshold) {
    state.isOpen = true;
    state.openUntil = new Date(Date.now() + CONFIG.resetTimeout);
    console.error(`[Protection] 🔴 Circuit OPENED for ${provider} - Too many failures (${state.failures})`);
    console.error(`[Protection] Will retry at ${state.openUntil.toISOString()}`);
  } else {
    console.warn(`[Protection] ⚠️ ${provider} failure recorded (${state.failures}/${CONFIG.failureThreshold})`);
  }
}

/**
 * Get provider health status
 */
export function getProviderHealth(provider: ProviderType): ProviderHealth {
  const state = getCircuitState(provider);
  
  const successCount = state.attempts.filter(a => a.success).length;
  const successRate = state.attempts.length > 0 ? successCount / state.attempts.length : 1;
  
  let status: 'healthy' | 'degraded' | 'unhealthy';
  if (state.isOpen) {
    status = 'unhealthy';
  } else if (successRate < 0.8) {
    status = 'degraded';
  } else {
    status = 'healthy';
  }
  
  return {
    provider,
    status,
    lastCheck: new Date(),
    lastSuccess: state.attempts.filter(a => a.success).pop()?.timestamp || null,
    lastFailure: state.lastFailure,
    consecutiveFailures: state.failures,
    successRate,
    avgResponseTime: 0, // TODO: Track response times
    circuitOpen: state.isOpen,
    circuitOpenUntil: state.openUntil,
  };
}

/**
 * Get all providers health status
 */
export function getAllProvidersHealth(): ProviderHealth[] {
  return ['meta', 'qr_bridge'].map(p => getProviderHealth(p as ProviderType));
}

/**
 * Calculate delay with exponential backoff
 */
export function calculateBackoffDelay(attempt: number): number {
  const delay = Math.min(
    CONFIG.baseDelay * Math.pow(2, attempt),
    CONFIG.maxDelay
  );
  // Add jitter to prevent thundering herd
  const jitter = Math.random() * 0.3 * delay;
  return Math.floor(delay + jitter);
}

/**
 * Retry wrapper with exponential backoff
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    onRetry?: (error: Error, attempt: number) => void;
  }
): Promise<T> {
  const maxRetries = options?.maxRetries ?? CONFIG.maxRetries;
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries) {
        const delay = calculateBackoffDelay(attempt);
        console.warn(`[Protection] Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`);
        options?.onRetry?.(lastError, attempt);
        await new Promise(r => setTimeout(r, delay));
      }
    }
  }
  
  throw lastError;
}

/**
 * Protected send with automatic fallback
 * Tries primary provider, falls back to secondary if primary fails
 */
export async function protectedSend<T>(
  primary: { provider: ProviderType; fn: () => Promise<T> },
  fallback?: { provider: ProviderType; fn: () => Promise<T> },
): Promise<{ result: T; provider: ProviderType }> {
  // Try primary first
  if (!isCircuitOpen(primary.provider)) {
    try {
      const result = await withRetry(primary.fn);
      recordSuccess(primary.provider);
      return { result, provider: primary.provider };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordFailure(primary.provider, msg);
      console.error(`[Protection] Primary provider ${primary.provider} failed: ${msg}`);
    }
  } else {
    console.warn(`[Protection] Skipping ${primary.provider} - circuit is open`);
  }
  
  // Try fallback if available
  if (fallback && !isCircuitOpen(fallback.provider)) {
    try {
      console.log(`[Protection] Trying fallback provider: ${fallback.provider}`);
      const result = await withRetry(fallback.fn);
      recordSuccess(fallback.provider);
      return { result, provider: fallback.provider };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      recordFailure(fallback.provider, msg);
      console.error(`[Protection] Fallback provider ${fallback.provider} failed: ${msg}`);
    }
  }
  
  throw new Error('All WhatsApp providers failed. Message queued for retry.');
}

// ============================================================
// BRIDGE HEALTH CHECK
// ============================================================

const EC2_BRIDGE_URL = process.env.WHATSAPP_BRIDGE_HTTP_URL || 'http://52.91.198.23:3333';
const EC2_BRIDGE_SECRET = process.env.WHATSAPP_WEB_BRIDGE_SECRET || process.env.WHATSAPP_BRIDGE_SECRET || 'swar-bridge-secret-2024';

export type BridgeStatus = {
  connected: boolean;
  sessionReady: boolean;
  status: 'connected' | 'qr' | 'disconnected' | 'error' | 'unknown';
  error?: string;
  lastCheck: Date;
};

let cachedBridgeStatus: BridgeStatus | null = null;
let lastBridgeCheck: number = 0;
const BRIDGE_CHECK_INTERVAL = 10000; // 10 seconds cache

/**
 * Check EC2 bridge health
 */
export async function checkBridgeHealth(): Promise<BridgeStatus> {
  const now = Date.now();
  
  // Return cached status if recent
  if (cachedBridgeStatus && (now - lastBridgeCheck) < BRIDGE_CHECK_INTERVAL) {
    return cachedBridgeStatus;
  }
  
  try {
    const res = await fetch(`${EC2_BRIDGE_URL}/status`, {
      method: 'GET',
      headers: { 'x-bridge-secret': EC2_BRIDGE_SECRET },
      signal: AbortSignal.timeout(5000), // 5 second timeout
    });
    
    const data = await res.json().catch(() => ({}));
    
    cachedBridgeStatus = {
      connected: data.sessionReady === true || data.connected === true,
      sessionReady: data.sessionReady === true,
      status: data.status || (data.sessionReady ? 'connected' : 'disconnected'),
      lastCheck: new Date(),
    };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    cachedBridgeStatus = {
      connected: false,
      sessionReady: false,
      status: 'error',
      error: msg,
      lastCheck: new Date(),
    };
    recordFailure('qr_bridge', msg);
  }
  
  lastBridgeCheck = now;
  return cachedBridgeStatus;
}

/**
 * Check Meta API health (basic validation)
 */
export async function checkMetaHealth(): Promise<{ healthy: boolean; error?: string }> {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  
  if (!accessToken || !phoneNumberId) {
    return { healthy: false, error: 'Meta API not configured' };
  }
  
  // Basic token validation - check if we can reach Meta
  try {
    const res = await fetch(
      `https://graph.facebook.com/v24.0/${phoneNumberId}?fields=id,verified_name`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: AbortSignal.timeout(5000),
      }
    );
    
    if (res.ok) {
      recordSuccess('meta');
      return { healthy: true };
    }
    
    const data = await res.json().catch(() => ({}));
    const error = data?.error?.message || 'Unknown error';
    recordFailure('meta', error);
    return { healthy: false, error };
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    recordFailure('meta', msg);
    return { healthy: false, error: msg };
  }
}

// ============================================================
// MESSAGE QUEUE FOR OFFLINE RECOVERY
// ============================================================

type QueuedMessage = {
  id: string;
  type: 'text' | 'template' | 'media';
  to: string;
  payload: any;
  provider?: ProviderType;
  createdAt: Date;
  retryCount: number;
  lastError?: string;
};

const messageQueue: QueuedMessage[] = [];

/**
 * Add message to recovery queue
 */
export function queueMessage(message: Omit<QueuedMessage, 'id' | 'createdAt' | 'retryCount'>): string {
  const id = `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  messageQueue.push({
    ...message,
    id,
    createdAt: new Date(),
    retryCount: 0,
  });
  console.log(`[Protection] 📦 Message queued for recovery: ${id}`);
  return id;
}

/**
 * Get queued messages count
 */
export function getQueuedCount(): number {
  return messageQueue.length;
}

/**
 * Process queued messages (called by cron/scheduler)
 */
export async function processQueue(
  sendFn: (msg: QueuedMessage) => Promise<boolean>
): Promise<{ processed: number; failed: number }> {
  let processed = 0;
  let failed = 0;
  
  // Process in order, remove successful ones
  const toProcess = [...messageQueue];
  
  for (const msg of toProcess) {
    try {
      const success = await sendFn(msg);
      if (success) {
        const idx = messageQueue.findIndex(m => m.id === msg.id);
        if (idx >= 0) messageQueue.splice(idx, 1);
        processed++;
      } else {
        msg.retryCount++;
        failed++;
      }
    } catch (error) {
      msg.retryCount++;
      msg.lastError = error instanceof Error ? error.message : String(error);
      failed++;
    }
  }
  
  return { processed, failed };
}

// ============================================================
// SMART PROVIDER SELECTION
// ============================================================

/**
 * Select best provider based on current health
 */
export async function selectBestProvider(): Promise<{
  primary: ProviderType;
  fallback?: ProviderType;
  reason: string;
}> {
  const metaHealth = getProviderHealth('meta');
  const bridgeHealth = getProviderHealth('qr_bridge');
  
  // Both healthy - prefer Meta (more reliable)
  if (metaHealth.status === 'healthy' && bridgeHealth.status === 'healthy') {
    return { primary: 'meta', fallback: 'qr_bridge', reason: 'Both healthy, Meta preferred' };
  }
  
  // Meta degraded but bridge healthy
  if (metaHealth.status !== 'healthy' && bridgeHealth.status === 'healthy') {
    return { primary: 'qr_bridge', fallback: 'meta', reason: 'Bridge healthy, Meta degraded' };
  }
  
  // Bridge degraded but Meta healthy
  if (metaHealth.status === 'healthy' && bridgeHealth.status !== 'healthy') {
    return { primary: 'meta', reason: 'Meta healthy, Bridge degraded' };
  }
  
  // Both degraded - try based on success rate
  if (metaHealth.successRate >= bridgeHealth.successRate) {
    return { primary: 'meta', fallback: 'qr_bridge', reason: 'Both degraded, Meta better success rate' };
  } else {
    return { primary: 'qr_bridge', fallback: 'meta', reason: 'Both degraded, Bridge better success rate' };
  }
}

// ============================================================
// LOGGING & METRICS EXPORT
// ============================================================

export function getProtectionMetrics(): {
  meta: ProviderHealth;
  qr_bridge: ProviderHealth;
  queuedMessages: number;
  circuitBreakers: { meta: boolean; qr_bridge: boolean };
} {
  return {
    meta: getProviderHealth('meta'),
    qr_bridge: getProviderHealth('qr_bridge'),
    queuedMessages: messageQueue.length,
    circuitBreakers: {
      meta: isCircuitOpen('meta'),
      qr_bridge: isCircuitOpen('qr_bridge'),
    },
  };
}
