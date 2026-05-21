/**
 * =====================================================
 * BACKUP SYSTEM INITIALIZATION
 * =====================================================
 * Add this to your Next.js root layout.ts/layout.jsx
 * This runs once when the app starts
 * =====================================================
 */

'use server';

import { initializeBackupSystem } from '@/lib/backup';
import { logger } from '@/lib/backup/logger';

/**
 * Initialize backup system on app startup
 * This function is called once when Next.js starts
 */
export async function initBackupOnStartup() {
  try {
    logger.info('🚀 Initializing backup system on app startup...');

    // Check if MongoDB is connected
    const mongoose = require('mongoose');
    if (mongoose.connection.readyState === 0) {
      logger.warn('⚠️  MongoDB not connected yet, backup system will start after connection');
      return;
    }

    // Initialize backup system
    const scheduler = await initializeBackupSystem();
    logger.info('✅ Backup system initialized', scheduler.getStatus());
  } catch (error) {
    logger.error('❌ Failed to initialize backup system', {
      error: error instanceof Error ? error.message : String(error),
    });

    // Don't crash the app if backup initialization fails
    // Log the error and continue
  }
}

/**
 * Export for use in Next.js
 * Usage in app/layout.ts:
 *
 * export default async function RootLayout() {
 *   // Initialize backup system
 *   if (typeof window === 'undefined') {
 *     await initBackupOnStartup();
 *   }
 *
 *   return (
 *     <html>
 *       <body>...</body>
 *     </html>
 *   )
 * }
 */
