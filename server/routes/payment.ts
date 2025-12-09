import express, { Request, Response } from 'express';
import Payment, { IPayment } from '../models/Payment';

const router = express.Router();

// Get all payments for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const payments = await Payment.find({ userId })
      .populate('workshopId', 'title')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error
    });
  }
});

// Get payment by ID
router.get('/:id', async (req: Request, res: Response) => {
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment',
      error
    });
  }
});

// Create payment (initiate order)
router.post('/', async (req: Request, res: Response) => {
  try {
    const { enrollmentId, userId, workshopId, amount, currency, subtotal } = req.body;
    
    if (!enrollmentId || !userId || !workshopId || !amount) {
      return res.status(400).json({
        success: false,
        message: 'enrollmentId, userId, workshopId, and amount are required'
      });
    }
    
    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}`;
    
    const payment = new Payment({
      enrollmentId,
      userId,
      workshopId,
      amount,
      currency: currency || 'INR',
      subtotal: subtotal || amount,
      invoiceNumber,
      status: 'pending',
      paymentMethod: 'razorpay',
      statusChangedAt: new Date()
    });
    
    await payment.save();
    
    res.status(201).json({
      success: true,
      data: payment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error creating payment',
      error: error.message
    });
  }
});

// Verify payment (after Razorpay callback)
router.post('/:id/verify', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { paymentId, orderId, signature } = req.body;
    
    // TODO: Verify signature with Razorpay
    // const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    
    const payment = await Payment.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        paymentId,
        orderId,
        signature,
        statusChangedAt: new Date()
      },
      { new: true }
    );
    
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
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error verifying payment',
      error: error.message
    });
  }
});

// Mark payment as failed
router.post('/:id/fail', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const payment = await Payment.findByIdAndUpdate(
      id,
      {
        status: 'failed',
        failureReason: reason,
        statusChangedAt: new Date()
      },
      { new: true }
    );
    
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
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error marking payment as failed',
      error: error.message
    });
  }
});

// Refund payment
router.post('/:id/refund', async (req: Request, res: Response) => {
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
    
    const updatedPayment = await Payment.findByIdAndUpdate(
      id,
      {
        status: isFullRefund ? 'refunded' : 'completed',
        refundStatus: isFullRefund ? 'full' : 'partial',
        refundAmount: amount,
        refundReason: reason,
        refundDate: new Date(),
        statusChangedAt: new Date()
      },
      { new: true }
    );
    
    res.json({
      success: true,
      data: updatedPayment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error processing refund',
      error: error.message
    });
  }
});

// Get payments by workshop
router.get('/workshop/:workshopId', async (req: Request, res: Response) => {
  try {
    const { workshopId } = req.params;
    const { status } = req.query;
    
    let filter: any = { workshopId };
    if (status) filter.status = status;
    
    const payments = await Payment.find(filter)
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payments',
      error
    });
  }
});

// Get payment statistics
router.get('/stats/:workshopId', async (req: Request, res: Response) => {
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
        failed: payments.filter((p) => p.status === 'failed').length,
        refunded: payments.filter((p) => p.status === 'refunded').length
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
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching payment statistics',
      error
    });
  }
});

export default router;
