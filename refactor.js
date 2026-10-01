const fs = require('fs');
const file = 'app/admin/crm/workshop-offer/_CanvaStudioTab.tsx';
let content = fs.readFileSync(file, 'utf8');

const metaStudioStart = `{/* Meta Ad Studio Area */}`;
const metaStudioEnd = `{/* Batch List Area */}`;

const startIndex = content.indexOf(metaStudioStart);
const endIndex = content.indexOf(metaStudioEnd, startIndex);

if (startIndex === -1 || endIndex === -1) {
  console.log("Could not find Meta Ad Studio Area");
  process.exit(1);
}

// We want to extract the code from:
// {downloadTab === 'meta' && (
//   <div className="flex flex-col gap-12 w-full pb-12">
// ...
//   </div>
// )}
// which is right after metaStudioStart and before metaStudioEnd.

const areaCode = content.substring(startIndex, endIndex);

// It currently looks like:
// {/* Meta Ad Studio Area */}
// {downloadTab === 'meta' && (
//   <div className="flex flex-col gap-12 w-full pb-12">
// ...
//   </div>
// )}

// We want to replace it with:
// {/* Meta Ad Studio Area */}
// {downloadTab === 'meta' && renderMetaAdStudio()}

let layoutCodeMatch = areaCode.match(/\{downloadTab === 'meta' && \(\s*([\s\S]*?)\s*\)\}/);

if (!layoutCodeMatch) {
  console.log("Could not find the react fragment");
  process.exit(1);
}

const layoutCode = layoutCodeMatch[1];

const renderFunction = `
  const renderMetaAdStudio = () => (
    ${layoutCode}
  );

  return (`;

content = content.replace("  return (", renderFunction);

content = content.replace(areaCode, `{/* Meta Ad Studio Area */}
                 {downloadTab === 'meta' && renderMetaAdStudio()}
                 
                 `);

// Add the new tab button
const receiptsTabStart = `<button 
              onClick={() => setActiveSection('receipts')}`;

const metaAdvertiseTab = `<button 
              onClick={() => setActiveSection('meta')}
              className={\`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all \${activeSection === 'meta' ? 'bg-white shadow-sm text-indigo-700' : 'text-slate-600 hover:bg-slate-200/50'}\`}
            >
              <ImageIcon size={16} className={activeSection === 'meta' ? 'text-indigo-600' : 'text-slate-400'} />
              Meta Advertise
            </button>
            `;

content = content.replace(receiptsTabStart, metaAdvertiseTab + receiptsTabStart);

// At the very bottom, after `downloads` rendering, render it for the `meta` section
const downloadsSectionEnd = `{activeSection === 'downloads' && (`;
const metaSectionRender = `{activeSection === 'meta' && (
             <div className="max-w-6xl mx-auto flex flex-col pt-8">
               {renderMetaAdStudio()}
             </div>
           )}
           
           `;
content = content.replace(downloadsSectionEnd, metaSectionRender + downloadsSectionEnd);

fs.writeFileSync(file, content);
console.log("Success!");
