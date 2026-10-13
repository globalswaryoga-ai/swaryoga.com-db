import { type RegistrationFilterCondition, isTechnicalCrmField } from '@/lib/registrationAiConfig';

type Props = {
  conditions: RegistrationFilterCondition[];
  onChange: (conditions: RegistrationFilterCondition[]) => void;
  questions: string[];
  categories: { id: string; label: string }[];
};

export function QuestionRulesEditor({ conditions, onChange, questions, categories }: Props) {
  const groups = new Map<string, number[]>();
  conditions.forEach((condition, index) => {
    const key = condition.question?.normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ') || `empty:${index}`;
    groups.set(key, [...(groups.get(key) || []), index]);
  });
  const update = (index: number, patch: Partial<RegistrationFilterCondition>) =>
    onChange(conditions.map((condition, position) => position === index ? { ...condition, ...patch } : condition));
  return <div className="space-y-4">
    <p className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900">
      Add each question once, then map its possible answers to categories. Pending takes priority across questions. All required questions must qualify before approval. Blank/unlisted answers never approve automatically.
    </p>
    {[...groups.values()].map((indices, groupIndex) => {
      const first = conditions[indices[0]];
      const validFirstQuestion = first.question && !isTechnicalCrmField(first.question) ? first.question : '';
      const options = [...new Set([...questions.filter(q => !isTechnicalCrmField(q)), validFirstQuestion].filter(Boolean))];
      return <section key={indices[0]} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`rule-question-${groupIndex}`} className="text-sm font-bold">Question {groupIndex + 1}</label>
          <button type="button" className="text-xs font-semibold text-red-600" onClick={() => onChange(conditions.filter((_, index) => !indices.includes(index)))}>Remove question</button>
        </div>
        <div className="space-y-1.5">
          <select id={`rule-question-${groupIndex}`} className="w-full rounded-lg border p-2 text-sm" value={validFirstQuestion}
            onChange={event => onChange(conditions.map((condition, index) => indices.includes(index) ? { ...condition, question: event.target.value } : condition))}>
            <option value="">-- Select saved form question / column --</option>
            {options.map(question => <option key={question} value={question}>{question}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-400 whitespace-nowrap">Edit Question:</span>
            <input
              type="text"
              aria-label="Type or edit question title"
              value={validFirstQuestion}
              placeholder="Or type/edit question name..."
              className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 outline-none focus:border-indigo-500"
              onChange={event => onChange(conditions.map((condition, index) => indices.includes(index) ? { ...condition, question: event.target.value } : condition))}
            />
          </div>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Answer Rules & Routing</span>
            <button
              type="button"
              aria-label="+ Add answer"
              className="text-xs font-bold text-indigo-600 hover:text-indigo-800"
              onClick={() => onChange([...conditions, { question: first.question, keyword: '' }])}
            >
              + Add answer
            </button>
          </div>

          {indices.map((index, answerIndex) => (
            <div key={index} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div>
                <label htmlFor={`rule-answer-${index}`} className="mb-1 block text-xs font-bold text-slate-700">
                  {answerIndex === 0 ? '✓ Correct / Right Answer' : '✕ Wrong / Alternate Answer'}
                </label>
                <input
                  id={`rule-answer-${index}`}
                  aria-label="If answer is"
                  value={conditions[index].keyword}
                  placeholder={answerIndex === 0 ? 'e.g. Yes (or desired answer)' : 'e.g. No'}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-medium outline-none focus:ring-1 focus:ring-indigo-500"
                  onChange={event => update(index, { keyword: event.target.value })}
                />
              </div>

              <div>
                <label htmlFor={`rule-category-${index}`} className="mb-1 block text-xs font-bold text-slate-700">
                  Route to Destination Category
                </label>
                <select
                  id={`rule-category-${index}`}
                  aria-label="Save / route to category"
                  value={conditions[index].successCategory || ''}
                  className="w-full rounded-lg border border-slate-300 bg-white p-2 text-sm font-semibold text-slate-800 outline-none focus:ring-1 focus:ring-indigo-500"
                  onChange={event => update(index, { successCategory: event.target.value })}
                >
                  <option value="">-- Select Destination --</option>
                  {conditions[index].successCategory && !categories.some(c => c.id === conditions[index].successCategory) && (
                    <option value={conditions[index].successCategory}>Saved: {conditions[index].successCategory}</option>
                  )}
                  <optgroup label="Approval Categories">
                    {categories.filter(c => c.id.startsWith('approval') || c.id === 'registered_leads').map(c => (
                      <option key={c.id} value={c.id}>✓ {c.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Pending / Review Categories">
                    {categories.filter(c => c.id.startsWith('pending') || c.id === 'take_zoom_meeting').map(c => (
                      <option key={c.id} value={c.id}>⏱ {c.label}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Other Categories">
                    {categories.filter(c => !c.id.startsWith('approval') && !c.id.startsWith('pending') && c.id !== 'registered_leads' && c.id !== 'take_zoom_meeting').map(c => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </optgroup>
                </select>
              </div>

              <div className="flex sm:flex-col justify-end pt-5 sm:pt-4">
                <button
                  type="button"
                  aria-label={`Remove answer ${index + 1}`}
                  className="text-xs font-bold text-red-600 hover:text-red-800 p-1"
                  onClick={() => onChange(conditions.filter((_, position) => position !== index))}
                >
                  ✕ Remove
                </button>
              </div>
            </div>
          ))}

          <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-600">
              Blank / Unmatched Answers Fallback:
            </label>
            <select
              className="rounded-lg border border-slate-300 bg-white p-1.5 text-xs font-medium text-slate-700 outline-none"
              value={first.failCategory || ''}
              onChange={event => onChange(conditions.map((condition, index) => indices.includes(index) ? { ...condition, failCategory: event.target.value } : condition))}
            >
              <option value="">Keep current category / needs review</option>
              {categories.filter(category => !category.id.startsWith('approval')).map(category => (
                <option key={category.id} value={category.id}>Route to {category.label}</option>
              ))}
            </select>
          </div>
        </div>
      </section>;
    })}
    <button type="button" className="w-full rounded-xl border-2 border-dashed border-indigo-200 py-3 font-bold text-indigo-600"
      onClick={() => onChange([...conditions, { question: '', keyword: '' }])}>+ Add question</button>
  </div>;
}
