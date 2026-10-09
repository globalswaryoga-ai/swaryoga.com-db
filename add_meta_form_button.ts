import fs from 'fs';

const filePath = '/Users/mohankalburgi/swaryoga.com-db/app/admin/crm/workshop-management/page.tsx';
let code = fs.readFileSync(filePath, 'utf8');

if (!code.includes('showMetaFormModal')) {
    // Add state
    code = code.replace(
        "const [showCreateForm, setShowCreateForm] = useState(false);",
        "const [showCreateForm, setShowCreateForm] = useState(false);\n  const [showMetaFormModal, setShowMetaFormModal] = useState(false);"
    );

    // Add button in header
    code = code.replace(
        `        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Add Workshop
          </button>
        </div>`,
        `        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowMetaFormModal(true)}
            className="bg-white hover:bg-slate-50 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <LinkIcon size={16} /> Connect Meta Form
          </button>
          <button 
            onClick={() => setShowCreateForm(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm transition-all flex items-center gap-2"
          >
            <Plus size={18} /> Add Workshop
          </button>
        </div>`
    );

    // Add Modal JSX
    const modalJSX = `
      {/* Meta Form Connect Modal */}
      {showMetaFormModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="bg-blue-100 p-2.5 rounded-xl">
                  <LinkIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800">Connect Facebook/Instagram Form</h3>
                  <p className="text-sm text-slate-500 font-medium">Configure Meta Webhooks to receive leads instantly.</p>
                </div>
              </div>
              <button onClick={() => setShowMetaFormModal(false)} className="text-slate-400 hover:text-slate-600 bg-white hover:bg-slate-100 p-2 rounded-xl transition-colors border border-slate-200">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto bg-slate-50">
              <div className="space-y-6">
                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-lg text-xs">Recommended</span>
                    Instant Forms Setup (Business Suite)
                  </h4>
                  <p className="text-sm text-slate-600 mb-4">Use this if you are connecting through Facebook Business Suite (Lead Access -&gt; CRM Setup) or if you are using the newer <code>leadgen_conditional_questions_responses</code> webhook.</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Webhook URL</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 block p-3 bg-slate-100 rounded-lg text-sm font-mono text-slate-800 break-all select-all border border-slate-200">https://swaryoga.com/api/webhooks/meta-instant-forms</code>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Verify Token</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 block p-3 bg-slate-100 rounded-lg text-sm font-mono text-slate-800 break-all select-all border border-slate-200">swaryoga_webhook_123</code>
                        <span className="text-xs text-slate-500 ml-2 italic">(Your system verify token)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                  <h4 className="font-bold text-slate-800 mb-2">Classic Graph API Leadgen Webhook</h4>
                  <p className="text-sm text-slate-600 mb-4">Use this if you are building a custom App in the Meta for Developers dashboard and subscribing to the <code>leadgen</code> Page webhook.</p>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Webhook URL</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 block p-3 bg-slate-100 rounded-lg text-sm font-mono text-slate-800 break-all select-all border border-slate-200">https://swaryoga.com/api/webhooks/meta/leadgen</code>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Verify Token</label>
                      <div className="flex items-center gap-2">
                        <code className="flex-1 block p-3 bg-slate-100 rounded-lg text-sm font-mono text-slate-800 break-all select-all border border-slate-200">swaryoga_webhook_123</code>
                        <span className="text-xs text-slate-500 ml-2 italic">(Your system verify token)</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex gap-3">
                  <Info className="text-blue-500 shrink-0 mt-0.5" size={20} />
                  <div>
                    <h5 className="font-bold text-blue-900 text-sm mb-1">How to connect in Meta Business Suite</h5>
                    <ol className="list-decimal list-inside text-sm text-blue-800 space-y-1">
                      <li>Go to your Facebook Page -&gt; Meta Business Suite</li>
                      <li>Click on All Tools -&gt; Instant Forms</li>
                      <li>Go to the CRM Setup tab</li>
                      <li>Search for "Custom Webhook" (or simply "Webhook")</li>
                      <li>Paste the Webhook URL (from the Recommended section above) and provide the Verify Token</li>
                    </ol>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="p-6 border-t border-slate-100 bg-white flex justify-end">
              <button 
                onClick={() => setShowMetaFormModal(false)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-6 py-2.5 rounded-xl font-bold text-sm transition-colors border border-slate-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
`;

    // Add before the final closing div tag of the page.
    code = code.replace(
      "    </div>\n  );\n}",
      modalJSX + "\n    </div>\n  );\n}"
    );

    fs.writeFileSync(filePath, code);
    console.log("Success");
} else {
    console.log("Modal already exists");
}
