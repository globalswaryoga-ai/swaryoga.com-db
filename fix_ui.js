const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

const oldUIBlock = `      const targetTemplateId = metaTemplatesMap[metaPlatform];
      if (!targetTemplateId) {
        alert(\`Please enter a Canva Template ID for \${metaPlatform}\`);
        setIsGeneratingMeta(false);
        return;
      }
      const fullPrompt = \`Target Language: \${metaLanguage}\\nPlatform: \${metaPlatform}\\n\\n\${metaPrompt}\`;`;

const newUIBlock = `      const targetTemplateId = metaTemplatesMap[metaPlatform];
      const fullPrompt = \`Target Language: \${metaLanguage}\\nPlatform: \${metaPlatform}\\n\\n\${metaPrompt}\`;`;

code = code.replace(oldUIBlock, newUIBlock);

// Also need to handle the case where we don't have a job ID (so we don't poll)
const oldPollBlock = `      const jobId = data.job.id;
      
      // Poll status
      const poll = setInterval(async () => {`;
      
const newPollBlock = `      if (data.imageUrl) {
        setGeneratedAiImage(data.imageUrl);
      }
      
      if (!data.job) {
        setIsGeneratingMeta(false);
        setMetaPrompt('');
        return;
      }
      
      const jobId = data.job.id;
      
      // Poll status
      const poll = setInterval(async () => {`;
      
code = code.replace(oldPollBlock, newPollBlock);

fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
