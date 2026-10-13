export type RegistrationGateAction = 'meeting_done' | 'skip_zoom' | 'pending' | 'reject' | 'approve' | 'group_added' | 'skip_group' | 'auto_added';
export const REGISTRATION_GATE_FIELDS = ['zoomStatus', 'isRegistered', 'isRejected', 'groupStatus', 'zoomGateAudit', 'finalApprovalAudit', 'groupGateAudit'];

export type RegistrationGateDecision = {
  zoomStatus?: string;
  isRejected?: boolean;
  isRegistered?: boolean;
  groupStatus?: string;
  screeningPassed?: boolean;
  status?: string;
  zoomDate?: string;
};

export function zoomGatePassed(decision: RegistrationGateDecision) {
  return decision.zoomStatus === 'meeting_done' || decision.zoomStatus === 'skipped';
}

export function needsZoomReview(decision: RegistrationGateDecision) {
  return !decision.isRejected && (
    decision.screeningPassed === true || Boolean(decision.zoomDate) || decision.isRegistered === true ||
    /^approv(?:al|el)/i.test(decision.status || '')
  );
}

export function registrationGatePatch(
  decision: RegistrationGateDecision, action: RegistrationGateAction, userId: string, now = new Date().toISOString(),
) {
  if ((decision.isRejected || decision.zoomStatus === 'rejected') && action !== 'reject') {
    throw new Error('Rejected leads cannot advance. Review their rejection first.');
  }
  const audit = { action, userId, at: now };
  switch (action) {
    case 'meeting_done':
    case 'skip_zoom':
    case 'pending':
      if (decision.isRegistered) throw new Error('Zoom cannot be changed after final approval.');
      return { zoomStatus: action === 'skip_zoom' ? 'skipped' : action, zoomGateAudit: audit };
    case 'reject':
      if (decision.isRegistered) throw new Error('Final-approved leads cannot be rejected through the Zoom gate.');
      return { zoomStatus: 'rejected', isRejected: true, isRegistered: false, zoomGateAudit: audit };
    case 'approve':
      if (!zoomGatePassed(decision)) throw new Error('Mark Meeting Done or explicitly Skip Zoom before final approval.');
      return { isRegistered: true, isRejected: false, finalApprovalAudit: audit };
    case 'group_added':
    case 'auto_added':
    case 'skip_group':
      if (!decision.isRegistered) throw new Error('Final approval is required before resolving group admission.');
      return { groupStatus: action === 'auto_added' ? 'auto_added' : action === 'group_added' ? 'added_manually' : 'skipped', groupGateAudit: audit };
    default:
      throw new Error('Invalid registration gate action.');
  }
}
