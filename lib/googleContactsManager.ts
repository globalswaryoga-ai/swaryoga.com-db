import { getQrWhatsappGoogleServiceConnection } from '@/lib/schemas/enterpriseSchemas';
import { decryptCredential } from '@/lib/encryption';
import { refreshAccessToken } from '@/lib/googleDriveSync';
import { connectDB } from '@/lib/db';

export async function pushLeadToGoogleContacts(userId: string, lead: { name: string, phone: string, email?: string, labels?: string[], city?: string, country?: string }) {
  await connectDB();
  const Connection = getQrWhatsappGoogleServiceConnection();
  const connection = await Connection.findOne({ userId, service: 'contacts' }).lean() as any;
  if (!connection || connection.needsReconnect) return false;

  try {
    const refreshToken = decryptCredential(connection.refreshToken);
    const accessToken = await refreshAccessToken(refreshToken);

    const displayName = lead.labels && lead.labels.length > 0 
      ? `${lead.name} - ${lead.labels.join(', ')}` 
      : lead.name;

    const body: any = {
      names: [{ givenName: displayName }],
      phoneNumbers: [{ value: lead.phone }],
    };

    if (lead.email) {
      body.emailAddresses = [{ value: lead.email }];
    }

    if (lead.city || lead.country) {
      body.addresses = [{}];
      if (lead.city) body.addresses[0].city = lead.city;
      if (lead.country) body.addresses[0].country = lead.country;
    }

    const response = await fetch(
      'https://people.googleapis.com/v1/people:createContact',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      if (response.status === 401) {
        await Connection.updateOne({ _id: connection._id }, { $set: { needsReconnect: true, lastError: 'invalid_grant' } });
      }
      const errData = await response.text();
      console.error('[Google Contacts Push] Error:', errData);
      return false;
    }

    await Connection.updateOne({ _id: connection._id }, { $set: { lastSyncedAt: new Date(), lastError: '' } });
    return true;
  } catch (error: any) {
    console.error('[Google Contacts Push] Exception:', error);
    if (error.code === 'invalid_grant' || error.message?.includes('invalid_grant')) {
      await Connection.updateOne({ _id: connection._id }, { $set: { needsReconnect: true, lastError: 'invalid_grant' } });
    } else {
      await Connection.updateOne({ _id: connection._id }, { $set: { lastError: error.message || 'unknown' } });
    }
    return false;
  }
}
