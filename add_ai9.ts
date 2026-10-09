import fs from 'fs';
const file = 'app/admin/crm/meta/page.tsx';
let code = fs.readFileSync(file, 'utf8');

const buttonJSX = `
                {/* AI-9 Approval Button */}
                <button
                  type="button"
                  className="p-1.5 ml-auto flex items-center gap-1.5 px-3 rounded-lg font-bold text-white shadow-sm transition-all hover:opacity-90"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #4F46E5)' }}
                  onClick={() => setIsAi9ModalOpen(true)}
                  title="AI-9 Q&A Approval"
                >
                  <i className="ph-fill ph-robot"></i>
                  <span className="text-[11px] uppercase tracking-wide">AI-9 Approve</span>
                </button>
`;

if (!code.includes("AI-9 Approval Button")) {
  code = code.replace(
    '                </div>\n                <button\n                  className="p-1.5 text-slate-500',
    '                </div>' + buttonJSX + '\n                <button\n                  className="p-1.5 text-slate-500'
  );
}

const modalJSX = `
      {/* AI-9 Approval Modal */}
      {isAi9ModalOpen && selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl flex flex-col overflow-hidden max-h-[90vh]">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <i className="ph-fill ph-robot text-blue-600"></i>
                AI-9 Q&A Approval for {selected.name || selected.phoneNumber}
              </h2>
              <button onClick={() => setIsAi9ModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <i className="ph ph-x text-xl"></i>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {ai9Data.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3 relative group">
                  <button 
                    onClick={() => setAi9Data(prev => prev.filter((_, i) => i !== idx))}
                    className="absolute top-2 right-2 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <i className="ph ph-trash"></i>
                  </button>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Question {idx + 1}</label>
                    <input 
                      type="text" 
                      value={item.q}
                      onChange={(e) => {
                        const newData = [...ai9Data];
                        newData[idx].q = e.target.value;
                        setAi9Data(newData);
                      }}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      placeholder="Type question here..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Answer {idx + 1}</label>
                    <textarea 
                      value={item.a}
                      onChange={(e) => {
                        const newData = [...ai9Data];
                        newData[idx].a = e.target.value;
                        setAi9Data(newData);
                      }}
                      rows={2}
                      className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
                      placeholder="Type answer here..."
                    />
                  </div>
                </div>
              ))}
              <button 
                onClick={() => setAi9Data(prev => [...prev, { q: '', a: '' }])}
                className="w-full py-3 rounded-xl border-2 border-dashed border-slate-300 text-slate-500 font-semibold hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center justify-center gap-2"
              >
                <i className="ph ph-plus"></i> Add Question
              </button>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
              <button 
                onClick={() => setIsAi9ModalOpen(false)}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={async () => {
                  try {
                    // Save to lead metadata
                    const payload = {
                      metadata: {
                        ...(selected.metadata || {}),
                        ai9Data: ai9Data
                      }
                    };
                    const token = localStorage.getItem('crm_token');
                    await fetch(\`/api/admin/crm/leads/\${selected.leadId || selected._id}\`, {
                      method: 'PUT',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${token}\`
                      },
                      body: JSON.stringify(payload)
                    });
                    
                    // Trigger broadcast template
                    await fetch('/api/admin/crm/broadcast', {
                      method: 'POST',
                      headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': \`Bearer \${token}\`
                      },
                      body: JSON.stringify({
                        phones: [selected.phoneNumber],
                        messageType: 'template',
                        templateId: 'YOUR_TEMPLATE_NAME_HERE',
                        source: 'crm_meta_leads_ai9'
                      })
                    });
                    
                    alert('Q&A Saved and Template Triggered!');
                    setIsAi9ModalOpen(false);
                  } catch (e) {
                    console.error(e);
                    alert('Error saving or triggering broadcast.');
                  }
                }}
                className="px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-lg hover:shadow-lg hover:shadow-blue-500/30 transition-all"
              >
                Approve & Trigger Template
              </button>
            </div>
          </div>
        </div>
      )}
`;

if (!code.includes("AI-9 Approval Modal")) {
  code = code.replace(
    '      <style jsx global>{`',
    modalJSX + '\n      <style jsx global>{`'
  );
}

fs.writeFileSync(file, code);
