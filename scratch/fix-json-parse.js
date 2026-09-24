const fs = require('fs');

const files = [
  'app/api/admin/social-media/accounts/route.ts',
  'app/api/admin/social-media/posts/route.ts',
  'lib/socialMediaConnect.ts',
  'app/api/admin/social-media/posts/[id]/publish/route.ts'
];

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  
  // Replace bunnyExecute imports to include cleanMongoJson
  content = content.replace(/import \{ bunnyExecute \} from '@\/lib\/bunnyDatabase';/g, "import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';");
  content = content.replace(/const \{ bunnyExecute \} = await import\('@\/lib\/bunnyDatabase'\);/g, "const { bunnyExecute, cleanMongoJson } = await import('@/lib/bunnyDatabase');");

  // Replace JSON.parse(...) with cleanMongoJson(JSON.parse(...))
  content = content.replace(/const parsed = JSON\.parse\(String\(row\.document_json \|\| '\{\}'\)\);/g, "const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));");
  content = content.replace(/const postDoc = JSON\.parse\(String\(postRes\.rows\[0\]\.document_json \|\| '\{\}'\)\);/g, "const postDoc = cleanMongoJson(JSON.parse(String(postRes.rows[0].document_json || '{}')));");

  fs.writeFileSync(file, content);
}
