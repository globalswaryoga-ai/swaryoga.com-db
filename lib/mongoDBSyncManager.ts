// MongoDB Data Sync Manager - Sync local data to MongoDB + Daily Backup at 10:30 AM
// This ensures all visions, goals, tasks, etc. are synced to MongoDB cloud

import mongoose from 'mongoose';
import { permanentStorage } from '@/lib/permanentStorageManager';

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || '';

interface CachedConnection {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

let cached = (global as any).mongoose as CachedConnection;

if (!cached) {
  cached = (global as any).mongoose = { conn: null, promise: null };
}

export const connectDB = async () => {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
    };

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ Connected to MongoDB');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    console.error('❌ MongoDB connection failed:', e);
    throw e;
  }

  return cached.conn;
};

// Backup Schema
const backupSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  email: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, required: true },
  timestamp: { type: Date, default: Date.now },
  backupTime: { type: String }, // "10:30 AM"
  type: { type: String, enum: ['auto', 'manual'], default: 'auto' },
});

const Backup = mongoose.models.Backup || mongoose.model('Backup', backupSchema);

// Data Sync Schema
const dataSyncSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  email: { type: String, required: true },
  visions: { type: Array, default: [] },
  goals: { type: Array, default: [] },
  tasks: { type: Array, default: [] },
  todos: { type: Array, default: [] },
  words: { type: Array, default: [] },
  reminders: { type: Array, default: [] },
  lastSyncTime: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

const DataSync = mongoose.models.DataSync || mongoose.model('DataSync', dataSyncSchema);

// MongoDB Data Sync Manager
export class MongoDBSyncManager {
  private userId = 'auto-login-user-swar-sakshi';
  private email = 'swarsakshi9@gmail.com';
  private backupScheduled = false;
  private backupCheckInterval: NodeJS.Timeout | null = null;
  private lastBackupTime: number = 0;

  /**
   * Initialize MongoDB sync
   */
  async initialize() {
    if (typeof window !== 'undefined') return; // Only server-side

    try {
      await connectDB();
      this.scheduleBackup();
      console.log('✅ MongoDB Sync Manager initialized');
    } catch (error) {
      console.error('❌ Failed to initialize MongoDB sync:', error);
    }
  }

  /**
   * Sync local data to MongoDB
   */
  async syncToMongoDB() {
    if (typeof window !== 'undefined') {
      return; // Only server-side
    }

    try {
      const backup = permanentStorage.getCompleteBackup();
      if (!backup) {
        console.warn('No data to sync');
        return;
      }

      await connectDB();

      const syncData = {
        userId: this.userId,
        email: this.email,
        visions: backup.visions || [],
        goals: backup.goals || [],
        tasks: backup.tasks || [],
        todos: backup.todos || [],
        words: backup.words || [],
        reminders: backup.reminders || [],
        lastSyncTime: new Date(),
        updatedAt: new Date(),
      };

      // Upsert data
      await DataSync.findOneAndUpdate(
        { userId: this.userId, email: this.email },
        syncData,
        { upsert: true, new: true }
      );

      console.log('✅ Data synced to MongoDB');
      return syncData;
    } catch (error) {
      console.error('❌ Failed to sync to MongoDB:', error);
      return null;
    }
  }

  /**
   * Create daily backup at 10:30 AM
   */
  private scheduleBackup() {
    if (this.backupScheduled) return;
    this.backupScheduled = true;

    // Check backup time every minute
    this.backupCheckInterval = setInterval(() => {
      this.checkAndExecuteBackup();
    }, 60 * 1000); // Check every minute

    // Also check immediately
    this.checkAndExecuteBackup();
  }

  /**
   * Check if it's 10:30 AM and execute backup
   */
  private async checkAndExecuteBackup() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();

    // Check if it's 10:30 AM (10:30 - 10:31)
    if (hours === 10 && minutes === 30) {
      // Only backup once per day (check if already backed up today)
      const today = new Date().toDateString();
      const lastBackupDate = new Date(this.lastBackupTime).toDateString();

      if (today !== lastBackupDate) {
        await this.createBackup();
        this.lastBackupTime = Date.now();
      }
    }
  }

  /**
   * Create backup in MongoDB
   */
  async createBackup(type: 'auto' | 'manual' = 'auto') {
    try {
      const backup = permanentStorage.getCompleteBackup();
      if (!backup) {
        console.warn('No data to backup');
        return null;
      }

      await connectDB();

      const backupDoc = new Backup({
        userId: this.userId,
        email: this.email,
        data: backup,
        timestamp: new Date(),
        backupTime: new Date().toLocaleTimeString(),
        type,
      });

      await backupDoc.save();
      console.log(`✅ ${type} backup created at ${new Date().toLocaleTimeString()}`);
      return backupDoc;
    } catch (error) {
      console.error('❌ Failed to create backup:', error);
      return null;
    }
  }

  /**
   * Get all backups for user
   */
  async getBackups() {
    try {
      await connectDB();
      const backups = await Backup.find({
        userId: this.userId,
        email: this.email,
      }).sort({ timestamp: -1 });

      return backups;
    } catch (error) {
      console.error('❌ Failed to get backups:', error);
      return [];
    }
  }

  /**
   * Restore from MongoDB backup
   */
  async restoreFromBackup(backupId: string) {
    try {
      await connectDB();
      const backup = await Backup.findById(backupId);

      if (!backup) {
        console.error('Backup not found');
        return false;
      }

      // Restore to permanent storage
      permanentStorage.restoreFromBackup(backup.data);
      console.log('✅ Data restored from backup');
      return true;
    } catch (error) {
      console.error('❌ Failed to restore from backup:', error);
      return false;
    }
  }

  /**
   * Manual sync trigger
   */
  async manualSync() {
    console.log('🔄 Starting manual sync...');
    return await this.syncToMongoDB();
  }

  /**
   * Cleanup
   */
  destroy() {
    if (this.backupCheckInterval) {
      clearInterval(this.backupCheckInterval);
      this.backupCheckInterval = null;
    }
    this.backupScheduled = false;
  }

  /**
   * Get sync status
   */
  async getSyncStatus() {
    try {
      await connectDB();
      const syncData = await DataSync.findOne({
        userId: this.userId,
        email: this.email,
      });

      const backups = await Backup.find({
        userId: this.userId,
        email: this.email,
      }).sort({ timestamp: -1 }).limit(5);

      return {
        synced: !!syncData,
        lastSyncTime: syncData?.lastSyncTime,
        dataCount: {
          visions: syncData?.visions?.length || 0,
          goals: syncData?.goals?.length || 0,
          tasks: syncData?.tasks?.length || 0,
          todos: syncData?.todos?.length || 0,
        },
        recentBackups: backups.map(b => ({
          id: b._id,
          type: b.type,
          time: b.backupTime,
          timestamp: b.timestamp,
        })),
      };
    } catch (error) {
      console.error('❌ Failed to get sync status:', error);
      return null;
    }
  }
}

// Export singleton instance
export const mongoDBSync = new MongoDBSyncManager();

export default connectDB;
