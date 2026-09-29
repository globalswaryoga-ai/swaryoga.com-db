import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config({ path: '.env.local' });

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-32-character-encryption-key';

function getEncryptionKey() {
  let key = ENCRYPTION_KEY;
  if (key.length < 32) key = key.padEnd(32, '0');
  else if (key.length > 32) key = key.substring(0, 32);
  return Buffer.from(key, 'utf-8');
}

function encryptCredential(credential) {
  if (!credential) return '';
  const algorithm = 'aes-256-gcm';
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let encrypted = cipher.update(credential, 'utf-8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

const client = createClient({
  url: process.env.BUNNY_DATABASE_URL.trim(),
  authToken: process.env.BUNNY_DATABASE_AUTH_TOKEN.trim(),
});

async function saveAccount(platform, accountId, accountName, accountHandle, accessToken, refreshToken = '', metadata = {}) {
  const encryptedAccessToken = encryptCredential(accessToken);
  const encryptedRefreshToken = refreshToken ? encryptCredential(refreshToken) : '';
  const documentId = crypto.randomUUID();
  const now = new Date().toISOString();

  const accountObj = {
    _id: documentId,
    scopeType: 'super_admin',
    scopeKey: 'super_admin',
    ownerUserId: 'super_admin',
    platform,
    accountName,
    accountHandle,
    accountId,
    accessToken: encryptedAccessToken,
    refreshToken: encryptedRefreshToken,
    metadata,
    isConnected: true,
    connectedAt: now,
    createdAt: now,
    updatedAt: now,
  };

  console.log(`Saving ${platform} account (${accountName})...`);

  // 1. Save to social_media_accounts_sql
  await client.execute({
    sql: `INSERT INTO social_media_accounts_sql
      (document_id,scope_type,scope_key,owner_user_id,tenant_slug,platform,account_id,account_name,account_handle,is_connected,connected_at,updated_at,data_json)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(scope_type,scope_key,platform,account_id) DO UPDATE SET
        document_id=excluded.document_id,owner_user_id=excluded.owner_user_id,tenant_slug=excluded.tenant_slug,
        account_name=excluded.account_name,account_handle=excluded.account_handle,is_connected=excluded.is_connected,
        connected_at=COALESCE(social_media_accounts_sql.connected_at, excluded.connected_at),updated_at=excluded.updated_at,data_json=excluded.data_json`,
    args: [
      documentId, 'super_admin', 'super_admin', 'super_admin', null, platform, accountId, accountName, accountHandle, 1, now, now, JSON.stringify(accountObj)
    ]
  });

  // 2. Save to mongo_documents
  await client.execute({
    sql: `INSERT INTO mongo_documents (source_database, collection_name, document_id, document_json, created_at, updated_at)
      VALUES ('swaryoga', 'socialmediaaccounts', ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      ON CONFLICT(source_database, collection_name, document_id) DO UPDATE SET
        document_json=excluded.document_json, updated_at=CURRENT_TIMESTAMP`,
    args: [documentId, JSON.stringify(accountObj)]
  });

  console.log(`Saved ${platform} (${accountName}) successfully!`);
}

async function run() {
  // 1. Facebook Page & Instagram Business Account
  const fbPageId = process.env.META_FACEBOOK_PAGE_ID;
  const fbToken = process.env.META_PAGE_ACCESS_TOKEN;
  const igAccountId = process.env.META_INSTAGRAM_ACCOUNT_ID;

  if (fbPageId && fbToken) {
    // Fetch FB Page details from Graph API
    try {
      const fbRes = await fetch(`https://graph.facebook.com/v24.0/${fbPageId}?fields=name,username,picture{url}&access_token=${fbToken}`);
      const fbData = await fbRes.json();
      const pageName = fbData.name || 'Swar Yoga Facebook Page';
      const pageHandle = fbData.username ? `@${fbData.username}` : '@swaryoga';
      const profileImage = fbData.picture?.data?.url || '';

      await saveAccount('facebook', fbPageId, pageName, pageHandle, fbToken, '', {
        profileImage,
        messengerConnected: true,
        linkedInstagramAccountId: igAccountId || null,
      });

      // Instagram
      if (igAccountId) {
        const igRes = await fetch(`https://graph.facebook.com/v24.0/${igAccountId}?fields=name,username,profile_picture_url,followers_count,media_count&access_token=${fbToken}`);
        const igData = await igRes.json();
        const igName = igData.name || igData.username || 'Swar Yoga Instagram';
        const igHandle = igData.username ? `@${igData.username}` : '@swar.yoga';
        const igProfileImage = igData.profile_picture_url || '';

        await saveAccount('instagram', igAccountId, igName, igHandle, fbToken, '', {
          autoConnectedVia: 'facebook',
          linkedPageId: fbPageId,
          profileImage: igProfileImage,
          followers: igData.followers_count || 0,
          postsCount: igData.media_count || 0,
        });
      }
    } catch (err) {
      console.error("Facebook/Instagram connect error:", err.message);
    }
  }

  // 2. WhatsApp Business
  const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const waToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const waWabaId = process.env.WHATSAPP_BUSINESS_ACCOUNT_ID;

  if (waPhoneId && waToken) {
    await saveAccount('whatsapp', waPhoneId, 'Swar Yoga WhatsApp Business', '+919779006820', waToken, '', {
      wabaId: waWabaId,
      phoneId: waPhoneId,
    });
  }

  // 3. Zoom
  const zoomAccountId = process.env.ZOOM_ACCOUNT_ID;
  const zoomEmail = process.env.ZOOM_USER_EMAIL || 'swarsakshi9@gmail.com';
  const zoomAccessToken = process.env.ZOOM_USER_ACCESS_TOKEN || '';

  if (zoomAccountId) {
    await saveAccount('zoom', zoomAccountId, 'Swar Yoga Zoom Account', zoomEmail, zoomAccessToken, '', {
      accountId: zoomAccountId,
      email: zoomEmail,
      sdkKey: process.env.ZOOM_SDK_KEY,
    });
  }

  // 4. LinkedIn
  const linkedinOrgId = process.env.LINKEDIN_ORGANIZATION_ID;
  if (linkedinOrgId) {
    await saveAccount('linkedin', linkedinOrgId, 'Swar Yoga LinkedIn', 'swar-yoga', process.env.LINKEDIN_CLIENT_SECRET || '', '', {
      organizationId: linkedinOrgId,
      clientId: process.env.LINKEDIN_CLIENT_ID,
    });
  }

  // 5. Google Drive
  const googleDriveClientId = process.env.GOOGLE_DRIVE_CLIENT_ID;
  if (googleDriveClientId) {
    await saveAccount('google_drive', googleDriveClientId, 'Swar Yoga Google Drive', 'swarsakshi9@gmail.com', process.env.GOOGLE_DRIVE_CLIENT_SECRET || '', '', {
      clientId: googleDriveClientId,
      email: 'swarsakshi9@gmail.com',
    });
  }

  // 6. Canva
  const canvaClientId = process.env.CANVA_CLIENT_ID;
  if (canvaClientId) {
    await saveAccount('canva', canvaClientId, 'Swar Yoga Canva', 'swaryoga', process.env.CANVA_CLIENT_SECRET || '', '', {
      clientId: canvaClientId,
    });
  }
}

run().catch(console.error);
