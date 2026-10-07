const fs = require('fs');
const file = 'app/api/admin/canva/meta-ai/route.ts';
let code = fs.readFileSync(file, 'utf8');

if (!code.includes("uploadToBunnyStorage")) {
  code = code.replace("import { cookies } from 'next/headers';", "import { cookies } from 'next/headers';\nimport { uploadToBunnyStorage } from '@/lib/bunny-storage';");
}

// Find where imageUrl and videoUrl are generated and replace them with bunny upload logic
const replaceTarget = `
        imageUrl = Array.isArray(output) ? output[0] : output;

        // 3. Generate Video if requested
        if (shouldGenerateVideo && imageUrl) {
`;
const newTarget = `
        imageUrl = Array.isArray(output) ? output[0] : output;
        
        if (imageUrl) {
           console.log("Uploading generated image to Bunny Storage...");
           try {
             const imgRes = await fetch(imageUrl);
             const imgBuffer = Buffer.from(await imgRes.arrayBuffer());
             imageUrl = await uploadToBunnyStorage(imgBuffer, 'meta-ai-image-' + Date.now() + '.webp', { contentType: 'image/webp' });
             console.log("Bunny Storage Image URL:", imageUrl);
           } catch(e) {
             console.error("Failed to upload image to Bunny Storage:", e);
           }
        }

        // 3. Generate Video if requested
        if (shouldGenerateVideo && imageUrl) {
`;
code = code.replace(replaceTarget, newTarget);

const replaceVideoTarget = `
           // If it returns a string URL directly (some models return just the URL, some return an array)
           if (typeof videoOutput === 'string' && videoOutput.endsWith('.mp4')) {
               videoUrl = videoOutput;
           }
        }
`;
const newVideoTarget = `
           // If it returns a string URL directly (some models return just the URL, some return an array)
           if (typeof videoOutput === 'string' && videoOutput.endsWith('.mp4')) {
               videoUrl = videoOutput;
           }
           
           if (videoUrl) {
             console.log("Uploading generated video to Bunny Storage...");
             try {
               const vidRes = await fetch(videoUrl);
               const vidBuffer = Buffer.from(await vidRes.arrayBuffer());
               videoUrl = await uploadToBunnyStorage(vidBuffer, 'meta-ai-video-' + Date.now() + '.mp4', { contentType: 'video/mp4' });
               console.log("Bunny Storage Video URL:", videoUrl);
             } catch(e) {
               console.error("Failed to upload video to Bunny Storage:", e);
             }
           }
        }
`;
code = code.replace(replaceVideoTarget, newVideoTarget);

fs.writeFileSync(file, code);
console.log("Patched bunny storage");
