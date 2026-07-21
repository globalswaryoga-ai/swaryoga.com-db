/**
 * Resolves the server-authoritative price for a workshop-join payment.
 *
 * SECURITY: the amount must never be trusted from the client. When a form has
 * feeOptions, the client only sends an INDEX into that list (which fee tier
 * the registrant picked) — this looks up the actual amount from the DB form
 * doc. Falls back to the legacy single `price` field for forms with no
 * feeOptions (pre-existing forms, or a free workshop).
 */
export function resolveWorkshopFee(
  form: { price?: number; feeOptions?: { label?: string; price?: number }[] },
  feeOptionIndex?: unknown
): { price: number; label: string; index: number } {
  const options = Array.isArray(form.feeOptions) ? form.feeOptions : [];
  if (options.length) {
    const idx = Number(feeOptionIndex);
    const resolvedIndex = Number.isInteger(idx) && idx >= 0 && idx < options.length ? idx : 0;
    const chosen = options[resolvedIndex];
    return { price: Math.max(0, Number(chosen?.price) || 0), label: String(chosen?.label || ''), index: resolvedIndex };
  }
  return { price: Math.max(0, Number(form.price) || 0), label: '', index: -1 };
}
