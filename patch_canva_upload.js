const fs = require('fs');
const file = 'app/api/admin/canva/meta-ai/route.ts';
let code = fs.readFileSync(file, 'utf8');

const helperFunction = `

async function uploadImageToCanva(imageUrl, accessToken) {
  try {
    console.log('Downloading image from Replicate...', imageUrl);
    const imgRes = await fetch(imageUrl);
    const imgBuffer = await imgRes.arrayBuffer();

    console.log('Initiating Canva asset upload...');
    const initRes = await fetch('https://api.canva.com/rest/v1/asset-uploads', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${accessToken}\`,
        'Content-Type': 'application/json'
      }
    });
    const initData = await initRes.json();
    if (!initData.job || !initData.job.upload_url) {
      console.error('Failed to init Canva upload:', initData);
      return null;
    }

    const { id: jobId, upload_url: uploadUrl } = initData.job;

    console.log('Uploading binary to Canva...', jobId);
    await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Length': imgBuffer.byteLength.toString(), 'Content-Type': 'image/webp' },
      body: imgBuffer
    });

    console.log('Polling Canva upload status...');
    let assetId = null;
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 2000));
      const statusRes = await fetch(\`https://api.canva.com/rest/v1/asset-uploads/\${jobId}\`, {
        headers: { 'Authorization': \`Bearer \${accessToken}\` }
      });
      const statusData = await statusRes.json();
      if (statusData.job && statusData.job.status === 'success') {
        assetId = statusData.job.asset.id;
        break;
      } else if (statusData.job && statusData.job.status === 'failed') {
        console.error('Canva upload failed:', statusData);
        break;
      }
    }
    return assetId;
  } catch (e) {
    console.error('Error uploading image to Canva:', e);
    return null;
  }
}
`;

// Insert the helper function right before the POST export
code = code.replace('export async function POST', helperFunction + '\nexport async function POST');

fs.writeFileSync(file, code);
console.log("Added Canva upload helper");
