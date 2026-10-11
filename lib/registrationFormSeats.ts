import { bunnyBatch, bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';

export async function reserveBunnyFormSeat(scheduleId: string, email: string, phone: string) {
  await bunnyBatch([
    { sql: 'CREATE TABLE IF NOT EXISTS workshop_seat_inventory_sql (schedule_id TEXT PRIMARY KEY, seats_remaining INTEGER NOT NULL CHECK(seats_remaining >= 0))', args: [] },
    { sql: 'CREATE TABLE IF NOT EXISTS workshop_form_seat_reservations_sql (schedule_id TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL, PRIMARY KEY(schedule_id, email))', args: [] },
  ]);
  const inventory = await bunnyExecute({ sql: 'SELECT schedule_id FROM workshop_seat_inventory_sql WHERE schedule_id = ?', args: [scheduleId] });
  if (!inventory.rows.length) {
    const archive = await bunnyExecute({
      sql: "SELECT document_json FROM mongo_documents WHERE collection_name = 'workshopseatinventories' AND (document_id = ? OR json_extract(document_json, '$.scheduleId') = ?) LIMIT 1",
      args: [scheduleId, scheduleId],
    });
    if (!archive.rows.length) return false;
    const saved = cleanMongoJson(JSON.parse(String(archive.rows[0].document_json)));
    if (!Number.isInteger(saved.seatsRemaining) || saved.seatsRemaining < 0) throw new Error('Invalid Bunny seat inventory');
    await bunnyExecute({
      sql: 'INSERT INTO workshop_seat_inventory_sql (schedule_id, seats_remaining) VALUES (?, ?) ON CONFLICT(schedule_id) DO NOTHING',
      args: [scheduleId, saved.seatsRemaining],
    });
  }
  const result = await bunnyBatch([
    {
      sql: `UPDATE workshop_seat_inventory_sql SET seats_remaining = seats_remaining - 1
        WHERE schedule_id = ? AND seats_remaining > 0 AND NOT EXISTS (
          SELECT 1 FROM workshop_form_seat_reservations_sql WHERE schedule_id = ? AND (email = ? OR phone = ?))`,
      args: [scheduleId, scheduleId, email, phone],
    },
    {
      sql: `INSERT INTO workshop_form_seat_reservations_sql (schedule_id, email, phone)
        SELECT ?, ?, ? WHERE changes() = 1 ON CONFLICT(schedule_id, email) DO NOTHING`,
      args: [scheduleId, email, phone],
    },
    { sql: 'SELECT email FROM workshop_form_seat_reservations_sql WHERE schedule_id = ? AND (email = ? OR phone = ?)', args: [scheduleId, email, phone] },
  ]);
  return result[2].rows.length > 0;
}
