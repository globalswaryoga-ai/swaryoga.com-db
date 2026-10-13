import crypto from 'crypto';
import { bunnyBatch, bunnyExecute } from '@/lib/bunnyDatabase';

export interface SadhanaScheduleItem {
  _id: string;
  id: string;
  name: string;
  botName: string;
  chatMessages: Array<{ message: string; delayMinutes: number }>;
  enableAiChatReplies: boolean;
  videoUrl: string;
  videoDuration: number;
  botJoinMinutes: number;
  autoCloseMinutes: number;
  zoomLink?: string;
  zoomId?: string;
  zoomPassword?: string;
  zoomMeetingId?: string;
  enableBotAutomation: boolean;
  schedule: {
    times: string[];
    days: number[];
    repeatFrequency: 'daily' | 'weekly' | 'monthly';
    startDate?: string;
    timezone: string;
  };
  status: 'active' | 'paused';
  userId?: string;
  tenantId?: string;
  lastTriggeredSlot?: string;
  activeBotSession?: {
    meetingId: string;
    meetingPassword?: string;
    startedAt: string;
    closeAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

const idGen = () => crypto.randomUUID();
const nowIso = () => new Date().toISOString();
const jsonStr = (val: unknown, fallback: unknown) => JSON.stringify(val ?? fallback);
const parseJson = <T>(val: unknown, fallback: T): T => {
  try {
    return val ? (JSON.parse(String(val)) as T) : fallback;
  } catch {
    return fallback;
  }
};
const boolVal = (val: unknown) => val === true || val === 1 || val === '1' || val === 'true';

export async function initSadhanaSchedulerBunnySchema() {
  await bunnyBatch([
    {
      sql: `CREATE TABLE IF NOT EXISTS crm_sadhana_schedules_sql (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        bot_name TEXT NOT NULL DEFAULT 'Swar Sadhana',
        video_url TEXT NOT NULL,
        video_duration INTEGER NOT NULL DEFAULT 40,
        bot_join_minutes INTEGER NOT NULL DEFAULT 5,
        auto_close_minutes INTEGER NOT NULL DEFAULT 40,
        chat_messages_json TEXT NOT NULL DEFAULT '[]',
        enable_ai_chat_replies INTEGER NOT NULL DEFAULT 0,
        zoom_link TEXT,
        zoom_id TEXT,
        zoom_password TEXT,
        zoom_meeting_id TEXT,
        enable_bot_automation INTEGER NOT NULL DEFAULT 1,
        schedule_times_json TEXT NOT NULL DEFAULT '[]',
        schedule_days_json TEXT NOT NULL DEFAULT '[]',
        schedule_repeat_frequency TEXT NOT NULL DEFAULT 'weekly',
        schedule_start_date TEXT,
        schedule_timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
        status TEXT NOT NULL DEFAULT 'active',
        user_id TEXT,
        tenant_id TEXT,
        last_triggered_slot TEXT,
        active_bot_session_json TEXT,
        participant_emails_json TEXT NOT NULL DEFAULT '[]',
        participant_phones_json TEXT NOT NULL DEFAULT '[]',
        enable_email_reminders INTEGER NOT NULL DEFAULT 0,
        enable_whatsapp_reminders INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
      )`,
      args: [],
    },
  ]);

  try {
    await bunnyExecute({ sql: 'ALTER TABLE crm_sadhana_schedules_sql ADD COLUMN participant_emails_json TEXT DEFAULT "[]"' });
  } catch {}
  try {
    await bunnyExecute({ sql: 'ALTER TABLE crm_sadhana_schedules_sql ADD COLUMN participant_phones_json TEXT DEFAULT "[]"' });
  } catch {}
  try {
    await bunnyExecute({ sql: 'ALTER TABLE crm_sadhana_schedules_sql ADD COLUMN enable_email_reminders INTEGER DEFAULT 0' });
  } catch {}
  try {
    await bunnyExecute({ sql: 'ALTER TABLE crm_sadhana_schedules_sql ADD COLUMN enable_whatsapp_reminders INTEGER DEFAULT 0' });
  } catch {}
}

function mapScheduleRow(row: any): SadhanaScheduleItem | null {
  if (!row) return null;
  return {
    _id: String(row.id),
    id: String(row.id),
    name: String(row.name || ''),
    botName: String(row.bot_name || 'Swar Sadhana'),
    chatMessages: parseJson(row.chat_messages_json, []),
    enableAiChatReplies: boolVal(row.enable_ai_chat_replies),
    videoUrl: String(row.video_url || ''),
    videoDuration: Number(row.video_duration) || 40,
    botJoinMinutes: Number(row.bot_join_minutes) || 5,
    autoCloseMinutes: Number(row.auto_close_minutes) || 40,
    zoomLink: row.zoom_link || '',
    zoomId: row.zoom_id || '',
    zoomPassword: row.zoom_password || '',
    zoomMeetingId: row.zoom_meeting_id || '',
    enableBotAutomation: boolVal(row.enable_bot_automation),
    participantEmails: parseJson(row.participant_emails_json, []),
    participantPhones: parseJson(row.participant_phones_json, []),
    enableEmailReminders: boolVal(row.enable_email_reminders),
    enableWhatsAppReminders: boolVal(row.enable_whatsapp_reminders),
    schedule: {
      times: parseJson(row.schedule_times_json, []),
      days: parseJson(row.schedule_days_json, []),
      repeatFrequency: row.schedule_repeat_frequency || 'weekly',
      startDate: row.schedule_start_date || undefined,
      timezone: row.schedule_timezone || 'Asia/Kolkata',
    },
    status: (row.status === 'paused' ? 'paused' : 'active') as 'active' | 'paused',
    userId: row.user_id || undefined,
    tenantId: row.tenant_id || undefined,
    lastTriggeredSlot: row.last_triggered_slot || undefined,
    activeBotSession: parseJson(row.active_bot_session_json, undefined),
    createdAt: row.created_at || nowIso(),
    updatedAt: row.updated_at || nowIso(),
  };
}

export async function listSadhanaSchedules(filter: any = {}): Promise<SadhanaScheduleItem[]> {
  await initSadhanaSchedulerBunnySchema();
  let sql = 'SELECT * FROM crm_sadhana_schedules_sql';
  const args: any[] = [];
  const wheres: string[] = [];

  if (filter.status) {
    wheres.push('status = ?');
    args.push(filter.status);
  }
  if (filter.userId) {
    wheres.push('(user_id = ? OR user_id IS NULL)');
    args.push(filter.userId);
  }

  if (wheres.length > 0) sql += ' WHERE ' + wheres.join(' AND ');
  sql += ' ORDER BY created_at DESC';

  const r = await bunnyExecute({ sql, args });
  return r.rows.map(mapScheduleRow).filter(Boolean) as SadhanaScheduleItem[];
}

export async function getSadhanaSchedule(id: string): Promise<SadhanaScheduleItem | null> {
  await initSadhanaSchedulerBunnySchema();
  const r = await bunnyExecute({
    sql: 'SELECT * FROM crm_sadhana_schedules_sql WHERE id = ? LIMIT 1',
    args: [id],
  });
  return mapScheduleRow(r.rows[0]);
}

export async function createSadhanaSchedule(data: any): Promise<SadhanaScheduleItem> {
  await initSadhanaSchedulerBunnySchema();
  const sid = data.id || idGen();
  const scheduleTimes = data.schedule?.times || data.times || [];
  const scheduleDays = data.schedule?.days || data.days || [0, 1, 2, 3, 4, 5, 6];
  const scheduleRepeat = data.schedule?.repeatFrequency || data.repeatFrequency || 'weekly';
  const scheduleStartDate = data.schedule?.startDate || data.startDate || null;
  const scheduleTz = data.schedule?.timezone || data.timezone || 'Asia/Kolkata';

  await bunnyExecute({
    sql: `INSERT INTO crm_sadhana_schedules_sql (
      id, name, bot_name, video_url, video_duration, bot_join_minutes, auto_close_minutes,
      chat_messages_json, enable_ai_chat_replies, zoom_link, zoom_id, zoom_password, zoom_meeting_id,
      enable_bot_automation, schedule_times_json, schedule_days_json, schedule_repeat_frequency,
      schedule_start_date, schedule_timezone, status, user_id, tenant_id, last_triggered_slot,
      active_bot_session_json, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      sid,
      String(data.name || '').slice(0, 120),
      data.botName || 'Swar Sadhana',
      data.videoUrl || '',
      Number(data.videoDuration) || 40,
      Number(data.botJoinMinutes) || 5,
      Number(data.autoCloseMinutes || data.videoDuration) || 40,
      jsonStr(data.chatMessages, []),
      data.enableAiChatReplies ? 1 : 0,
      data.zoomLink || null,
      data.zoomId || null,
      data.zoomPassword || null,
      data.zoomMeetingId || null,
      data.enableBotAutomation === false ? 0 : 1,
      jsonStr(scheduleTimes, []),
      jsonStr(scheduleDays, []),
      scheduleRepeat,
      scheduleStartDate,
      scheduleTz,
      data.status || 'active',
      data.userId || null,
      data.tenantId || null,
      null,
      null,
      nowIso(),
      nowIso(),
    ],
  });

  const created = await getSadhanaSchedule(sid);
  return created!;
}

export async function updateSadhanaSchedule(id: string, updates: any): Promise<SadhanaScheduleItem | null> {
  await initSadhanaSchedulerBunnySchema();
  const setCols: string[] = [];
  const args: any[] = [];

  const directMap: Record<string, string> = {
    name: 'name',
    botName: 'bot_name',
    videoUrl: 'video_url',
    videoDuration: 'video_duration',
    botJoinMinutes: 'bot_join_minutes',
    autoCloseMinutes: 'auto_close_minutes',
    zoomLink: 'zoom_link',
    zoomId: 'zoom_id',
    zoomPassword: 'zoom_password',
    zoomMeetingId: 'zoom_meeting_id',
    status: 'status',
    lastTriggeredSlot: 'last_triggered_slot',
  };

  for (const [key, col] of Object.entries(directMap)) {
    if (updates[key] !== undefined) {
      setCols.push(`${col} = ?`);
      args.push(updates[key]);
    }
  }

  if (updates.enableAiChatReplies !== undefined) {
    setCols.push('enable_ai_chat_replies = ?');
    args.push(updates.enableAiChatReplies ? 1 : 0);
  }
  if (updates.enableBotAutomation !== undefined) {
    setCols.push('enable_bot_automation = ?');
    args.push(updates.enableBotAutomation ? 1 : 0);
  }
  if (updates.chatMessages !== undefined) {
    setCols.push('chat_messages_json = ?');
    args.push(jsonStr(updates.chatMessages, []));
  }
  if (updates.activeBotSession !== undefined) {
    setCols.push('active_bot_session_json = ?');
    args.push(updates.activeBotSession ? jsonStr(updates.activeBotSession, null) : null);
  }
  if (updates.participantEmails !== undefined) {
    setCols.push('participant_emails_json = ?');
    args.push(jsonStr(updates.participantEmails, []));
  }
  if (updates.participantPhones !== undefined) {
    setCols.push('participant_phones_json = ?');
    args.push(jsonStr(updates.participantPhones, []));
  }
  if (updates.enableEmailReminders !== undefined) {
    setCols.push('enable_email_reminders = ?');
    args.push(updates.enableEmailReminders ? 1 : 0);
  }
  if (updates.enableWhatsAppReminders !== undefined) {
    setCols.push('enable_whatsapp_reminders = ?');
    args.push(updates.enableWhatsAppReminders ? 1 : 0);
  }

  if (updates.schedule) {
    if (updates.schedule.times !== undefined) {
      setCols.push('schedule_times_json = ?');
      args.push(jsonStr(updates.schedule.times, []));
    }
    if (updates.schedule.days !== undefined) {
      setCols.push('schedule_days_json = ?');
      args.push(jsonStr(updates.schedule.days, []));
    }
    if (updates.schedule.repeatFrequency !== undefined) {
      setCols.push('schedule_repeat_frequency = ?');
      args.push(updates.schedule.repeatFrequency);
    }
    if (updates.schedule.startDate !== undefined) {
      setCols.push('schedule_start_date = ?');
      args.push(updates.schedule.startDate);
    }
    if (updates.schedule.timezone !== undefined) {
      setCols.push('schedule_timezone = ?');
      args.push(updates.schedule.timezone);
    }
  }

  if (setCols.length === 0) return getSadhanaSchedule(id);

  setCols.push('updated_at = ?');
  args.push(nowIso());
  args.push(id);

  await bunnyExecute({
    sql: `UPDATE crm_sadhana_schedules_sql SET ${setCols.join(', ')} WHERE id = ?`,
    args,
  });

  return getSadhanaSchedule(id);
}

export async function deleteSadhanaSchedule(id: string): Promise<boolean> {
  await initSadhanaSchedulerBunnySchema();
  const r = await bunnyExecute({
    sql: 'DELETE FROM crm_sadhana_schedules_sql WHERE id = ?',
    args: [id],
  });
  return (r.rowsAffected || 0) > 0;
}
