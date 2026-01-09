const { S3Client, PutObjectCommand, HeadBucketCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env.local' });

async function diagnose() {
  console.log('--- S3 DIAGNOSTICS ---');
  console.log('Region:', process.env.AWS_REGION);
  console.log('Bucket:', process.env.AWS_S3_BUCKET);
  console.log('Access Key ID:', process.env.AWS_ACCESS_KEY_ID ? 'PRESENT (' + process.env.AWS_ACCESS_KEY_ID.substring(0,6) + '...)' : 'MISSING');
  console.log('Secret Key:', process.env.AWS_SECRET_ACCESS_KEY ? 'PRESENT (Length: ' + process.env.AWS_SECRET_ACCESS_KEY.length + ')' : 'MISSING');

  const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
  });

  try {
    console.log('\n1. Checking Bucket existence...');
    await s3Client.send(new HeadBucketCommand({ Bucket: process.env.AWS_S3_BUCKET }));
    console.log('✅ Bucket exists and is accessible.');
  } catch (err) {
    console.log('❌ Bucket Check Failed:', err.name, '(', err.message, ')');
  }

  try {
    console.log('\n2. Attempting test upload with ACL public-read...');
    const command = new PutObjectCommand({
      Bucket: process.env.AWS_S3_BUCKET,
      Key: 'diagnostics-test-' + Date.now() + '.txt',
      Body: 'test content',
      ACL: 'public-read'
    });
    await s3Client.send(command);
    console.log('✅ Upload with public-read SUCCESS.');
  } catch (err) {
    console.log('❌ Upload with public-read FAILED:', err.name, '(', err.message, ')');
    
    try {
        console.log('\n3. Attempting test upload WITHOUT ACL...');
        const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET,
        Key: 'diagnostics-test-no-acl-' + Date.now() + '.txt',
        Body: 'test content'
        });
        await s3Client.send(command);
        console.log('✅ Upload WITHOUT ACL SUCCESS.');
        console.log('💡 TIP: Your bucket likely has "Block Public Access" enabled. You should remove the ACL property from your code or update bucket settings.');
    } catch (err2) {
        console.log('❌ Upload WITHOUT ACL also FAILED:', err2.name, '(', err2.message, ')');
    }
  }
}

diagnose();
