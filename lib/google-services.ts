import { GoogleAuth } from 'google-auth-library';

/**
 * Initialize Google Auth using credentials from environment variables
 */
function getGoogleAuth() {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    throw new Error('Google credentials are not fully set in .env.local');
  }

  // The private key needs to have literal \n characters converted to actual newlines
  const privateKey = process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n');

  return new GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/drive',
    ],
  });
}

/**
 * Append a row of data to a Google Sheet
 * @param spreadsheetId The ID from the Google Sheet URL
 * @param range The range, e.g., 'Sheet1!A:Z'
 * @param values A 2D array of values, e.g., [['John', 'Doe', 'john@example.com']]
 */
export async function appendToGoogleSheet(spreadsheetId: string, range: string, values: any[][]) {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: values,
      }),
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to append to Google Sheet: ${JSON.stringify(data)}`);
  }

  return data;
}

/**
 * Fetch data from a Google Sheet
 * @param spreadsheetId The ID from the Google Sheet URL
 * @param range The range, e.g., 'Sheet1!A:Z'
 */
export async function getFromGoogleSheet(spreadsheetId: string, range: string) {
  const auth = getGoogleAuth();
  const client = await auth.getClient();
  const token = await client.getAccessToken();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token.token}`,
        'Content-Type': 'application/json',
      },
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(`Failed to fetch from Google Sheet: ${JSON.stringify(data)}`);
  }

  return data.values || [];
}
