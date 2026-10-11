import { evaluateRegistrationConditions } from '@/lib/registrationAiConfig';

const question = 'Do you have time to attend the 14-day online live workshop?';
const rules = [
  { question, keyword: 'yes 100%', successCategory: 'approval_1' },
  { question, keyword: 'No', successCategory: 'pending_leads_1' },
  { question, keyword: 'My be some days', successCategory: 'approval_1' },
];

describe('Registration answer alternatives', () => {
  it.each(['yes 100%', ' YES   100% ', 'My be some days'])('approves the allowed answer %s', answer => {
    expect(evaluateRegistrationConditions({ [question]: answer }, rules)).toMatchObject({ passed: true, category: 'approval_1' });
  });
  it('routes No to pending without marking screening passed', () => {
    expect(evaluateRegistrationConditions({ [question]: 'No' }, rules)).toMatchObject({ passed: false, category: 'pending_leads_1' });
  });
  it.each(['', 'No time available', 'Maybe', undefined])('leaves an unmatched answer without a destination: %s', answer => {
    expect(evaluateRegistrationConditions({ [question]: answer }, rules)).toMatchObject({ passed: false, category: '' });
  });
  it('still requires different questions to pass', () => {
    const conditions = [...rules, { question: 'Consent', keyword: 'Yes', failCategory: 'pending_leads_2' }];
    expect(evaluateRegistrationConditions({ [question]: 'yes 100%', Consent: 'No' }, conditions)).toMatchObject({ passed: false, category: 'pending_leads_2' });
  });
  it('detects ambiguous routing instead of silently picking a category', () => {
    expect(evaluateRegistrationConditions({ [question]: 'yes 100%' }, [
      ...rules, { question, keyword: 'yes 100%', successCategory: 'pending_leads_2' },
    ])).toMatchObject({ passed: false, category: '', reason: expect.stringContaining('Conflicting') });
  });
});
