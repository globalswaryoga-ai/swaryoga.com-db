const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_MetaLeadsTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace all instances of `ai9Config` with `activeConfig` inside the popup rendering logic (lines 1308 to 1640)
// This is a bit tricky, let's write a targeted script.

const lines = content.split('\n');

const startIndex = lines.findIndex(l => l.includes('            {/* AI-9 Config Popup */}'));
const endIndex = lines.findIndex((l, i) => i > startIndex && l.includes('            {/* Dummy Lead Popup */}'));

if (startIndex === -1 || endIndex === -1) {
    console.error("Popup boundaries not found!");
    process.exit(1);
}

let popupContent = lines.slice(startIndex, endIndex).join('\n');

// Add helper variables
const header = `            {/* AI-9 Config Popup */}
            {showAI9Popup && (() => {
                const activeConfig = activeAITab === 'AI-9' ? ai9Config : activeAITab === 'AI-9B' ? ai9BConfig : ai9DConfig;
                const setActiveConfig = (newConfig: any) => {
                    if (activeAITab === 'AI-9') setAi9Config(newConfig);
                    else if (activeAITab === 'AI-9B') setAi9BConfig(newConfig);
                    else setAi9DConfig(newConfig);
                };
                const activeConfigKey = activeAITab === 'AI-9' ? 'ai9Config' : activeAITab === 'AI-9B' ? 'ai9BConfig' : 'ai9DConfig';
                return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-fade-in">`;

popupContent = popupContent.replace(/\{\/\* AI-9 Config Popup \*\/\}\n\s*\{showAI9Popup && \(\n\s*<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900\/40 backdrop-blur-sm p-4 animate-fade-in">/, header);

// Replace trailing `)}` with `)})}`
popupContent = popupContent.replace(/            \)\}\n$/, '            );\n            })()}');

// Replace ai9Config with activeConfig
popupContent = popupContent.replace(/ai9Config/g, 'activeConfig');
popupContent = popupContent.replace(/setAi9Config/g, 'setActiveConfig');

// Restore the activeConfigKey where we need to save it!
popupContent = popupContent.replace(/activeConfigKey: activeConfig/g, '[activeConfigKey]: activeConfig');
// Specifically: `ai9Config: newConfig` => `[activeConfigKey]: newConfig`
popupContent = popupContent.replace(/activeConfig: newConfig/g, '[activeConfigKey]: newConfig');

// Also update the title:
popupContent = popupContent.replace(/>AI-9 Configuration<\/h3>/g, '>{activeAITab} Configuration</h3>');
popupContent = popupContent.replace(/'Start AI-9 Processing'/g, '`Start ${activeAITab} Processing`');
popupContent = popupContent.replace(/'AI-9 Configuration saved successfully!'/g, '`${activeAITab} Configuration saved successfully!`');

lines.splice(startIndex, endIndex - startIndex, popupContent);
fs.writeFileSync(file, lines.join('\n'));
console.log("Popup logic updated.");
