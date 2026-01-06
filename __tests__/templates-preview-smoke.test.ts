import fs from 'fs';
import path from 'path';

describe('Templates preview smoke', () => {
  it('templates page supports structured preview payload', () => {
    const p = path.join(process.cwd(), 'app', 'admin', 'crm', 'templates', 'page.tsx');
    const src = fs.readFileSync(p, 'utf8');

    // Ensure the structured JSON preview parser exists.
    expect(src).toContain('function safeParseTemplatePreview');

    // Ensure we render header media when available.
    expect(src).toContain('previewHeaderMedia?.url');

    // Ensure we render buttons separately.
    expect(src).toContain('previewButtons');
  });
});
