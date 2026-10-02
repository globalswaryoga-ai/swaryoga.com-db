const fs = require('fs');
const file = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/new-registration/_LeadsManagementTab.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Change activeModal type from string literals to string | null
content = content.replace(/const \[activeModal, setActiveModal\] = useState\<'AI-4' \| 'AI-4A' \| 'AI-4B' \| 'AI-4C' \| null\>\(null\);/, 
  "const [activeModal, setActiveModal] = useState<string | null>(null);");

// 2. Change openAiModal signature
content = content.replace(/const openAiModal = \(type: 'AI-4' \| 'AI-4A' \| 'AI-4B' \| 'AI-4C'\) => \{/, 
  "const openAiModal = (type: string) => {");

// 3. Change saveAiFilter signature
content = content.replace(/const saveAiFilter = \(type: 'AI-4' \| 'AI-4A' \| 'AI-4B', conditions: FilterCondition\[\]\) => \{/, 
  "const saveAiFilter = (type: string, conditions: FilterCondition[]) => {");

// 4. Update the header buttons in the main content area
const oldHeaderButtons = `{activeTab === 'new_leads' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => openAiModal('AI-4')}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                    >
                      🤖 {(aiSettings['AI-4'] || []).some(c => c.keyword) ? \`AI-4 Active\` : 'Configure AI-4'}
                    </button>
                  </div>
                )}
                {activeTab === 'approval_1' && (
                  <button
                    onClick={() => openAiModal('AI-4A')}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    🤖 {(aiSettings['AI-4A'] || []).some(c => c.keyword) ? \`AI-4A Active\` : 'Configure AI-4A'}
                  </button>
                )}
                {activeTab === 'take_zoom_meeting' && (
                  <button
                    onClick={handleWhatsAppMessengerClick}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    💬 WhatsApp Messenger
                  </button>
                )}
                {activeTab === 'approval_2' && (
                  <button
                    onClick={() => openAiModal('AI-4B')}
                    className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    🤖 {(aiSettings['AI-4B'] || []).some(c => c.keyword) ? \`AI-4B Active\` : 'Configure AI-4B'}
                  </button>
                )}
                {activeTab === 'pending_leads_3' && (
                  <button
                    onClick={() => openAiModal('AI-4C')}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                  >
                    🤖 {(aiSettings['AI-4C'] || []).some(c => c.keyword) ? \`AI-4C Active\` : 'Configure AI-4C'}
                  </button>
                )}`;

const newHeaderButtons = `{(() => {
                  const activeCat = SIDEBAR_TABS.find(t => t.id === activeTab);
                  const assignedAi = activeCat?.aiAssignment;
                  return (
                    <div className="flex gap-2">
                      {assignedAi && (
                        <button
                          onClick={() => openAiModal(assignedAi)}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                        >
                          🤖 {(aiSettings[assignedAi] || []).some((c: any) => c.keyword) ? \`\${assignedAi} Active\` : \`Configure \${assignedAi}\`}
                        </button>
                      )}
                      {activeTab === 'new_leads' && (
                        <button
                          onClick={() => openAiModal('AI-4')}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                        >
                          🤖 {(aiSettings['AI-4'] || []).some((c: any) => c.keyword) ? \`AI-4 Active\` : 'Configure AI-4'}
                        </button>
                      )}
                      {activeTab === 'take_zoom_meeting' && (
                        <button
                          onClick={handleWhatsAppMessengerClick}
                          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-sm flex items-center gap-2 transition-colors"
                        >
                          💬 WhatsApp Messenger
                        </button>
                      )}
                    </div>
                  );
                })()}`;

content = content.replace(oldHeaderButtons, newHeaderButtons);

fs.writeFileSync(file, content);
console.log("Updated AI bindings to support dynamic up to P");
