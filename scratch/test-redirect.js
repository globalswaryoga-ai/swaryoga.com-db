const nextUrl = new URL('http://localhost:3000/api/admin/social-media/youtube/oauth');

const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
console.log(baseUrl + '/api/admin/social-media/youtube/oauth/callback');
