const fs = require('fs');

const files = [
  'app/api/admin/social-media/youtube/oauth/callback/route.ts',
  'app/api/admin/social-media/accounts/[id]/route.ts',
  'app/api/admin/social-media/analytics/sync/route.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  if (!content.includes('cleanMongoJson')) {
    content = content.replace(/import \{ bunnyExecute \} from '@\/lib\/bunnyDatabase';/g, "import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';");
    content = content.replace(/const \{ bunnyExecute \} = await import\('@\/lib\/bunnyDatabase'\);/g, "const { bunnyExecute, cleanMongoJson } = await import('@/lib/bunnyDatabase');");
  }

  content = content.replace(/const parsed = JSON\.parse\(String\(row\.document_json \|\| '\{\}'\)\);/g, "const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));");
  content = content.replace(/const account = JSON\.parse\(String\(existingRes\.rows\[0\]\.document_json \|\| '\{\}'\)\);/g, "const account = cleanMongoJson(JSON.parse(String(existingRes.rows[0].document_json || '{}')));");

  fs.writeFileSync(file, content);
}
