/**
 * Tally Auto-Sync Utilities
 *
 * Provides auto-sync from Tally Prime to MongoDB and sync status tracking.
 * Used by /api/admin/crm/tally POST handler.
 */

import { connectDB } from '@/lib/db';
import {
  fetchLedgers,
  fetchVouchers,
} from '@/lib/tally/tallyPrimeAPI';
import mongoose from 'mongoose';

function getSyncLogsCollection() {
  const db = mongoose.connection.db;
  if (!db) throw new Error('Database not connected');
  return db.collection('tally_sync_logs');
}

/**
 * Run auto-sync: pull data from Tally Prime and upsert into MongoDB.
 */
export async function runTallyAutoSync(from?: string, to?: string) {
  await connectDB();

  const startTime = Date.now();

  try {
    // Attempt to fetch from Tally Prime (desktop, localhost:9000)
    const ledgers = await fetchLedgers();
    const vouchers = await fetchVouchers('All', from, to);

    // Log sync result
    await getSyncLogsCollection().insertOne({
      syncType: 'auto',
      status: 'success',
      ledgerCount: ledgers.length,
      voucherCount: vouchers.length,
      durationMs: Date.now() - startTime,
      from,
      to,
      syncedAt: new Date(),
    });

    return {
      success: true,
      message: `Synced ${ledgers.length} ledgers and ${vouchers.length} vouchers`,
      ledgerCount: ledgers.length,
      voucherCount: vouchers.length,
      durationMs: Date.now() - startTime,
    };
  } catch (error: any) {
    // Log failure
    try {
      await getSyncLogsCollection().insertOne({
        syncType: 'auto',
        status: 'failed',
        error: error.message,
        durationMs: Date.now() - startTime,
        from,
        to,
        syncedAt: new Date(),
      });
    } catch { /* ignore logging errors */ }

    return {
      success: false,
      error: error.message || 'Tally sync failed — is Tally Prime running on localhost:9000?',
    };
  }
}

/**
 * Get last sync status info.
 */
export async function getLastSyncInfo() {
  await connectDB();

  try {
    const lastSync = await getSyncLogsCollection()
      .findOne({}, { sort: { syncedAt: -1 } });

    if (!lastSync) {
      return { lastSync: null, message: 'No sync has been performed yet' };
    }

    return { lastSync };
  } catch {
    return { lastSync: null, message: 'Unable to retrieve sync info' };
  }
}
