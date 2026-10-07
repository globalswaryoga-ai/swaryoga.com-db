const fs = require('fs');
const file = 'app/api/admin/canva/meta-ai/route.ts';
let code = fs.readFileSync(file, 'utf8');

// Move let aspectRatio = "1:1" to the top scope of POST
code = code.replace(
  '    // 1. Generate Chat Response via Llama 3 on Replicate',
  '    let aspectRatio = "1:1";\n    // Default sizes based on platform selection passed in the prompt\n    if (prompt.includes("Platform: YouTube(16:9)") || prompt.includes("Platform: FB(16:9)") || prompt.includes("Platform: LinkedIn(16:9)")) { aspectRatio = "16:9"; }\n    else if (prompt.includes("Platform: Insta(size)") || prompt.includes("Platform: FB(size)")) { aspectRatio = "1:1"; }\n    else if (prompt.includes("Platform: TikTok") || prompt.includes("Platform: Reels")) { aspectRatio = "9:16"; }\n    const lowerPrompt = prompt.toLowerCase();\n    if (lowerPrompt.includes("16:9") || lowerPrompt.includes("youtube")) { aspectRatio = "16:9"; } else if (lowerPrompt.includes("9:16") || lowerPrompt.includes("story") || lowerPrompt.includes("reels") || lowerPrompt.includes("tiktok")) { aspectRatio = "9:16"; }\n\n    // 1. Generate Chat Response via Llama 3 on Replicate'
);

// Remove the inner declaration
const innerDeclaration = \`        let aspectRatio = "1:1";
        // Default sizes based on platform selection passed in the prompt
        if (prompt.includes("Platform: YouTube(16:9)") || prompt.includes("Platform: FB(16:9)") || prompt.includes("Platform: LinkedIn(16:9)")) { aspectRatio = "16:9"; }
        else if (prompt.includes("Platform: Insta(size)") || prompt.includes("Platform: FB(size)")) { aspectRatio = "1:1"; }
        else if (prompt.includes("Platform: TikTok") || prompt.includes("Platform: Reels")) { aspectRatio = "9:16"; }
        const lowerPrompt = prompt.toLowerCase();
        if (lowerPrompt.includes('16:9') || lowerPrompt.includes('youtube')) {
          aspectRatio = "16:9";
        } else if (lowerPrompt.includes('9:16') || lowerPrompt.includes('story') || lowerPrompt.includes('reels') || lowerPrompt.includes('tiktok')) {
          aspectRatio = "9:16";
        }\`;
code = code.replace(innerDeclaration, "");

fs.writeFileSync(file, code);
console.log("Fixed aspect ratio scope");
