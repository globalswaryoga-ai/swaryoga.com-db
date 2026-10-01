const crypto = require('crypto');
const clientId = 'OC-AaD2cb5nXLM9';
const redirectUri = 'http://127.0.0.1:3000/api/admin/canva/callback';
const state = Math.random().toString(36).substring(7);
const codeVerifier = crypto.randomBytes(32).toString('base64url');
const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
const scopes = [
  'folder:permission:write',
  'folder:read',
  'design:meta:write',
  'comment:write',
  'design:content:read',
  'folder:write',
  'design:permission:write',
  'folder:permission:read',
  'app:write',
  'asset:read',
  'comment:read',
  'brandtemplate:content:write',
  'app:read',
  'brandtemplate:content:read',
  'profile:read',
  'design:meta:read',
  'asset:write',
  'brandtemplate:meta:read',
  'design:content:write',
  'design:permission:read'
].join(' ');
const authUrl = new URL('https://www.canva.com/api/oauth/authorize');
authUrl.searchParams.append('response_type', 'code');
authUrl.searchParams.append('client_id', clientId);
authUrl.searchParams.append('redirect_uri', redirectUri);
authUrl.searchParams.append('scope', scopes);
authUrl.searchParams.append('state', state);
authUrl.searchParams.append('code_challenge', codeChallenge);
authUrl.searchParams.append('code_challenge_method', 'S256');
console.log(authUrl.toString());
