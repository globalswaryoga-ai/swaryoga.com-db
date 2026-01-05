import { buildCloudTemplateSendInput } from '@/lib/whatsapp';

describe('buildCloudTemplateSendInput', () => {
  it('maps header media + body vars + quick reply buttons', () => {
    const t: any = {
      templateName: 'welcome_1',
      language: 'en',
      templateContent: 'Hello {{name}}, your workshop is {{workshop}}',
      headerMedia: {
        kind: 'image',
        url: 'https://cdn.example.com/header.png',
      },
      buttons: [{ title: 'Yes' }, { title: 'No' }],
    };

    const input = buildCloudTemplateSendInput(t, '919999999999');

    expect(input.templateName).toBe('welcome_1');
    expect(input.language).toBe('en');
    expect(input.headerMedia).toEqual({ kind: 'image', url: 'https://cdn.example.com/header.png' });
    expect(input.bodyParams).toEqual(['name', 'workshop']);
    expect(input.buttons).toEqual([
      { kind: 'quick_reply', title: 'Yes' },
      { kind: 'quick_reply', title: 'No' },
    ]);
  });

  it('prefers variables[] order when present', () => {
    const t: any = {
      templateName: 'vars_order',
      language: 'en',
      templateContent: 'Hi {{b}} {{a}}',
      variables: [{ name: 'a' }, { name: 'b' }],
    };

    const input = buildCloudTemplateSendInput(t, '919999999999');
    expect(input.bodyParams).toEqual(['a', 'b']);
  });

  it('maps url button when url provided', () => {
    const t: any = {
      templateName: 'url_btn',
      language: 'en',
      templateContent: 'Check this',
      buttons: [{ title: 'Open', kind: 'url', url: 'https://example.com/{{code}}' }],
    };

    const input = buildCloudTemplateSendInput(t, '919999999999');
    expect(input.buttons).toEqual([{ kind: 'url', title: 'Open', url: 'https://example.com/{{code}}' }]);
  });
});
