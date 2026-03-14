import mongoose from 'mongoose';
import { getCRMUserSettings, getQrWhatsAppChat, getQrWhatsAppMessage } from '@/lib/schemas/enterpriseSchemas';

const AUTH_COLLECTION = 'baileys_auth_state';
const AUTH_DB_NAME = process.env.MONGODB_CRM_DB_NAME || 'swaryoga_admin_crm';

function escapeRegex(input: string): string {
  return String(input || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function normalizeConnectedPhone(phone: string): string {
  return String(phone || '').split(':')[0].split('@')[0].replace(/\D/g, '');
}

export async function getAuthStatePhone(userId: string): Promise<string> {
  try {
    const db = mongoose.connection.useDb(AUTH_DB_NAME);
    const doc: any = await db.collection(AUTH_COLLECTION).findOne(
      { key: `${userId}:creds` },
      { projection: { value: 1 } }
    );

    return normalizeConnectedPhone(
      doc?.value?.me?.id ||
      doc?.value?.account?.details?.phoneNumber ||
      ''
    );
  } catch (error) {
    console.warn('[qrSessionIsolation] Failed to derive auth-state phone:', error);
    return '';
  }
}

export async function findOtherUsersWithConnectedPhone(userId: string, connectedPhone: string) {
  const phone = normalizeConnectedPhone(connectedPhone);
  if (!phone) return [];

  const CRMUserSettings = getCRMUserSettings();
  const rows = await CRMUserSettings.find(
    {
      userId: { $ne: userId },
      qrConnectedPhoneNumber: phone,
    },
    { userId: 1, permanentTenantId: 1, qrWhatsappEnabled: 1 }
  )
    .sort({ userId: 1 })
    .lean();

  return rows as Array<{ userId: string; permanentTenantId?: string; qrWhatsappEnabled?: boolean }>;
}

export async function purgeQrSnapshotsForUser(userId: string, connectedPhone?: string) {
  const QrChat = getQrWhatsAppChat();
  const QrMsg = getQrWhatsAppMessage();
  const phone = normalizeConnectedPhone(connectedPhone || '');
  const filter = phone ? { userId, connectedPhone: phone } : { userId };

  const [chatResult, msgResult] = await Promise.all([
    QrChat.deleteMany(filter),
    QrMsg.deleteMany(filter),
  ]);

  return {
    deletedChats: chatResult.deletedCount || 0,
    deletedMessages: msgResult.deletedCount || 0,
  };
}

export async function purgeQrSnapshotsForOtherPhones(userId: string, keepConnectedPhone: string) {
  const keepPhone = normalizeConnectedPhone(keepConnectedPhone);
  const QrChat = getQrWhatsAppChat();
  const QrMsg = getQrWhatsAppMessage();

  if (!keepPhone) {
    return purgeQrSnapshotsForUser(userId);
  }

  const filter = { userId, connectedPhone: { $ne: keepPhone } };
  const [chatResult, msgResult] = await Promise.all([
    QrChat.deleteMany(filter),
    QrMsg.deleteMany(filter),
  ]);

  return {
    deletedChats: chatResult.deletedCount || 0,
    deletedMessages: msgResult.deletedCount || 0,
  };
}

export async function clearQrSessionContamination(
  userId: string,
  options: {
    connectedPhone?: string;
    clearAuth?: boolean;
    clearAllSnapshots?: boolean;
  } = {}
) {
  const CRMUserSettings = getCRMUserSettings();
  const db = mongoose.connection.useDb(AUTH_DB_NAME);
  const phone = normalizeConnectedPhone(options.connectedPhone || '');

  const snapshotResult = options.clearAllSnapshots
    ? await purgeQrSnapshotsForUser(userId)
    : await purgeQrSnapshotsForUser(userId, phone);

  let deletedAuthDocs = 0;
  if (options.clearAuth) {
    const authResult = await db.collection(AUTH_COLLECTION).deleteMany({
      key: { $regex: `^${escapeRegex(userId)}:` },
    });
    deletedAuthDocs = authResult.deletedCount || 0;
  }

  await CRMUserSettings.updateOne(
    { userId },
    {
      $unset: {
        qrConnectedPhoneNumber: 1,
        qrPhoneChangedAt: 1,
      },
    },
    { upsert: true }
  );

  return {
    ...snapshotResult,
    deletedAuthDocs,
  };
}

export async function reconcileQrConnectedPhone(
  userId: string,
  options: {
    isSuperAdmin?: boolean;
    storedPhone?: string;
    phoneChangedAt?: Date | null;
  } = {}
) {
  const CRMUserSettings = getCRMUserSettings();
  const storedPhone = normalizeConnectedPhone(options.storedPhone || '');
  const authStatePhone = await getAuthStatePhone(userId);
  const candidatePhone = authStatePhone || storedPhone;

  if (candidatePhone) {
    const duplicateOwners = await findOtherUsersWithConnectedPhone(userId, candidatePhone);
    if (duplicateOwners.length > 0 && !options.isSuperAdmin) {
      const cleanup = await clearQrSessionContamination(userId, {
        connectedPhone: candidatePhone,
        clearAuth: true,
        clearAllSnapshots: true,
      });

      console.warn(
        `[qrSessionIsolation] Reset contaminated QR session for ${userId} (phone=${candidatePhone}) because it is already attached to ${duplicateOwners.map((owner) => owner.userId).join(', ')}`,
        cleanup
      );

      return {
        storedPhone: '',
        authStatePhone: '',
        resolvedPhone: '',
        phoneChangedAt: null,
        duplicateOwners,
        resetPerformed: true,
      };
    }
  }

  if (authStatePhone && authStatePhone !== storedPhone) {
    const nextPhoneChangedAt = storedPhone ? new Date() : (options.phoneChangedAt || null);
    const update: Record<string, any> = {
      qrConnectedPhoneNumber: authStatePhone,
    };
    if (storedPhone && storedPhone !== authStatePhone) {
      update.qrPhoneChangedAt = nextPhoneChangedAt;
      await purgeQrSnapshotsForOtherPhones(userId, authStatePhone);
    }

    await CRMUserSettings.updateOne(
      { userId },
      { $set: update },
      { upsert: true }
    );

    return {
      storedPhone: authStatePhone,
      authStatePhone,
      resolvedPhone: authStatePhone,
      phoneChangedAt: nextPhoneChangedAt,
      duplicateOwners: [],
      resetPerformed: false,
    };
  }

  if (!storedPhone && authStatePhone) {
    await CRMUserSettings.updateOne(
      { userId },
      { $set: { qrConnectedPhoneNumber: authStatePhone } },
      { upsert: true }
    );
  }

  return {
    storedPhone: storedPhone || authStatePhone,
    authStatePhone,
    resolvedPhone: storedPhone || authStatePhone,
    phoneChangedAt: options.phoneChangedAt || null,
    duplicateOwners: [],
    resetPerformed: false,
  };
}