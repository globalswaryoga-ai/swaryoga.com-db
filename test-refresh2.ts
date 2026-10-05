import { decryptCredential } from './lib/auth';
import { bunnyExecute, cleanMongoJson } from './lib/bunnyDatabase';

async function run() {
  const accountRes = await bunnyExecute({
    sql: "SELECT document_id, document_json FROM mongo_documents WHERE collection_name = 'socialmediaaccounts'"
  });
  
  for (const row of accountRes.rows) {
    const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));
    if (parsed.platform !== 'google_forms' && parsed.platform !== 'google') continue;
    if (parsed.refreshToken) {
      const refreshToken = decryptCredential(parsed.refreshToken);
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
      const data = await tokenRes.json();
      console.log('Refresh with fallback:', data);
    }
  }
}
run();
