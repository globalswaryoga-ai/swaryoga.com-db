import fs from 'fs/promises.js';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKUPS_DIR = path.resolve(__dirname, '../backups');
const DATA_FILE = path.resolve(__dirname, '../server-data.json');
const MAX_BACKUPS = 10; // Keep last 10 days of backups
/**
 * Initialize backups directory
 */
async function initBackupsDir() {
    try {
        await fs.mkdir(BACKUPS_DIR, { recursive: true });
        console.log('✅ Backups directory ready:', BACKUPS_DIR);
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Failed to create backups directory:', errorMessage);
    }
}
/**
 * Generate backup filename with date
 * Format: backup-YYYY-MM-DD.json
 */
function generateBackupFilename(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `backup-${year}-${month}-${day}.json`;
}
/**
 * Get all backup files sorted by date (newest first)
 */
async function getAllBackups() {
    try {
        const files = await fs.readdir(BACKUPS_DIR);
        const backupFiles = files.filter((f) => f.startsWith('backup-') && f.endsWith('.json'));
        // Sort by filename (which contains date in YYYY-MM-DD format)
        backupFiles.sort().reverse();
        return backupFiles;
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Failed to read backups directory:', errorMessage);
        return [];
    }
}
/**
 * Clean up old backups, keeping only the last MAX_BACKUPS
 */
async function cleanupOldBackups() {
    try {
        const backups = await getAllBackups();
        if (backups.length > MAX_BACKUPS) {
            const toDelete = backups.slice(MAX_BACKUPS);
            for (const backup of toDelete) {
                const backupPath = path.join(BACKUPS_DIR, backup);
                await fs.unlink(backupPath);
                console.log(`🗑️  Deleted old backup: ${backup}`);
            }
            console.log(`✅ Cleanup complete. Kept last ${MAX_BACKUPS} backups.`);
        }
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Backup cleanup failed:', errorMessage);
    }
}
/**
 * Create daily backup if not already created today
 */
async function createDailyBackup() {
    try {
        await initBackupsDir();
        const backupFilename = generateBackupFilename();
        const backupPath = path.join(BACKUPS_DIR, backupFilename);
        // Check if backup already exists for today
        try {
            await fs.access(backupPath);
            console.log(`ℹ️  Backup for today already exists: ${backupFilename}`);
            return { success: false, reason: 'Already backed up today', backupPath };
        }
        catch {
            // Backup doesn't exist, proceed with creation
        }
        // Read current data file
        try {
            await fs.access(DATA_FILE);
        }
        catch {
            console.log(`⚠️  Data file doesn't exist yet: ${DATA_FILE}`);
            return { success: false, reason: 'Data file not found', backupPath };
        }
        // Copy data file to backup
        const data = await fs.readFile(DATA_FILE, 'utf-8');
        await fs.writeFile(backupPath, data, 'utf-8');
        const stats = await fs.stat(backupPath);
        console.log(`✅ Daily backup created successfully: ${backupFilename} (${(stats.size / 1024).toFixed(2)} KB)`);
        // Cleanup old backups
        await cleanupOldBackups();
        return {
            success: true,
            filename: backupFilename,
            backupPath,
            timestamp: new Date().toISOString(),
            sizeKB: (stats.size / 1024).toFixed(2)
        };
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Failed to create backup:', errorMessage);
        return { success: false, error: errorMessage };
    }
}
/**
 * Get list of all backups with metadata
 */
async function listBackups() {
    try {
        const backups = await getAllBackups();
        const backupList = [];
        for (const backup of backups) {
            const backupPath = path.join(BACKUPS_DIR, backup);
            const stats = await fs.stat(backupPath);
            // Extract date from filename
            const match = backup.match(/backup-(\d{4})-(\d{2})-(\d{2})\.json/);
            const date = match ? new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00Z`) : null;
            backupList.push({
                filename: backup,
                date: date ? date.toISOString().split('T')[0] : 'unknown',
                dateISO: date ? date.toISOString() : null,
                sizeKB: (stats.size / 1024).toFixed(2),
                created: stats.birthtime.toISOString(),
                modified: stats.mtime.toISOString()
            });
        }
        return backupList;
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Failed to list backups:', errorMessage);
        return [];
    }
}
/**
 * Restore data from a specific backup
 */
async function restoreFromBackup(backupFilename) {
    try {
        const backupPath = path.join(BACKUPS_DIR, backupFilename);
        // Verify backup exists
        try {
            await fs.access(backupPath);
        }
        catch {
            return { success: false, error: `Backup not found: ${backupFilename}` };
        }
        // Create a safety backup of current data before restoring
        const safetyBackupFilename = `safety-backup-${Date.now()}.json`;
        const safetyBackupPath = path.join(BACKUPS_DIR, safetyBackupFilename);
        try {
            await fs.access(DATA_FILE);
            const currentData = await fs.readFile(DATA_FILE, 'utf-8');
            await fs.writeFile(safetyBackupPath, currentData, 'utf-8');
            console.log(`💾 Safety backup created: ${safetyBackupFilename}`);
        }
        catch {
            console.log('⚠️  No current data to backup');
        }
        // Restore from backup
        const backupData = await fs.readFile(backupPath, 'utf-8');
        await fs.writeFile(DATA_FILE, backupData, 'utf-8');
        console.log(`✅ Restored from backup: ${backupFilename}`);
        return {
            success: true,
            restored: backupFilename,
            safetyBackup: safetyBackupFilename,
            timestamp: new Date().toISOString()
        };
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Failed to restore backup:', errorMessage);
        return { success: false, error: errorMessage };
    }
}
/**
 * Get backup statistics
 */
async function getBackupStats() {
    try {
        const backups = await getAllBackups();
        let totalSize = 0;
        for (const backup of backups) {
            const backupPath = path.join(BACKUPS_DIR, backup);
            const stats = await fs.stat(backupPath);
            totalSize += stats.size;
        }
        return {
            totalBackups: backups.length,
            maxBackups: MAX_BACKUPS,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            backupsDirectory: BACKUPS_DIR,
            backups: await listBackups()
        };
    }
    catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('❌ Failed to get backup stats:', errorMessage);
        return {
            totalBackups: 0,
            maxBackups: MAX_BACKUPS,
            totalSizeMB: '0',
            backupsDirectory: BACKUPS_DIR,
            backups: [],
            error: errorMessage
        };
    }
}
export { createDailyBackup, listBackups, restoreFromBackup, getBackupStats, initBackupsDir, generateBackupFilename, getAllBackups };
//# sourceMappingURL=backup.js.map