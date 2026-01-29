const { S3Client, ListObjectsV2Command, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
require('dotenv').config({ path: '.env.local' });

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

async function test() {
  console.log('=== AWS S3 Test ===');
  console.log('Region:', process.env.AWS_REGION);
  console.log('Bucket:', process.env.AWS_S3_BUCKET);
  console.log('Key ID:', process.env.AWS_ACCESS_KEY_ID?.substring(0,10) + '...');
  
  const bucket = process.env.AWS_S3_BUCKET;
  
  // Test 1: List objects
  try {
    const result = await s3Client.send(new ListObjectsV2Command({
      Bucket: bucket,
      MaxKeys: 5,
      Prefix: 'uploads/'
    }));
    console.log('\n✅ S3 LIST works!');
    console.log('Found', result.Contents?.length || 0, 'objects');
    if (result.Contents?.length > 0) {
      console.log('Sample:', result.Contents[0].Key);
    }
  } catch (err) {
    console.log('\n❌ S3 LIST Error:', err.message);
  }
  
  // Test 2: Upload a test file
  try {
    const testKey = 'test/aws-test-' + Date.now() + '.txt';
    await s3Client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: testKey,
      Body: 'Test upload from swaryoga ' + new Date().toISOString(),
      ContentType: 'text/plain'
    }));
    console.log('\n✅ S3 UPLOAD works! Key:', testKey);
    
    // Test 3: Generate signed URL
    const signedUrl = await getSignedUrl(s3Client, new GetObjectCommand({
      Bucket: bucket,
      Key: testKey
    }), { expiresIn: 3600 });
    console.log('\n✅ Signed URL generated:', signedUrl.substring(0, 80) + '...');
    
  } catch (err) {
    console.log('\n❌ S3 UPLOAD Error:', err.message);
  }
  
  console.log('\n=== Test Complete ===');
}

test().catch(console.error);
