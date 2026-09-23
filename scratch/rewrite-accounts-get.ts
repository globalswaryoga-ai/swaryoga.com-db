import * as fs from 'fs';
const file = 'app/api/admin/social-media/accounts/route.ts';
let code = fs.readFileSync(file, 'utf8');

// REMOVE mongo dependencies
code = code.replace(/import \{ connectDB, SocialMediaAccount \} from '@\/lib\/db';
/g, '');
code = code.replace(/import \{ buildSocialMediaScopeFilter/g, 'import { resolveSocialMediaScope'); // Keep resolveSocialMediaScope

// REWRITE GET
code = code.replace(/let mongoAccounts[\s\S]*?const combined = \[\.\.\.mongoAccounts, \.\.\.uniqueBunny\];/g, `const scope = await resolveSocialMediaScope(decoded);
    let accounts: any[] = [];
    try {
      const { bunnyExecute } = await import('@/lib/bunnyDatabase');
      const res = await bunnyExecute({
        sql: \SELECT id, document_json FROM mongo_documents WHERE collection_name = socialmediaaccounts\
      });
      for (const row of res.rows) {
        try {
          const parsed = JSON.parse(String(row.document_json || '{}'));
          if (parsed.isConnected && (scope.scopeType === 'super_admin' || (parsed.scopeType === 'tenant' && parsed.scopeKey === scope.scopeKey))) {
            const { accessToken: _at, refreshToken: _rt, ...safe } = parsed;
            if (!safe._id) safe._id = String(row.id);
            accounts.push(safe);
          }
        } catch {}
      }
    } catch (bunnyErr: any) {
      console.error('[SocialMedia] Bunny DB error:', bunnyErr.message);
    }
`);
code = code.replace(/data: combined,/g, 'data: accounts,');

fs.writeFileSync('scratch/temp-accounts-get.ts', code);

