import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import Contact from '../models/Contact.js';
import User from '../models/User.js';
import Admin from '../models/Admin.js';
const execAsync = promisify(exec);
/**
 * MongoDB Backup Service
 * Handles daily automated backups and recovery
 */
const BACKUP_DIR = path.join(process.cwd(), '..', 'backups', 'mongodb');
const BACKUP_METADATA_FILE = path.join(BACKUP_DIR, 'backups.json');
// Ensure backup directory exists
function ensureBackupDir() {
    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }
}
// Get backup metadata
function getBackupMetadata() {
    ensureBackupDir();
    if (fs.existsSync(BACKUP_METADATA_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(BACKUP_METADATA_FILE, 'utf-8'));
        }
        catch (error) {
            console.error('Error reading backup metadata:', error);
            return { backups: [] };
        }
    }
    return { backups: [] };
}
// Save backup metadata
function saveBackupMetadata(metadata) {
    fs.writeFileSync(BACKUP_METADATA_FILE, JSON.stringify(metadata, null, 2));
}
/**
 * Perform automated MongoDB backup
 */
export async function performBackup() {
    try {
        const backupId = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}`;
        const backupPath = path.join(BACKUP_DIR, backupId);
        console.log(`🔄 Starting MongoDB backup: ${backupId}`);
        // Create backup directory
        fs.mkdirSync(backupPath, { recursive: true });
        // Export collections as JSON files
        console.log('📦 Exporting Contact collection...');
        const contacts = await Contact.find({}).lean();
        fs.writeFileSync(path.join(backupPath, 'contacts.json'), JSON.stringify(contacts, null, 2));
        console.log('📦 Exporting User collection...');
        const users = await User.find({}).select('-passwordHash').lean();
        fs.writeFileSync(path.join(backupPath, 'users.json'), JSON.stringify(users, null, 2));
        console.log('📦 Exporting Admin collection...');
        const admins = await Admin.find({}).select('-passwordHash').lean();
        fs.writeFileSync(path.join(backupPath, 'admins.json'), JSON.stringify(admins, null, 2));
        // Create metadata file
        const metadata = getBackupMetadata();
        const backupSize = getFolderSize(backupPath);
        metadata.backups.push({
            id: backupId,
            date: new Date().toISOString(),
            timestamp: Date.now(),
            size: formatBytes(backupSize),
            status: 'success',
            collections: {
                contacts: contacts.length,
                users: users.length,
                admins: admins.length
            },
            directory: backupPath
        });
        metadata.lastBackup = backupId;
        // Keep only last 30 backups
        if (metadata.backups.length > 30) {
            const removedBackups = metadata.backups.splice(0, metadata.backups.length - 30);
            removedBackups.forEach(backup => {
                try {
                    if (fs.existsSync(backup.directory)) {
                        fs.rmSync(backup.directory, { recursive: true, force: true });
                    }
                }
                catch (error) {
                    console.error(`Error removing backup ${backup.id}:`, error);
                }
            });
        }
        saveBackupMetadata(metadata);
        console.log(`✅ Backup completed successfully: ${backupId}`);
        console.log(`   Contacts: ${contacts.length} | Users: ${users.length} | Admins: ${admins.length}`);
        console.log(`   Size: ${formatBytes(backupSize)}`);
        return;
    }
    catch (error) {
        console.error('❌ Backup failed:', error);
        throw error;
    }
}
/**
 * Get all available backups
 */
export function getBackupList() {
    const metadata = getBackupMetadata();
    return metadata.backups.sort((a, b) => b.timestamp - a.timestamp);
}
/**
 * Restore from backup
 */
export async function restoreBackup(backupId) {
    try {
        const metadata = getBackupMetadata();
        const backup = metadata.backups.find(b => b.id === backupId);
        if (!backup) {
            throw new Error(`Backup not found: ${backupId}`);
        }
        console.log(`🔄 Restoring backup: ${backupId}`);
        console.log(`⚠️  This will overwrite existing data!`);
        const contactsFile = path.join(backup.directory, 'contacts.json');
        const usersFile = path.join(backup.directory, 'users.json');
        const adminsFile = path.join(backup.directory, 'admins.json');
        if (fs.existsSync(contactsFile)) {
            console.log('📥 Restoring Contacts...');
            const contacts = JSON.parse(fs.readFileSync(contactsFile, 'utf-8'));
            await Contact.deleteMany({});
            await Contact.insertMany(contacts);
            console.log(`✅ Restored ${contacts.length} contacts`);
        }
        if (fs.existsSync(usersFile)) {
            console.log('📥 Restoring Users...');
            const users = JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
            await User.deleteMany({});
            await User.insertMany(users);
            console.log(`✅ Restored ${users.length} users`);
        }
        if (fs.existsSync(adminsFile)) {
            console.log('📥 Restoring Admins...');
            const admins = JSON.parse(fs.readFileSync(adminsFile, 'utf-8'));
            await Admin.deleteMany({});
            await Admin.insertMany(admins);
            console.log(`✅ Restored ${admins.length} admins`);
        }
        console.log(`✅ Restore completed: ${backupId}`);
        return;
    }
    catch (error) {
        console.error('❌ Restore failed:', error);
        throw error;
    }
}
/**
 * Delete old backups
 */
export function deleteOldBackups(daysOld = 7) {
    const metadata = getBackupMetadata();
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    const backupsToDelete = metadata.backups.filter(b => b.timestamp < cutoffTime);
    backupsToDelete.forEach(backup => {
        try {
            if (fs.existsSync(backup.directory)) {
                fs.rmSync(backup.directory, { recursive: true, force: true });
                console.log(`🗑️  Deleted backup: ${backup.id}`);
            }
        }
        catch (error) {
            console.error(`Error deleting backup ${backup.id}:`, error);
        }
    });
    metadata.backups = metadata.backups.filter(b => b.timestamp >= cutoffTime);
    saveBackupMetadata(metadata);
}
/**
 * Helper: Calculate folder size
 */
function getFolderSize(folderPath) {
    let size = 0;
    const files = fs.readdirSync(folderPath);
    files.forEach(file => {
        const filePath = path.join(folderPath, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            size += getFolderSize(filePath);
        }
        else {
            size += stat.size;
        }
    });
    return size;
}
/**
 * Helper: Format bytes to human readable
 */
function formatBytes(bytes, decimals = 2) {
    if (bytes === 0)
        return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * Math.pow(10, dm)) / Math.pow(10, dm) + ' ' + sizes[i];
}
/**
 * Initialize backup service
 */
export function initializeBackupService() {
    ensureBackupDir();
    console.log(`📁 Backup directory: ${BACKUP_DIR}`);
    // Perform backup once on startup
    performBackup().catch(error => {
        console.error('Failed to perform initial backup:', error);
    });
    // Schedule daily backups at midnight
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
        // Initial backup at midnight
        performBackup().catch(error => {
            console.error('Scheduled backup failed:', error);
        });
        // Then schedule daily backups
        setInterval(() => {
            performBackup().catch(error => {
                console.error('Scheduled backup failed:', error);
            });
        }, 24 * 60 * 60 * 1000); // Every 24 hours
    }, msUntilMidnight);
    console.log(`✅ Backup service initialized - next backup in ${Math.round(msUntilMidnight / 60000)} minutes`);
}
//# sourceMappingURL=backupService.js.map