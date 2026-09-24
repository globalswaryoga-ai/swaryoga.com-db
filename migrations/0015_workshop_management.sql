-- Bunny SQL workshop management cutover.
-- Workshop data is stored independently from MongoDB using TEXT IDs and JSON metadata.
CREATE TABLE IF NOT EXISTS workshop_cohorts_sql (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT,
  holiday_dates_json TEXT NOT NULL DEFAULT '[]',
  class_start_time TEXT,
  class_end_time TEXT,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  zoom_meeting_id TEXT,
  zoom_join_url TEXT,
  whatsapp_group_link TEXT,
  google_form_link TEXT,
  ai_worker_enabled INTEGER NOT NULL DEFAULT 1,
  auto_sync_whatsapp_group INTEGER NOT NULL DEFAULT 0,
  auto_send_recordings INTEGER NOT NULL DEFAULT 0,
  auto_sync_zoom_attendance INTEGER NOT NULL DEFAULT 1,
  zoom_attendance_last_sync_at TEXT,
  worker_last_run_at TEXT,
  whatsapp_group_id TEXT,
  community_id TEXT,
  recording_policy TEXT NOT NULL DEFAULT 'speaker_and_gallery',
  created_by_user_id TEXT,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_workshop_cohorts_sql_start_date ON workshop_cohorts_sql(start_date);
CREATE INDEX IF NOT EXISTS idx_workshop_cohorts_sql_zoom_id ON workshop_cohorts_sql(zoom_meeting_id);

CREATE TABLE IF NOT EXISTS workshop_students_sql (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp_jid TEXT,
  whatsapp_number TEXT,
  lead_id TEXT,
  lead_number TEXT,
  source TEXT NOT NULL DEFAULT 'manual',
  active INTEGER NOT NULL DEFAULT 1,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cohort_id, whatsapp_jid),
  UNIQUE(cohort_id, email),
  UNIQUE(cohort_id, phone)
);
CREATE INDEX IF NOT EXISTS idx_workshop_students_sql_cohort ON workshop_students_sql(cohort_id);
CREATE INDEX IF NOT EXISTS idx_workshop_students_sql_active ON workshop_students_sql(cohort_id, active);

CREATE TABLE IF NOT EXISTS workshop_attendance_sql (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL,
  student_id TEXT NOT NULL,
  class_date TEXT NOT NULL,
  joined_at TEXT,
  left_at TEXT,
  joined INTEGER NOT NULL DEFAULT 0,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  attendance_percent INTEGER NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'zoom',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cohort_id, student_id, class_date)
);
CREATE INDEX IF NOT EXISTS idx_workshop_attendance_sql_cohort ON workshop_attendance_sql(cohort_id, class_date);

CREATE TABLE IF NOT EXISTS workshop_recordings_sql (
  id TEXT PRIMARY KEY,
  cohort_id TEXT NOT NULL,
  class_date TEXT NOT NULL,
  day_number INTEGER,
  zoom_meeting_id TEXT,
  zoom_meeting_uuid TEXT,
  youtube_speaker_id TEXT,
  youtube_gallery_id TEXT,
  youtube_speaker_url TEXT,
  youtube_gallery_url TEXT,
  bunny_speaker_url TEXT,
  bunny_gallery_url TEXT,
  delivered_student_ids_json TEXT NOT NULL DEFAULT '[]',
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(cohort_id, class_date)
);
CREATE INDEX IF NOT EXISTS idx_workshop_recordings_sql_cohort ON workshop_recordings_sql(cohort_id, class_date);
