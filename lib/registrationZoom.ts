import { readRegistrationState, parseRegistrationValue } from '@/lib/registrationState';
import { bunnyExecute } from '@/lib/bunnyDatabase';

export type RegistrationZoomSlot = { time: string; link: string };

export async function registrationZoomSlots(batchId: string) {
  const state = await readRegistrationState();
  const direct = state[`crm_zoom_setup_${batchId}`];
  const legacy = parseRegistrationValue<Record<string, Record<string, RegistrationZoomSlot[]>>>(state.crm_zoom_setup_data, {});
  return parseRegistrationValue<Record<string, RegistrationZoomSlot[]>>(direct, legacy[batchId] || {});
}

export async function ensureRegistrationZoomBookings() {
  await bunnyExecute(`CREATE TABLE IF NOT EXISTS registration_zoom_bookings_sql (
    document_id TEXT PRIMARY KEY, batch_id TEXT NOT NULL, lead_id TEXT NOT NULL,
    booking_date TEXT NOT NULL, booking_time TEXT NOT NULL, data_json TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )`);
}
