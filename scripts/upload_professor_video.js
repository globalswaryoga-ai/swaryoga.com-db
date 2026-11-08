const fs = require('fs');
const https = require('https');

// Load .env.local manually
const envContent = fs.readFileSync('/var/www/swaryoga/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    if (val.startsWith("'") && val.endsWith("'")) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const key = env.BUNNY_STORAGE_API_KEY || env.BUNNY_API_KEY;
const zone = env.BUNNY_STORAGE_ZONE || 'swaryogacrm';
const region = env.BUNNY_STORAGE_REGION || 'sg';
const pullZone = env.BUNNY_PULL_ZONE_URL || 'https://swaryogacrm.b-cdn.net';

console.log('Target Zone:', zone, 'Region:', region, 'Key present:', !!key);

const filePath = '/var/www/swaryoga/public/avatar-studio/generated/mohan_sir_university_professor_30s.mp4';
const fileData = fs.readFileSync(filePath);
console.log('Read local file:', fileData.length, 'bytes');

const host = (region && region !== 'de') ? (region + '.storage.bunnycdn.com') : 'storage.bunnycdn.com';
const targetPath = '/' + zone + '/avatar-studio/generated/mohan_sir_university_professor_30s.mp4';

const req = https.request({
  host: host,
  path: targetPath,
  method: 'PUT',
  headers: {
    'AccessKey': key,
    'Content-Type': 'video/mp4',
    'Content-Length': fileData.length
  }
}, (res) => {
  console.log('Upload HTTP status:', res.statusCode);
  res.on('data', d => process.stdout.write(d));
  res.on('end', () => {
    console.log('\nFinal CDN URL:', pullZone + '/avatar-studio/generated/mohan_sir_university_professor_30s.mp4');
  });
});

req.on('error', console.error);
req.write(fileData);
req.end();

