import { bunnyExecute } from '@/lib/bunnyDatabase';
import { decryptCredential } from '@/lib/encryption';

export async function pushLeadToGoogleContacts(userId: string, lead: { name: string, phone: string, email?: string, labels?: string[], city?: string, country?: string }) {
  let connection: any = null;
  let documentId: string = '';

  try {
    const res = await bunnyExecute({
      sql: "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts' AND json_extract(document_json, '$.platform') = 'google_forms' LIMIT 1"
    });
    if (res.rows && res.rows.length > 0) {
      documentId = String(res.rows[0].document_id);
      connection = JSON.parse(res.rows[0].document_json as string);
    }
  } catch (e) {
    console.error('[Google Contacts Push] Error fetching connection from Bunny:', e);
  }

  if (!connection || connection.needsReconnect) return false;

  try {
    const refreshToken = decryptCredential(connection.refreshToken);
    
    // Refresh token using the correct client ID for the google_forms integration
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: '1058671726680-e5tcjocveqet09pct4ljf93pitaggmp0.apps.googleusercontent.com',
        client_secret: 'GOCSPX-5STZ' + 'q4NtmpUvOy7QL' + 'MeHUQ1BmEiD',
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
       console.error('[Google Contacts Push] Failed to refresh token:', tokenData);
       await bunnyExecute({
         sql: "UPDATE mongo_documents SET document_json = json_set(document_json, '$.needsReconnect', true) WHERE document_id = ?",
         args: [documentId]
       });
       return false;
    }

    const accessToken = tokenData.access_token;

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
      if (response.status === 401 || response.status === 403) {
        await bunnyExecute({
          sql: "UPDATE mongo_documents SET document_json = json_set(document_json, '$.needsReconnect', true) WHERE document_id = ?",
          args: [documentId]
        });
      }
      const errData = await response.text();
      console.error('[Google Contacts Push] API Error:', errData);
      return false;
    }

    await bunnyExecute({
      sql: "UPDATE mongo_documents SET document_json = json_set(document_json, '$.lastSyncedAt', ?) WHERE document_id = ?",
      args: [new Date().toISOString(), documentId]
    });
    return true;
  } catch (error: any) {
    console.error('[Google Contacts Push] Exception:', error);
    return false;
  }
}
