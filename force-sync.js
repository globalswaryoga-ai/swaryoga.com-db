require('dotenv').config({ path: '.env.local' });
const { fetchTemplatesFromMeta } = require('./lib/meta-templates');
const { bunnyExecute } = require('./lib/bunnyDatabase');
const { createTemplate, findMetaTemplate } = require('./lib/bunnyTemplatesRepository');

async function run() {
  const result = await fetchTemplatesFromMeta(200);
  if (!result.success) {
    console.error("Failed:", result.error);
    return;
  }
  const metaTemplates = result.templates || [];
  let added = 0;
  
  for (const metaTemplate of metaTemplates) {
    const existing = await findMetaTemplate(metaTemplate.id, metaTemplate.name, metaTemplate.language);
    if (!existing) {
      const bodyComponent = metaTemplate.components?.find(c => c.type === 'BODY');
      const newTemplate = await createTemplate({
          name: metaTemplate.name,
          category: metaTemplate.category || 'MARKETING',
          language: metaTemplate.language,
          message: bodyComponent?.text || '',
          status: 'approved',
          provider: 'meta',
          metaTemplateId: metaTemplate.id,
          metaTemplateName: metaTemplate.name,
          createdBy: 'admin',
          metadata: {
              importedFromMeta: true,
              importDate: new Date().toISOString(),
          }
      });
      added++;
      console.log("Added template:", metaTemplate.name, metaTemplate.language);
    }
  }
  console.log(`Finished syncing. Added ${added} new templates.`);
}
run().catch(console.error);
