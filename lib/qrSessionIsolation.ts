export function normalizeConnectedPhone(phone: string): string {
  return String(phone || '').split(':')[0].split('@')[0].replace(/\D/g, '');
}
export async function getAuthStatePhone(userId: string): Promise<string> { return ''; }
export async function findOtherUsersWithConnectedPhone(userId: string, connectedPhone: string) { return []; }
export async function purgeQrSnapshotsForUser(userId: string, connectedPhone?: string) { return { deletedChats: 0, deletedMessages: 0 }; }
export async function purgeQrSnapshotsForOtherPhones(userId: string, keepConnectedPhone: string) { return { deletedChats: 0, deletedMessages: 0 }; }
export async function clearQrSessionContamination(userId: string, options: any = {}) { return { deletedChats: 0, deletedMessages: 0, deletedAuthDocs: 0 }; }
export async function reconcileQrConnectedPhone(userId: string, options: any = {}) {
  const storedPhone = normalizeConnectedPhone(options.storedPhone || '');
  return {
    storedPhone,
    authStatePhone: '',
    resolvedPhone: storedPhone,
    phoneChangedAt: options.phoneChangedAt || null,
    duplicateOwners: [],
    resetPerformed: false,
  };
}
