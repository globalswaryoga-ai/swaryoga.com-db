const fs = require('fs');
const file = 'app/api/admin/canva/meta-ai/route.ts';
let code = fs.readFileSync(file, 'utf8');

// 1. Update Ad Copy system prompt
code = code.replace(
  'const systemPrompt = `You are an expert social media copywriter. Given a prompt for an ad, generate exactly 3 things: a catchy Headline, a Subheading, and a Call-to-Action (CTA). Return them strictly as a JSON object with keys: "Headline", "Subheading", "CTA". Return ONLY the JSON, no extra text.`;',
  'const systemPrompt = `You are a world-class social media copywriter and ad strategist. When the user provides a topic, prompt, or idea, you MUST brainstorm and generate exactly 3 highly engaging elements: a catchy Headline, a compelling Subheading, and a strong Call-to-Action (CTA). \\n\\nReturn them STRICTLY as a valid JSON object with keys: "Headline", "Subheading", "CTA". \\n\\nDo not include markdown blocks, just the raw JSON object.`;'
);

// 2. Update General system prompt
code = code.replace(
  'const systemPrompt = `You are a helpful AI assistant specialized in social media marketing, image creation, content writing, and creative design.',
  'const systemPrompt = `You are a world-class creative AI assistant, highly trained in social media marketing, image generation, video creation, and design strategy.'
);
code = code.replace(
  '3. Keep responses concise and helpful.`;',
  '3. Keep responses concise, engaging, and professional. Act like a high-end agency partner.\\n4. Always explicitly acknowledge the requested aspect ratio or platform size if the user mentions one (e.g. 16:9, square, reels).`;'
);

// 3. Update aspect ratio logic
code = code.replace(
  'let aspectRatio = "1:1";',
  'let aspectRatio = "1:1";\n        // Default sizes based on platform selection passed in the prompt\n        if (prompt.includes("Platform: YouTube(16:9)") || prompt.includes("Platform: FB(16:9)") || prompt.includes("Platform: LinkedIn(16:9)")) { aspectRatio = "16:9"; }\n        else if (prompt.includes("Platform: Insta(size)") || prompt.includes("Platform: FB(size)")) { aspectRatio = "1:1"; }\n        else if (prompt.includes("Platform: TikTok") || prompt.includes("Platform: Reels")) { aspectRatio = "9:16"; }'
);

fs.writeFileSync(file, code);
console.log("Updated AI logic");
