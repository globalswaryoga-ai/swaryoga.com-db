import fs from 'fs';
const file = 'app/api/admin/crm/meta-leads/sync/route.ts';
let code = fs.readFileSync(file, 'utf8');

const replacement = `
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'META_PAGE_ACCESS_TOKEN is missing' }, { status: 500 });
    }

    const appSecret = process.env.META_APP_SECRET;
    let proofParam = '';
    if (appSecret) {
      const crypto = require('crypto');
      const appsecret_proof = crypto.createHmac('sha256', appSecret).update(token).digest('hex');
      proofParam = \`&appsecret_proof=\${appsecret_proof}\`;
    }

    // Fetch leads from Meta
    const res = await fetch(\`https://graph.facebook.com/v24.0/\${formId}/leads?access_token=\${token}\${proofParam}\`);
`;

code = code.replace(
`
    const token = process.env.META_PAGE_ACCESS_TOKEN;
    if (!token) {
      return NextResponse.json({ error: 'META_PAGE_ACCESS_TOKEN is missing' }, { status: 500 });
    }

    // Fetch leads from Meta
    const res = await fetch(\`https://graph.facebook.com/v24.0/\${formId}/leads?access_token=\${token}\`);`,
replacement
);

fs.writeFileSync(file, code);
