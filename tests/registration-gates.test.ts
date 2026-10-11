/** @jest-environment node */

import { needsZoomReview, registrationGatePatch, zoomGatePassed } from '@/lib/registrationGates';
import { evaluateRegistrationConditions } from '@/lib/registrationAiConfig';
import { registrationBatchRows } from '@/lib/registrationLeads';

describe('Separate registration gates', () => {
  const at = '2026-10-11T10:00:00.000Z';

  it('does not treat passing form rules as meeting completion or final approval', () => {
    const result = evaluateRegistrationConditions({ Ready: 'Yes' }, [
      { question: 'Ready', keyword: 'Yes', successCategory: 'approval_1' },
    ]);
    expect(result?.passed).toBe(true);
    expect(result).not.toHaveProperty('zoomStatus');
    expect(result).not.toHaveProperty('isRegistered');
    expect(() => registrationGatePatch({ screeningPassed: true }, 'approve', 'admin', at)).toThrow('Mark Meeting Done');
  });

  it('records an audited skip separately from Meeting Done', () => {
    const skipped = registrationGatePatch({}, 'skip_zoom', 'admin', at);
    expect(skipped).toEqual({ zoomStatus: 'skipped', zoomGateAudit: { action: 'skip_zoom', userId: 'admin', at } });
    expect(skipped).not.toHaveProperty('isRegistered');
    expect(skipped).not.toHaveProperty('groupStatus');
    expect(zoomGatePassed(skipped)).toBe(true);
    expect(registrationGatePatch(skipped, 'approve', 'admin', at)).toMatchObject({ isRegistered: true });
    expect(registrationGatePatch({}, 'meeting_done', 'admin', at)).toMatchObject({ zoomStatus: 'meeting_done' });
  });

  it('requires final approval before recording manual group admission or skipping it', () => {
    expect(() => registrationGatePatch({ zoomStatus: 'meeting_done' }, 'group_added', 'admin', at)).toThrow('Final approval');
    expect(() => registrationGatePatch({}, 'skip_group', 'admin', at)).toThrow('Final approval');
    expect(registrationGatePatch({ isRegistered: true }, 'group_added', 'admin', at)).toMatchObject({ groupStatus: 'added_manually' });
    expect(registrationGatePatch({ isRegistered: true }, 'skip_group', 'admin', at)).toMatchObject({ groupStatus: 'skipped' });
  });

  it('blocks rejected leads and changes to Zoom after final approval', () => {
    expect(() => registrationGatePatch({ isRejected: true }, 'skip_zoom', 'admin', at)).toThrow('Rejected leads');
    expect(() => registrationGatePatch({ isRegistered: true }, 'pending', 'admin', at)).toThrow('after final approval');
    expect(() => registrationGatePatch({ isRegistered: true }, 'reject', 'admin', at)).toThrow('Final-approved');
  });

  it('shows screened leads in Zoom review before they are registered', () => {
    expect(needsZoomReview({ screeningPassed: true })).toBe(true);
    expect(needsZoomReview({ status: 'approval_1' })).toBe(true);
    expect(needsZoomReview({ zoomDate: '2026-10-12' })).toBe(true);
    expect(needsZoomReview({ isRejected: true, screeningPassed: true })).toBe(false);
    expect(needsZoomReview({})).toBe(false);
  });

  it('cannot approve after only the first configured answer passes', () => {
    const result = evaluateRegistrationConditions({ Ready: 'Yes', Attendance: 'No' }, [
      { question: 'Ready', keyword: 'Yes', successCategory: 'approval_1' },
      { question: 'Attendance', keyword: 'Yes', failCategory: 'pending_leads_1' },
    ]);
    expect(result).toMatchObject({ passed: false, category: 'pending_leads_1' });
    expect(evaluateRegistrationConditions({ Ready: 'Yes' }, [
      { question: 'Attendance', keyword: 'Yes', directMoveCategory: 'approval_1' },
    ])).toMatchObject({ passed: false, category: '' });
  });

  it('checks the configured age range and each multilingual question independently', () => {
    const conditions = [
      { question: 'वय', keyword: '40-50', successCategory: 'approval_1' },
      { question: 'तयार आहात का?', keyword: 'होय' },
    ];
    expect(evaluateRegistrationConditions({ वय: '४५', 'तयार आहात का?': 'होय' }, conditions)?.passed).toBe(true);
    expect(evaluateRegistrationConditions({ वय: '35', 'तयार आहात का?': 'होय' }, conditions)?.passed).toBe(false);
    expect(evaluateRegistrationConditions({ Other: 'Yes' }, [{ question: 'Ready', keyword: 'Yes' }])?.passed).toBe(false);
  });

  it('isolates batch responses by form and language', () => {
    const rows = [
      { id: 'h1', formId: 'hindi-form', language: 'Hindi' },
      { id: 'm1', formId: 'marathi-form', language: 'Marathi' },
      { id: 'wrong-language', formId: 'hindi-form', language: 'Marathi' },
    ];
    expect(registrationBatchRows(rows, { formId: 'hindi-form', language: 'Hindi' }).map(row => row.id)).toEqual(['h1']);
    expect(registrationBatchRows(rows, {})).toEqual([]);
  });
});
