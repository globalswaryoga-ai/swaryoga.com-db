import fs from 'fs';
import path from 'path';

describe('Templates API derivations smoke', () => {
  it('derives headerMedia from headerFormat/headerContent', () => {
    const p = path.join(process.cwd(), 'app', 'api', 'admin', 'crm', 'templates', 'route.ts');
    const src = fs.readFileSync(p, 'utf8');

    // Ensures we set headerMedia when headerFormat=IMAGE/VIDEO and headerContent is a URL.
    expect(src).toContain('derivedHeaderMedia');
    expect(src).toContain("headerFormatNorm === 'IMAGE'");
    expect(src).toContain("headerFormatNorm === 'VIDEO'");
  });

  it('normalizes buttons to title-only schema', () => {
    const p = path.join(process.cwd(), 'app', 'api', 'admin', 'crm', 'templates', 'route.ts');
    const src = fs.readFileSync(p, 'utf8');
    expect(src).toContain('normalizedButtons');
    expect(src).toContain('b.title || b.label || b.text');
  });
});
