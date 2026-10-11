import { type RegistrationFilterCondition } from '@/lib/registrationAiConfig';

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
      const options = [...new Set([...questions, first.question].filter(Boolean))];
      return <section key={indices[0]} className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={`rule-question-${groupIndex}`} className="text-sm font-bold">Question {groupIndex + 1}</label>
          <button type="button" className="text-xs font-semibold text-red-600" onClick={() => onChange(conditions.filter((_, index) => !indices.includes(index)))}>Remove question</button>
        </div>
        <select id={`rule-question-${groupIndex}`} className="w-full rounded-lg border p-2 text-sm" value={first.question}
          onChange={event => onChange(conditions.map((condition, index) => indices.includes(index) ? { ...condition, question: event.target.value } : condition))}>
          <option value="">-- Select saved form question / column --</option>
          {options.map(question => <option key={question} value={question}>{question}</option>)}
        </select>
        {indices.map((index, answerIndex) => <div key={index} className="grid grid-cols-1 items-end gap-2 rounded-lg bg-slate-50 p-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <div>
            <label htmlFor={`rule-answer-${index}`} className="mb-1 block text-xs font-semibold">If answer is</label>
            <input id={`rule-answer-${index}`} value={conditions[index].keyword} placeholder={answerIndex === 0 ? 'Yes' : 'No'}
              className="w-full rounded border p-2 text-sm" onChange={event => update(index, { keyword: event.target.value })} />
          </div>
          <div>
            <label htmlFor={`rule-category-${index}`} className="mb-1 block text-xs font-semibold">Save / route to category</label>
            <select id={`rule-category-${index}`} value={conditions[index].successCategory || ''} className="w-full rounded border p-2 text-sm"
              onChange={event => update(index, { successCategory: event.target.value })}>
              <option value="">-- Select destination --</option>
              {categories.map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
            </select>
          </div>
          <input type="color" aria-label={`Answer ${index + 1} color`} value={conditions[index].successColor || '#e6ffed'}
            className="h-9 w-10" onChange={event => update(index, { successColor: event.target.value })} />
          <button type="button" aria-label={`Remove answer ${index + 1}`} className="p-2 text-sm text-red-600"
            onClick={() => onChange(conditions.filter((_, position) => position !== index))}>Remove</button>
        </div>)}
        <button type="button" className="text-sm font-bold text-indigo-600"
          onClick={() => onChange([...conditions, { question: first.question, keyword: '', failCategory: first.failCategory, failColor: first.failColor }])}>+ Add answer</button>
        <label className="block text-xs font-semibold">
          Blank or unlisted answer
          <select className="mt-1 w-full rounded border p-2 text-sm" value={first.failCategory || ''}
            onChange={event => onChange(conditions.map((condition, index) => indices.includes(index) ? { ...condition, failCategory: event.target.value } : condition))}>
            <option value="">Keep current category / needs review</option>
            {categories.filter(category => !category.id.startsWith('approval')).map(category => <option key={category.id} value={category.id}>{category.label}</option>)}
          </select>
        </label>
        {indices.some(index => conditions[index].directMoveCategory) && <p className="text-xs text-amber-800">This saved rule has a legacy direct-move setting. <button type="button" className="underline"
          onClick={() => onChange(conditions.map((condition, index) => indices.includes(index) ? { ...condition, directMoveCategory: '' } : condition))}>Clear direct move and use answer rules</button></p>}
      </section>;
    })}
    <button type="button" className="w-full rounded-xl border-2 border-dashed border-indigo-200 py-3 font-bold text-indigo-600"
      onClick={() => onChange([...conditions, { question: '', keyword: '' }])}>+ Add question</button>
  </div>;
}
