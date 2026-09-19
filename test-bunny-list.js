const https = require('https');

const API_KEY = '1c3a685e-f412-4f3e-8878b8143ba7-5266-4e1f';
const ZONE = 'backupmobgo';

function fetchJson(urlPath) {
  return new Promise((resolve, reject) => {
    https.get(`https://storage.bunnycdn.com/${ZONE}${urlPath}`, {
      headers: { 'AccessKey': API_KEY, 'accept': 'application/json' }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    }).on('error', reject);
  });
}

async function listRecursive(path) {
  const items = await fetchJson(path);
  if (!items || !items.length) return;
  for (const item of items) {
    if (item.IsDirectory) {
      await listRecursive(`${path}${item.ObjectName}/`);
    } else {
      console.log(`${path}${item.ObjectName} - ${item.LastChanged} - ${(item.Length / 1024 / 1024).toFixed(2)} MB`);
    }
  }
}

listRecursive('/').catch(console.error);
