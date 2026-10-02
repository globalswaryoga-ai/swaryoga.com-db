const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// Change the button color to yellow
const oldBtn = `className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"`;
const newBtn = `className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"`;

// We replace the one inside the assignedAi block:
content = content.replace(
  `{assignedAi && (
                        <button
                          onClick={() => openAiModal(assignedAi)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                        >`,
  `{assignedAi && (
                        <button
                          onClick={() => openAiModal(assignedAi)}
                          className="bg-yellow-400 hover:bg-yellow-500 text-yellow-900 px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                        >`
);

fs.writeFileSync(file, content);
console.log("Updated button color to yellow");
