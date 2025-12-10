import express from 'express';
import crypto from 'crypto';
import Payment from '../models/Payment';
const router = express.Router();
// PayU Configuration (from environment variables)
const PAYU_MERCHANT_KEY = process.env.PAYU_MERCHANT_KEY || 'gtKFFx';
const PAYU_MERCHANT_SALT = process.env.PAYU_MERCHANT_SALT || 'eCwWELxi';
const PAYU_BASE_URL = process.env.PAYU_BASE_URL || 'https://secure.payu.in';
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || '';
const PAYPAL_CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET || '';
// Helper: Generate PayU hash
function generatePayUHash(key, salt, txnid, amount, productinfo, firstname, email) {
    const hashString = `${key}|${txnid}|${amount}|${productinfo}|${firstname}|${email}|||||||||||${salt}`;
    return crypto.createHash('sha512').update(hashString).digest('hex');
}
// Helper: Verify PayU hash (response verification)
function verifyPayUHash(response, salt) {
    const { txnid, amount, productinfo, firstname, email, status, udf1 } = response;
    const hashString = `${salt}|${status}|||||||||||${udf1}|${email}|${firstname}|${productinfo}|${amount}|${txnid}`;
    const hash = crypto.createHash('sha512').update(hashString).digest('hex');
    return hash === response.hash;
}
// Generate QR Code for UPI/Payment Link (Simple URL encoding)
async function generateQRCode(paymentLink) {
    try {
        // Return Google Charts QR Code URL (no external dependency needed)
        const encoded = encodeURIComponent(paymentLink);
        return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encoded}`;
    }
    catch (error) {
        console.error('Error generating QR code:', error);
        return '';
    }
}
// Get all payments for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const payments = await Payment.find({ userId })
            .populate('workshopId', 'title')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: payments
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching payments',
            error
        });
    }
});
// Get payment by ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const payment = await Payment.findById(id)
            .populate('workshopId')
            .populate('userId', 'name email');
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        res.json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching payment',
            error
        });
    }
});
// Create payment (initiate order) - PayU Integration
router.post('/', async (req, res) => {
    try {
        const { enrollmentId, userId, workshopId, amount, currency = 'INR', subtotal, paymentMethod = 'payu', firstName, email, phone } = req.body;
        if (!enrollmentId || !userId || !workshopId || !amount) {
            return res.status(400).json({
                success: false,
                message: 'enrollmentId, userId, workshopId, and amount are required'
            });
        }
        // Generate transaction ID and invoice number
        const txnid = `TXN-${Date.now()}`;
        const invoiceNumber = `INV-${Date.now()}`;
        // Create payment record
        const payment = new Payment({
            enrollmentId,
            userId,
            workshopId,
            amount,
            currency,
            subtotal: subtotal || amount,
            orderId: txnid,
            transactionId: txnid,
            invoiceNumber,
            status: 'initiated',
            paymentMethod,
            paymentGateway: paymentMethod === 'paypal' ? 'paypal' : paymentMethod === 'upi' ? 'payu' : 'payu',
            statusChangedAt: new Date()
        });
        await payment.save();
        let responseData = {
            success: true,
            paymentId: payment._id,
            txnid,
            data: payment
        };
        // If PayU payment method
        if (paymentMethod === 'payu' || paymentMethod === 'card' || paymentMethod === 'netbanking' || paymentMethod === 'upi') {
            const productinfo = 'Workshop Enrollment';
            const hash = generatePayUHash(PAYU_MERCHANT_KEY, PAYU_MERCHANT_SALT, txnid, amount.toString(), productinfo, firstName || 'Customer', email || '');
            responseData.payuData = {
                key: PAYU_MERCHANT_KEY,
                txnid,
                amount: amount.toString(),
                productinfo,
                firstname: firstName || 'Customer',
                email: email || '',
                phone: phone || '',
                surl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success`,
                furl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed`,
                hash,
                payuBaseUrl: PAYU_BASE_URL
            };
        }
        // If PayPal payment method
        if (paymentMethod === 'paypal') {
            const paypalLink = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${process.env.PAYPAL_EMAIL || ''}&item_name=Workshop+Enrollment&amount=${amount}&currency_code=${currency}&invoice=${txnid}&return=${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/success&cancel_return=${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/failed`;
            responseData.paypalLink = paypalLink;
        }
        // If UPI/QR Code payment (for Nepal)
        if (paymentMethod === 'upi' || currency === 'NPR') {
            const upiLink = `upi://pay?pa=${process.env.UPI_ID || ''}&pn=SwarYoga&am=${amount}&tn=Workshop`;
            const qrCode = await generateQRCode(upiLink);
            responseData.qrPayment = {
                upiLink,
                qrCode,
                qrStatus: 'pending'
            };
            await Payment.findByIdAndUpdate(payment._id, {
                qrPaymentLink: upiLink,
                qrCodeUrl: qrCode,
                qrStatus: 'pending'
            });
        }
        res.status(201).json(responseData);
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error creating payment',
            error: error.message
        });
    }
});
// Verify PayU payment (callback from PayU)
router.post('/:id/verify', async (req, res) => {
    try {
        const { id } = req.params;
        const payuResponse = req.body;
        // Verify PayU hash
        const isValidHash = verifyPayUHash(payuResponse, PAYU_MERCHANT_SALT);
        if (!isValidHash) {
            return res.status(400).json({
                success: false,
                message: 'Invalid PayU signature'
            });
        }
        const { status, txnid, payuMoneyId } = payuResponse;
        const payment = await Payment.findByIdAndUpdate(id, {
            status: status === 'success' ? 'completed' : 'failed',
            paymentId: payuMoneyId,
            transactionId: txnid,
            payuResponse,
            statusChangedAt: new Date(),
            failureReason: status !== 'success' ? payuResponse.error || 'Payment failed' : undefined
        }, { new: true });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        res.json({
            success: true,
            data: payment,
            message: status === 'success' ? 'Payment verified successfully' : 'Payment verification failed'
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error verifying payment',
            error: error.message
        });
    }
});
// Verify PayPal payment
router.post('/:id/verify-paypal', async (req, res) => {
    try {
        const { id } = req.params;
        const { paypalTransactionId, paypalStatus } = req.body;
        // TODO: Verify PayPal transaction with PayPal API
        const payment = await Payment.findByIdAndUpdate(id, {
            status: paypalStatus === 'Completed' ? 'completed' : 'failed',
            paypalTransactionId,
            paymentGateway: 'paypal',
            statusChangedAt: new Date()
        }, { new: true });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        res.json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error verifying PayPal payment',
            error: error.message
        });
    }
});
// Verify QR Code Payment (Nepal)
router.post('/:id/verify-qr', async (req, res) => {
    try {
        const { id } = req.params;
        const { nepalPaymentRef } = req.body;
        const payment = await Payment.findByIdAndUpdate(id, {
            status: 'completed',
            nepalPaymentRef,
            qrStatus: 'processed',
            paymentGateway: 'external',
            statusChangedAt: new Date()
        }, { new: true });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        res.json({
            success: true,
            data: payment,
            message: 'QR payment verified'
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error verifying QR payment',
            error: error.message
        });
    }
});
// Mark payment as failed
router.post('/:id/fail', async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body;
        const payment = await Payment.findByIdAndUpdate(id, {
            status: 'failed',
            failureReason: reason,
            statusChangedAt: new Date()
        }, { new: true });
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        res.json({
            success: true,
            data: payment
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error marking payment as failed',
            error: error.message
        });
    }
});
// Refund payment (PayU)
router.post('/:id/refund', async (req, res) => {
    try {
        const { id } = req.params;
        const { refundAmount, reason } = req.body;
        const payment = await Payment.findById(id);
        if (!payment) {
            return res.status(404).json({
                success: false,
                message: 'Payment not found'
            });
        }
        const amount = refundAmount || payment.amount;
        const isFullRefund = amount === payment.amount;
        // TODO: Call PayU refund API
        // const refundId = await initiatePayURefund(payment.paymentId, amount);
        const updatedPayment = await Payment.findByIdAndUpdate(id, {
            status: isFullRefund ? 'refunded' : 'completed',
            refundStatus: isFullRefund ? 'full' : 'partial',
            refundAmount: amount,
            refundReason: reason,
            refundDate: new Date(),
            refundId: `REF-${Date.now()}`,
            statusChangedAt: new Date()
        }, { new: true });
        res.json({
            success: true,
            data: updatedPayment,
            message: 'Refund initiated successfully'
        });
    }
    catch (error) {
        res.status(400).json({
            success: false,
            message: 'Error processing refund',
            error: error.message
        });
    }
});
// Get payments by workshop
router.get('/workshop/:workshopId', async (req, res) => {
    try {
        const { workshopId } = req.params;
        const { status } = req.query;
        let filter = { workshopId };
        if (status)
            filter.status = status;
        const payments = await Payment.find(filter)
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        res.json({
            success: true,
            data: payments
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching payments',
            error
        });
    }
});
// Get payment statistics
router.get('/stats/:workshopId', async (req, res) => {
    try {
        const { workshopId } = req.params;
        const payments = await Payment.find({
            workshopId,
            status: 'completed'
        });
        const stats = {
            totalPayments: payments.length,
            totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
            byStatus: {
                completed: payments.filter((p) => p.status === 'completed').length,
                pending: payments.filter((p) => p.status === 'pending').length,
                initiated: payments.filter((p) => p.status === 'initiated').length,
                failed: payments.filter((p) => p.status === 'failed').length,
                refunded: payments.filter((p) => p.status === 'refunded').length
            },
            byGateway: {
                payu: payments.filter((p) => p.paymentGateway === 'payu').length,
                paypal: payments.filter((p) => p.paymentGateway === 'paypal').length,
                external: payments.filter((p) => p.paymentGateway === 'external').length
            },
            byCurrency: {
                INR: payments.filter((p) => p.currency === 'INR').reduce((sum, p) => sum + p.amount, 0),
                NPR: payments.filter((p) => p.currency === 'NPR').reduce((sum, p) => sum + p.amount, 0),
                USD: payments.filter((p) => p.currency === 'USD').reduce((sum, p) => sum + p.amount, 0)
            }
        };
        res.json({
            success: true,
            data: stats
        });
    }
    catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching payment statistics',
            error
        });
    }
});
export default router;
//# sourceMappingURL=payment.js.map