/**
 * Auto Config — runtime settings loader with in-memory caching.
 *
 * Settings are stored in MongoDB (`auto_config` collection) and cached for
 * `CACHE_TTL_MS` so every inbound webhook doesn't hit the DB.
 *
 * Usage:
 *   const cfg = await loadAutoConfig();
 *   if (cfg.chatbotEnabled) { ... }
 */

import { connectDB } from '@/lib/db';
import { getAutoConfig } from '@/lib/schemas/enterpriseSchemas';

// ---- Types ----
export interface AutoConfigDoc {
  chatbotEnabled: boolean;

  welcomeEnabled: boolean;
  welcomeMessage: string;

  workingHoursEnabled: boolean;
  workingHoursStart: string;
  workingHoursEnd: string;
  workingHoursTimezone: string;
  offHoursMessage: string;

  kbAutoReplyEnabled: boolean;
  kbMinConfidence: number;

  aiAgentEnabled: boolean;
  aiModel: string;
  aiSystemPrompt: string;
  aiMaxTokens: number;

  autoAssignEnabled: boolean;
  autoAssignStrategy: 'round-robin' | 'least-active' | 'manual';

  autoBroadcastEnabled: boolean;

  autoCloseEnabled: boolean;
  autoCloseMinutes: number;
  autoCloseMessage: string;

  notifyOnNewLead: boolean;
  notifyOnOffHoursMessage: boolean;
  notifyEmail: string;

  rateLimitEnabled: boolean;
  rateLimitMaxPerMinute: number;

  updatedBy?: string;
  metadata?: any;
}

// ---- Default values (used when no document exists) ----
const DEFAULTS: AutoConfigDoc = {
  chatbotEnabled: true,
  welcomeEnabled: true,
  welcomeMessage: 'नमस्ते 🙏 Swar Yoga में आपका स्वागत है!\n\nHow can I help you today?',
  workingHoursEnabled: false,
  workingHoursStart: '09:00',
  workingHoursEnd: '18:00',
  workingHoursTimezone: 'Asia/Kolkata',
  offHoursMessage: 'We are currently offline. Our team will respond during business hours (9 AM - 6 PM IST). 🙏',
  kbAutoReplyEnabled: true,
  kbMinConfidence: 0.6,
  aiAgentEnabled: false,
  aiModel: 'gpt-4o-mini',
  aiSystemPrompt: 'You are a helpful assistant for Swar Yoga. Be friendly, concise, and professional.',
  aiMaxTokens: 250,
  autoAssignEnabled: true,
  autoAssignStrategy: 'round-robin',
  autoBroadcastEnabled: true,
  autoCloseEnabled: false,
  autoCloseMinutes: 1440,
  autoCloseMessage: 'This chat has been closed due to inactivity. Feel free to message us again! 🙏',
  notifyOnNewLead: true,
  notifyOnOffHoursMessage: true,
  notifyEmail: '',
  rateLimitEnabled: false,
  rateLimitMaxPerMinute: 30,
};

// ---- In-memory cache ----
const CACHE_TTL_MS = 60_000; // 1 minute
let _cache: AutoConfigDoc | null = null;
let _cacheAt = 0;

/**
 * Load auto-config from DB (or cache). Returns a plain object.
 */
export async function loadAutoConfig(): Promise<AutoConfigDoc> {
  const now = Date.now();
  if (_cache !== null && now - _cacheAt < CACHE_TTL_MS) {
    return _cache!;
  }

  try {
    await connectDB();
    const AutoConfig = getAutoConfig();
    const doc = await AutoConfig.findOne({ key: 'auto_config' }).lean();

    if (doc) {
      _cache = { ...DEFAULTS, ...(doc as any) };
    } else {
      _cache = { ...DEFAULTS };
    }
    _cacheAt = now;
    return _cache as AutoConfigDoc;
  } catch (err) {
    console.error('[AutoConfig] Failed to load, using defaults:', err);
    return { ...DEFAULTS };
  }
}

/**
 * Force-bust the in-memory cache (call after saving new settings).
 */
export function bustAutoConfigCache(): void {
  _cache = null;
  _cacheAt = 0;
}

/**
 * Check if we're currently within working hours based on auto-config.
 */
export async function isWithinWorkingHours(): Promise<{
  withinHours: boolean;
  offHoursMessage?: string;
}> {
  const cfg = await loadAutoConfig();

  if (!cfg.workingHoursEnabled) {
    return { withinHours: true };
  }

  const tz = cfg.workingHoursTimezone || 'Asia/Kolkata';
  const now = new Date();

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const currentTime = formatter.format(now); // "14:30"

  const start = cfg.workingHoursStart || '09:00';
  const end = cfg.workingHoursEnd || '18:00';

  if (currentTime < start || currentTime > end) {
    return {
      withinHours: false,
      offHoursMessage: cfg.offHoursMessage,
    };
  }

  return { withinHours: true };
}
