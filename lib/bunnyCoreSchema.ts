import { bunnyBatch, bunnyExecute } from './bunnyDatabase';

export async function initBunnyCoreSchema() {
  await bunnyBatch([
    // Core Users Table
    {
      sql: `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        userId TEXT UNIQUE,
        email TEXT UNIQUE NOT NULL,
        phone TEXT,
        password TEXT,
        name TEXT,
        role TEXT DEFAULT 'user',
        isAdmin INTEGER DEFAULT 0,
        provider TEXT DEFAULT 'email',
        providerId TEXT,
        emailVerified INTEGER DEFAULT 0,
        emailVerificationToken TEXT,
        emailVerificationExpires TEXT,
        resetPasswordToken TEXT,
        resetPasswordExpires TEXT,
        status TEXT DEFAULT 'active',
        managedUserIds TEXT DEFAULT '[]',
        permissions TEXT DEFAULT '[]',
        permissionsV2 TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
        updatedAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      args: []
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)', args: [] },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_users_userid ON users(userId)', args: [] },
    
    // User Signins Table
    {
      sql: `CREATE TABLE IF NOT EXISTS user_signins (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL,
        userId TEXT,
        ipAddress TEXT,
        userAgent TEXT,
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )`,
      args: []
    },
    { sql: 'CREATE INDEX IF NOT EXISTS idx_user_signins_created_at ON user_signins(createdAt)', args: [] }
  ]);
}
