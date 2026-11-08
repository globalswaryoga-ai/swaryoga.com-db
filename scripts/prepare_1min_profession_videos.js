const fs = require('fs');
const https = require('https');
const { execSync } = require('child_process');
const path = require('path');

const BUNNY_KEY = 'e9e4333a-5bde-4f1f-acbd5c838aad-92c3-4f2d';
const BUNNY_ZONE = 'swaryogadb';
const CDN_BASE = 'https://swaryogacrm.b-cdn.net';

const OUT_DIR = path.join(__dirname, '../public/avatar-studio/base-templates');
fs.mkdirSync(OUT_DIR, { recursive: true });

// Source videos on CDN
const SRC_ACADEMIC = `${CDN_BASE}/avatar-studio/videos/083ce51f3ddaa878e1e10dfce9d5ee66e5d74c21badb5b7c3cb8be0832dca84c.mp4`;
const SRC_EDUCATOR = `${CDN_BASE}/avatar-studio/videos/e1a6798078bbbf8cebb1646e72cde71bcb82663c56e1a20e8e50b2e9575f309d.mp4`;
const SRC_SPIRITUAL = `${CDN_BASE}/users/mohan-rag-avatar/training-vault/1793151988088-hgfwl8-Shad_Ripu_Explained___6_Enemies_of_the_Mind_That_Destroy_Peace.mp4`;

console.log('=== PREPARING 1-MINUTE 1080P BASE PRESENTER VIDEOS ===');

const templates = [
  {
    id: 'academic_lecture',
    src: SRC_ACADEMIC,
    ss: '00:00:10',
    t: '60',
    title: 'University Professor & Academic Presentation (1-Min 1080p)',
  },
  {
    id: 'master_educator',
    src: SRC_EDUCATOR,
    ss: '00:00:20',
    t: '60',
    title: 'School & College Educator Masterclass (1-Min 1080p)',
  },
  {
    id: 'spiritual_acharya',
    src: SRC_SPIRITUAL,
    ss: '00:00:15',
    t: '60',
    title: 'Spiritual Guru & Swar Yoga Acharya (1-Min 1080p)',
  },
  {
    id: 'executive_boardroom',
    src: SRC_ACADEMIC,
    ss: '00:01:15',
    t: '60',
    title: 'Corporate Executive & Financial Leadership (1-Min 1080p)',
  },
  {
    id: 'integrative_health',
    src: SRC_EDUCATOR,
    ss: '00:01:25',
    t: '60',
    title: 'Integrative Physician & Healthcare Clinical Consultation (1-Min 1080p)',
  },
  {
    id: 'media_broadcast',
    src: SRC_ACADEMIC,
    ss: '00:02:15',
    t: '60',
    title: 'Media Broadcast & Keynote Anchor (1-Min 1080p)',
  },
  {
    id: 'science_research',
    src: SRC_EDUCATOR,
    ss: '00:02:30',
    t: '60',
    title: 'Scientific Research & Physiology Demonstration (1-Min 1080p)',
  },
];

function uploadToBunny(localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const fileData = fs.readFileSync(localPath);
    console.log(`Uploading ${localPath} (${(fileData.length / 1024 / 1024).toFixed(2)} MB) to Bunny: ${remotePath}...`);
    const req = https.request({
      host: 'storage.bunnycdn.com',
      path: `/${BUNNY_ZONE}/${remotePath}`,
      method: 'PUT',
      headers: {
        AccessKey: BUNNY_KEY,
        'Content-Type': 'video/mp4',
        'Content-Length': fileData.length,
      },
    }, (res) => {
      console.log(`  -> Status: ${res.statusCode}`);
      if (res.statusCode === 201 || res.statusCode === 200) {
        resolve(`${CDN_BASE}/${remotePath}`);
      } else {
        let err = '';
        res.on('data', d => err += d);
        res.on('end', () => reject(new Error(`Upload failed: ${res.statusCode} ${err}`)));
      }
    });
    req.on('error', reject);
    req.write(fileData);
    req.end();
  });
}

async function run() {
  for (const t of templates) {
    const outName = `${t.id}_1min_1080p.mp4`;
    const localPath = path.join(OUT_DIR, outName);

    console.log(`\nCutting 1-minute clip: ${outName}...`);
    // Cut exact 60 seconds, 1080p, re-encode to clean H.264 + AAC
    const cmd = `ffmpeg -y -ss ${t.ss} -i "${t.src}" -t ${t.t} -vf "scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1" -c:v libx264 -preset fast -crf 22 -c:a aac -b:a 192k -ar 48000 "${localPath}"`;
    try {
      execSync(cmd, { stdio: 'inherit' });
      console.log(`✓ Created local: ${localPath}`);

      const remotePath = `avatar-studio/base-templates/${outName}`;
      const cdnUrl = await uploadToBunny(localPath, remotePath);
      console.log(`✓ Uploaded to Bunny CDN: ${cdnUrl}`);
    } catch (err) {
      console.error(`Error processing ${t.id}:`, err.message);
    }
  }

  console.log('\n=== ALL 1-MINUTE 1080P BASE VIDEOS GENERATED & UPLOADED ===');
}

run();
