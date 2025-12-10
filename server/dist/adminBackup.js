import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import SignupData from './models/SignupData.js';
import SigninData from './models/SigninData.js';
import Contact from './models/Contact.js';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKUPS_DIR = path.join(__dirname, '..', 'admin_backups');
// Ensure backups directory exists
async function ensureBackupDir() {
    try {
        await fs.mkdir(BACKUPS_DIR, { recursive: true });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Failed to create backups directory:', errorMessage);
    }
}
ensureBackupDir();
/**
 * Create a backup when admin signs out
 * Backs up: contact messages, signin logs, signup users (from MongoDB)
 */
export async function createSignoutBackup(adminId, email) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `admin_signout_${adminId}_${timestamp}.json`;
        const backupPath = path.join(BACKUPS_DIR, backupName);
        console.log(`📦 Creating signout backup for admin: ${email}`);
        // Fetch all data from MongoDB
        const [contactMessages, signinLogs, signupUsers] = await Promise.all([
            Contact.find().sort({ createdAt: -1 }),
            SigninData.find().sort({ timestamp: -1 }),
            SignupData.find().sort({ registrationDate: -1 })
        ]);
        const backupData = {
            backupType: 'signout',
            createdAt: new Date().toISOString(),
            createdBy: email,
            adminId,
            database: 'MongoDB Atlas',
            summary: {
                totalContactMessages: contactMessages.length,
                totalSigninLogs: signinLogs.length,
                totalSignupUsers: signupUsers.length
            },
            data: {
                contactMessages,
                signinLogs,
                signupUsers
            }
        };
        // Write backup to file
        await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
        console.log(`✅ Signout backup created: ${backupName}`);
        console.log(`   📊 Contact Messages: ${contactMessages.length}`);
        console.log(`   📊 Signin Logs: ${signinLogs.length}`);
        console.log(`   📊 Signup Users: ${signupUsers.length}`);
        return {
            success: true,
            backupName,
            backupPath,
            summary: backupData.summary
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating signout backup:', errorMessage);
        return {
            success: false,
            error: errorMessage
        };
    }
}
/**
 * Create manual backup
 */
export async function createManualBackup(adminId, email) {
    try {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupName = `admin_manual_${adminId}_${timestamp}.json`;
        const backupPath = path.join(BACKUPS_DIR, backupName);
        console.log(`📦 Creating manual backup by admin: ${email}`);
        // Fetch all data from MongoDB
        const [contactMessages, signinLogs, signupUsers] = await Promise.all([
            Contact.find().sort({ createdAt: -1 }),
            SigninData.find().sort({ timestamp: -1 }),
            SignupData.find().sort({ registrationDate: -1 })
        ]);
        const backupData = {
            backupType: 'manual',
            createdAt: new Date().toISOString(),
            createdBy: email,
            adminId,
            database: 'MongoDB Atlas',
            summary: {
                totalContactMessages: contactMessages.length,
                totalSigninLogs: signinLogs.length,
                totalSignupUsers: signupUsers.length
            },
            data: {
                contactMessages,
                signinLogs,
                signupUsers
            }
        };
        // Write backup to file
        await fs.writeFile(backupPath, JSON.stringify(backupData, null, 2), 'utf-8');
        console.log(`✅ Manual backup created: ${backupName}`);
        return {
            success: true,
            backupName,
            backupPath,
            summary: backupData.summary
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error creating manual backup:', errorMessage);
        return {
            success: false,
            error: errorMessage
        };
    }
}
/**
 * List all backups from directory
 */
export async function listBackups() {
    try {
        const files = await fs.readdir(BACKUPS_DIR);
        return files
            .filter((f) => f.startsWith('admin_') && f.endsWith('.json'))
            .sort()
            .reverse();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error listing backups:', errorMessage);
        return [];
    }
}
/**
 * Get backup statistics
 */
export async function getBackupStats() {
    try {
        const backups = await listBackups();
        const signoutCount = backups.filter((b) => b.includes('signout')).length;
        const manualCount = backups.filter((b) => b.includes('manual')).length;
        return {
            total: backups.length,
            signoutCount,
            manualCount
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error getting backup stats:', errorMessage);
        return { total: 0, signoutCount: 0, manualCount: 0 };
    }
}
/**
 * Restore from backup
 */
export async function restoreFromBackup(backupName, adminId) {
    try {
        console.log(`🔄 Restoring from backup: ${backupName}`);
        const backupPath = path.join(BACKUPS_DIR, backupName);
        // Check if file exists
        await fs.access(backupPath);
        // Read backup file
        const backupContent = await fs.readFile(backupPath, 'utf-8');
        const backupData = JSON.parse(backupContent);
        console.log(`✅ Backup restored: ${backupName}`);
        return {
            success: true,
            message: 'Backup restored successfully',
            data: backupData
        };
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error restoring backup:', errorMessage);
        return {
            success: false,
            error: errorMessage
        };
    }
}
/**
 * Download backup file
 */
export async function getBackupFile(backupName) {
    try {
        const backupPath = path.join(BACKUPS_DIR, backupName);
        await fs.access(backupPath);
        return await fs.readFile(backupPath);
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error reading backup file:', errorMessage);
        throw error;
    }
}
//# sourceMappingURL=adminBackup.js.map