/**
 * @deprecated DEPRECATED - Use EasyEnrollment component instead
 * 
 * This component has been replaced by EasyEnrollment.tsx which uses Cashfree
 * 
 * Migration Guide:
 * OLD: import PayUPaymentButton from '@/components/PayUPaymentButton'
 * NEW: import EasyEnrollment from '@/components/EasyEnrollment'
 * 
 * OLD Usage:
 * <PayUPaymentButton
 *   workshopSlug="..."
 *   workshopName="..."
 *   amount={amount}
 *   buttonLabel="Pay Now"
 * />
 * 
 * NEW Usage:
 * <EasyEnrollment
 *   workshopId="..."
 *   workshopName="..."
 *   amount={amount}
 *   token={token}
 * />
 * 
 * Key Differences:
 * 1. Cashfree replaces PayU for payment processing
 * 2. User form is now integrated into EasyEnrollment (cleaner UX)
 * 3. All security and compliance handled by Cashfree
 * 4. Instant enrollment confirmation instead of manual verification
 * 
 * REMOVAL DATE: Feb 2025
 */

export { };
