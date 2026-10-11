import { fireEvent, render, screen } from '@testing-library/react';
import { QuestionRulesEditor } from '@/app/admin/crm/new-registration/_QuestionRulesEditor';
import { evaluateRegistrationConditions } from '@/lib/registrationAiConfig';

describe('Question and answer routing editor', () => {
  it('shows one question with separate Yes and No destination rows and preserves old settings', () => {
    const conditions = [
      { question: 'Video on?', keyword: 'Yes', successCategory: 'approval_1', successColor: '#aabbcc' },
      { question: 'Video on?', keyword: 'No', successCategory: 'pending_leads_1' },
    ];
    const onChange = jest.fn();
    render(<QuestionRulesEditor conditions={conditions} onChange={onChange} questions={[]} categories={[{ id: 'approval_1', label: 'Approval-1' }, { id: 'pending_leads_1', label: 'Pending-1' }]} />);
    expect(screen.getAllByLabelText(/Question \d/)).toHaveLength(1);
    expect(screen.getAllByLabelText('If answer is')).toHaveLength(2);
    expect(screen.getAllByLabelText('Save / route to category')[1]).toHaveValue('pending_leads_1');
    fireEvent.click(screen.getByRole('button', { name: '+ Add answer' }));
    expect(onChange).toHaveBeenCalledWith([...conditions, expect.objectContaining({ question: 'Video on?', keyword: '' })]);
    fireEvent.click(screen.getByRole('button', { name: '+ Add question' }));
    expect(onChange).toHaveBeenLastCalledWith([...conditions, { question: '', keyword: '' }]);
  });
  it('gives a matched No answer priority over approval on another question', () => {
    expect(evaluateRegistrationConditions({ Attendance: 'Yes', Video: 'No' }, [
      { question: 'Attendance', keyword: 'Yes', successCategory: 'approval_1' },
      { question: 'Video', keyword: 'Yes', successCategory: 'approval_1' },
      { question: 'Video', keyword: 'No', successCategory: 'pending_leads_1' },
    ])).toMatchObject({ passed: false, category: 'pending_leads_1' });
  });
});
