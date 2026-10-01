const fs = require('fs');
let code = fs.readFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', 'utf-8');

// 1. Add state for metaError
if (!code.includes('const [metaError, setMetaError]')) {
  code = code.replace(
    "const [metaPrompt, setMetaPrompt] = useState('');",
    "const [metaPrompt, setMetaPrompt] = useState('');\\n  const [metaError, setMetaError] = useState<string | null>(null);"
  );
}

// 2. Clear error on submit
code = code.replace(
  "setGeneratedAiImage(null);\\n    setGeneratedDesignId(null);",
  "setGeneratedAiImage(null);\\n    setGeneratedDesignId(null);\\n    setMetaError(null);"
);

// 3. Set error on catch instead of alert
code = code.replace(
  "} catch (error: any) {\\n      alert(error.message);",
  "} catch (error: any) {\\n      setMetaError(error.message);"
);

// 4. Render error in chat area
const chatAreaStart = `{/* Middle Area: Chat / Generated Output */}`;
const chatAreaEnd = `{!generatedAiImage && !generatedAiText ? (`;
const newChatAreaEnd = `
                    {metaError && (
                      <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl text-sm mb-4">
                        <strong>Error:</strong> {metaError}
                      </div>
                    )}
                    {!generatedAiImage && !generatedAiText && !metaError ? (`;

code = code.replace(`{!generatedAiImage && !generatedAiText ? (`, newChatAreaEnd);

fs.writeFileSync('app/admin/crm/workshop-offer/_CanvaStudioTab.tsx', code);
