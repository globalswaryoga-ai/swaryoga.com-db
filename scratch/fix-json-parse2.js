const fs = require('fs');

const file = 'app/api/admin/social-media/accounts/[id]/route.ts';

let content = fs.readFileSync(file, 'utf8');

content = content.replace(/import \{ bunnyExecute \} from '@\/lib\/bunnyDatabase';/g, "import { bunnyExecute, cleanMongoJson } from '@/lib/bunnyDatabase';");
content = content.replace(/const \{ bunnyExecute \} = await import\('@\/lib\/bunnyDatabase'\);/g, "const { bunnyExecute, cleanMongoJson } = await import('@/lib/bunnyDatabase');");

content = content.replace(/const parsed = JSON\.parse\(String\(row\.document_json \|\| '\{\}'\)\);/g, "const parsed = cleanMongoJson(JSON.parse(String(row.document_json || '{}')));");
content = content.replace(/const accountDoc = JSON\.parse\(String\(accountRes\.rows\[0\]\.document_json \|\| '\{\}'\)\);/g, "const accountDoc = cleanMongoJson(JSON.parse(String(accountRes.rows[0].document_json || '{}')));");

fs.writeFileSync(file, content);
