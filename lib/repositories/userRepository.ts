import { bunnyExecute, bunnyBatch } from '../bunnyDatabase';
import { initBunnyCoreSchema } from '../bunnyCoreSchema';
import crypto from 'node:crypto';

export type UserEntity = {
  id: string; // _id equivalent
  userId?: string;
  email: string;
  phone?: string;
  password?: string;
  name?: string;
  role: string;
  isAdmin: boolean;
  provider: string;
  providerId?: string;
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  status: string;
  managedUserIds: string[];
  permissions: string[];
  permissionsV2?: any;
  createdAt: string;
  updatedAt: string;
};

function mapRowToUser(row: any): UserEntity {
  return {
    id: String(row.id),
    userId: row.userId ? String(row.userId) : undefined,
    email: String(row.email),
    phone: row.phone ? String(row.phone) : undefined,
    password: row.password ? String(row.password) : undefined,
    name: row.name ? String(row.name) : undefined,
    role: String(row.role || 'user'),
    isAdmin: row.isAdmin === 1,
    provider: String(row.provider || 'email'),
    providerId: row.providerId ? String(row.providerId) : undefined,
    emailVerified: row.emailVerified === 1,
    emailVerificationToken: row.emailVerificationToken ? String(row.emailVerificationToken) : undefined,
    emailVerificationExpires: row.emailVerificationExpires ? new Date(row.emailVerificationExpires) : undefined,
    resetPasswordToken: row.resetPasswordToken ? String(row.resetPasswordToken) : undefined,
    resetPasswordExpires: row.resetPasswordExpires ? new Date(row.resetPasswordExpires) : undefined,
    status: String(row.status || 'active'),
    managedUserIds: row.managedUserIds ? JSON.parse(String(row.managedUserIds)) : [],
    permissions: row.permissions ? JSON.parse(String(row.permissions)) : [],
    permissionsV2: row.permissionsV2 ? JSON.parse(String(row.permissionsV2)) : undefined,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export async function getUserByEmail(email: string): Promise<UserEntity | null> {
  await initBunnyCoreSchema();
  const normalizedEmail = email.toLowerCase().trim();
  const result = await bunnyExecute({
    sql: 'SELECT * FROM users WHERE lower(email) = ? LIMIT 1',
    args: [normalizedEmail]
  });
  if (result.rows.length === 0) return null;
  return mapRowToUser(result.rows[0]);
}

export async function getUserByPhone(phone: string): Promise<UserEntity | null> {
  await initBunnyCoreSchema();
  const result = await bunnyExecute({
    sql: 'SELECT * FROM users WHERE phone = ? LIMIT 1',
    args: [phone.trim()]
  });
  if (result.rows.length === 0) return null;
  return mapRowToUser(result.rows[0]);
}

export async function getUserById(id: string): Promise<UserEntity | null> {
  await initBunnyCoreSchema();
  const result = await bunnyExecute({
    sql: 'SELECT * FROM users WHERE id = ? LIMIT 1',
    args: [id]
  });
  if (result.rows.length === 0) return null;
  return mapRowToUser(result.rows[0]);
}

export async function getUserByProviderId(providerId: string): Promise<UserEntity | null> {
    await initBunnyCoreSchema();
    const result = await bunnyExecute({
      sql: 'SELECT * FROM users WHERE providerId = ? LIMIT 1',
      args: [providerId]
    });
    if (result.rows.length === 0) return null;
    return mapRowToUser(result.rows[0]);
}

export async function upsertUser(user: Partial<UserEntity> & { email: string }): Promise<UserEntity> {
  await initBunnyCoreSchema();
  const id = user.id || crypto.randomUUID();
  const now = new Date().toISOString();

  await bunnyExecute({
    sql: `
      INSERT INTO users (
        id, userId, email, phone, password, name, role, isAdmin, 
        provider, providerId, emailVerified, emailVerificationToken, emailVerificationExpires,
        resetPasswordToken, resetPasswordExpires, status, managedUserIds, 
        permissions, permissionsV2, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
      ON CONFLICT(email) DO UPDATE SET
        userId=excluded.userId,
        phone=excluded.phone,
        password=excluded.password,
        name=excluded.name,
        role=excluded.role,
        isAdmin=excluded.isAdmin,
        provider=excluded.provider,
        providerId=excluded.providerId,
        emailVerified=excluded.emailVerified,
        emailVerificationToken=excluded.emailVerificationToken,
        emailVerificationExpires=excluded.emailVerificationExpires,
        resetPasswordToken=excluded.resetPasswordToken,
        resetPasswordExpires=excluded.resetPasswordExpires,
        status=excluded.status,
        managedUserIds=excluded.managedUserIds,
        permissions=excluded.permissions,
        permissionsV2=excluded.permissionsV2,
        updatedAt=excluded.updatedAt
    `,
    args: [
      id,
      user.userId || null,
      user.email.toLowerCase().trim(),
      user.phone || null,
      user.password || null,
      user.name || null,
      user.role || 'user',
      user.isAdmin ? 1 : 0,
      user.provider || 'email',
      user.providerId || null,
      user.emailVerified ? 1 : 0,
      user.emailVerificationToken || null,
      user.emailVerificationExpires?.toISOString() || null,
      user.resetPasswordToken || null,
      user.resetPasswordExpires?.toISOString() || null,
      user.status || 'active',
      JSON.stringify(user.managedUserIds || []),
      JSON.stringify(user.permissions || []),
      user.permissionsV2 ? JSON.stringify(user.permissionsV2) : null,
      user.createdAt || now,
      now
    ]
  });

  const savedUser = await getUserByEmail(user.email);
  if (!savedUser) throw new Error("Failed to save or retrieve user.");
  return savedUser;
}

export async function recordUserSignin(input: { email: string; userId?: string; ipAddress?: string | null; userAgent?: string | null }) {
  await initBunnyCoreSchema();
  const timestamp = new Date().toISOString();
  await bunnyExecute({
    sql: 'INSERT INTO user_signins (id, email, userId, ipAddress, userAgent, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    args: [crypto.randomUUID(), input.email, input.userId || null, input.ipAddress || null, input.userAgent || null, timestamp]
  });
}
