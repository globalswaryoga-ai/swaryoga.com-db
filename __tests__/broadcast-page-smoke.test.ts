import fs from 'fs';
import path from 'path';

describe('Broadcast page smoke', () => {
  it('broadcast page exists', () => {
    const p = path.join(process.cwd(), 'app', 'admin', 'crm', 'broadcast', 'page.tsx');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('whatsapp page links to broadcast', () => {
    const p = path.join(process.cwd(), 'app', 'admin', 'crm', 'whatsapp', 'page.tsx');
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toContain('href="/admin/crm/broadcast"');
  });

  it('lead status filter uses bucket mapping', () => {
    const p = path.join(process.cwd(), 'app', 'admin', 'crm', 'broadcast', 'page.tsx');
    const src = fs.readFileSync(p, 'utf8');
    // We want bucket-to-bucket comparison so the UI "lead" option matches
    // underlying values like "new"/"leads".
    expect(src).toContain('const wanted = statusBucket(status)');
  });
});
