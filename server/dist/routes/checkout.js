import { Router } from 'express';
import Checkout from '../models/Checkout.js';
import Cart from '../models/Cart.js';
const router = Router();
// Helper to extract userId from headers or request
const getUserIdFromHeaders = (req) => {
    const authHeader = req.headers.authorization || '';
    return authHeader.replace('Bearer ', '') || 'anonymous';
};
// Generate unique order ID
const generateOrderId = () => {
    return `ORD-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
};
// POST: Create checkout from cart
router.post('/', async (req, res) => {
    try {
        const userId = getUserIdFromHeaders(req);
        const { email, paymentMethod, shippingAddress, billingAddress, notes, couponCode, } = req.body;
        console.log(`🛒 Processing checkout for user: ${userId}`);
        if (!email || !paymentMethod) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: email, paymentMethod',
            });
            return;
        }
        // Get user's cart
        const cart = await Cart.findOne({
            $or: [{ userId }, { email }],
        });
        if (!cart || !cart.items || cart.items.length === 0) {
            res.status(400).json({
                success: false,
                message: 'Cart is empty',
            });
            return;
        }
        // Calculate totals
        const subtotal = cart.totalPrice || 0;
        const tax = Math.round(subtotal * 0.18); // 18% GST
        const discount = couponCode ? 100 : 0; // Placeholder for coupon logic
        const total = subtotal + tax - discount;
        // Create checkout record
        const orderId = generateOrderId();
        const checkout = new Checkout({
            userId: userId || email,
            email,
            orderId,
            items: cart.items,
            subtotal,
            tax,
            discount,
            total,
            paymentMethod,
            paymentStatus: 'pending',
            status: 'pending',
            shippingAddress,
            billingAddress: billingAddress || shippingAddress, // Default billing to shipping
            notes,
        });
        await checkout.save();
        console.log(`✅ Checkout created: ${orderId}`);
        res.json({
            success: true,
            data: checkout,
            message: 'Checkout created successfully',
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error processing checkout:', errorMessage);
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to process checkout',
            error: errorMessage,
        });
    }
});
// GET: Fetch checkout details by orderId
router.get('/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log(`📖 Fetching checkout: ${orderId}`);
        const checkout = await Checkout.findOne({ orderId });
        if (!checkout) {
            res.status(404).json({
                success: false,
                message: 'Checkout not found',
            });
            return;
        }
        console.log(`✅ Retrieved checkout: ${orderId}`);
        res.json({ success: true, data: checkout });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching checkout:', errorMessage);
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to fetch checkout',
            error: errorMessage,
        });
    }
});
// GET: List checkouts for user
router.get('/user/:userIdentifier', async (req, res) => {
    try {
        const { userIdentifier } = req.params;
        console.log(`📖 Fetching checkouts for user: ${userIdentifier}`);
        const checkouts = await Checkout.find({
            $or: [{ userId: userIdentifier }, { email: userIdentifier }],
        }).sort({ createdAt: -1 });
        console.log(`✅ Retrieved ${checkouts.length} checkouts`);
        res.json({ success: true, data: checkouts });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching checkouts:', errorMessage);
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to fetch checkouts',
            error: errorMessage,
        });
    }
});
// PUT: Update payment status (simulate payment processing)
router.put('/:orderId/payment', async (req, res) => {
    try {
        const { orderId } = req.params;
        const { paymentStatus } = req.body;
        if (!paymentStatus || !['completed', 'failed', 'refunded'].includes(paymentStatus)) {
            res.status(400).json({
                success: false,
                message: 'Invalid paymentStatus',
            });
            return;
        }
        console.log(`💳 Updating payment for order: ${orderId} -> ${paymentStatus}`);
        const checkout = await Checkout.findOneAndUpdate({ orderId }, {
            paymentStatus,
            status: paymentStatus === 'completed' ? 'completed' : 'cancelled',
            paidAt: paymentStatus === 'completed' ? new Date() : null,
            cancelledAt: paymentStatus === 'failed' ? new Date() : null,
        }, { new: true });
        if (!checkout) {
            res.status(404).json({
                success: false,
                message: 'Checkout not found',
            });
            return;
        }
        // If payment successful, clear cart
        if (paymentStatus === 'completed') {
            await Cart.updateOne({ email: checkout.email }, { $set: { items: [], status: 'purchased' } });
        }
        console.log(`✅ Payment updated for order: ${orderId}`);
        res.json({
            success: true,
            data: checkout,
            message: 'Payment status updated',
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error updating payment:', errorMessage);
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to update payment',
            error: errorMessage,
        });
    }
});
// DELETE: Cancel checkout
router.delete('/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        console.log(`🗑️ Cancelling checkout: ${orderId}`);
        const checkout = await Checkout.findOneAndUpdate({ orderId }, {
            status: 'cancelled',
            cancelledAt: new Date(),
        }, { new: true });
        if (!checkout) {
            res.status(404).json({
                success: false,
                message: 'Checkout not found',
            });
            return;
        }
        console.log(`✅ Checkout cancelled: ${orderId}`);
        res.json({
            success: true,
            data: checkout,
            message: 'Checkout cancelled',
        });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error cancelling checkout:', errorMessage);
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to cancel checkout',
            error: errorMessage,
        });
    }
});
// GET: Checkout stats for admin
router.get('/admin/stats', async (req, res) => {
    try {
        console.log(`📊 Fetching checkout statistics`);
        const totalCheckouts = await Checkout.countDocuments();
        const completedCheckouts = await Checkout.countDocuments({ status: 'completed' });
        const pendingCheckouts = await Checkout.countDocuments({ status: 'pending' });
        const cancelledCheckouts = await Checkout.countDocuments({ status: 'cancelled' });
        const totalRevenue = await Checkout.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$total' } } },
        ]);
        const byPaymentMethod = await Checkout.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: '$paymentMethod', count: { $sum: 1 }, total: { $sum: '$total' } } },
        ]);
        const stats = {
            totalCheckouts,
            completedCheckouts,
            pendingCheckouts,
            cancelledCheckouts,
            totalRevenue: totalRevenue[0]?.total || 0,
            byPaymentMethod: Object.fromEntries(byPaymentMethod.map((m) => [m._id, { count: m.count, total: m.total }])),
        };
        console.log(`✅ Retrieved checkout stats`);
        res.json({ success: true, data: stats });
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error fetching stats:', errorMessage);
        res
            .status(500)
            .json({
            success: false,
            message: 'Failed to fetch stats',
            error: errorMessage,
        });
    }
});
export default router;
//# sourceMappingURL=checkout.js.map