import express, { Request, Response } from 'express';
import Enrollment, { IEnrollment } from '../models/Enrollment';
import Workshop from '../models/Workshop';

const router = express.Router();

// Get all enrollments for a user
router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const enrollments = await Enrollment.find({ userId })
      .populate('workshopId', 'title thumbnail category')
      .sort({ enrollmentDate: -1 });
    
    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollments',
      error
    });
  }
});

// Get enrollment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const enrollment = await Enrollment.findById(id)
      .populate('workshopId')
      .populate('userId', 'name email phone');
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }
    
    res.json({
      success: true,
      data: enrollment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollment',
      error
    });
  }
});

// Create new enrollment
router.post('/', async (req: Request, res: Response) => {
  try {
    const { workshopId, userId, batchId, selectedMode, selectedLanguage, phone, email } = req.body;
    
    if (!workshopId || !userId || !batchId) {
      return res.status(400).json({
        success: false,
        message: 'workshopId, userId, and batchId are required'
      });
    }
    
    const workshop = await Workshop.findById(workshopId);
    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    // Check if user already enrolled in this workshop
    const existingEnrollment = await Enrollment.findOne({ workshopId, userId });
    if (existingEnrollment) {
      return res.status(400).json({
        success: false,
        message: 'User already enrolled in this workshop'
      });
    }
    
    // Find the batch
    const batch = workshop.batches.find((b: any) => b._id?.toString() === batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }
    
    // Check capacity
    if (batch.enrolledCount >= batch.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Batch is full'
      });
    }
    
    const enrollment = new Enrollment({
      workshopId,
      userId,
      batchId,
      selectedMode,
      selectedLanguage,
      phone,
      email,
      startDate: batch.startDate,
      endDate: batch.endDate,
      status: 'active'
    });
    
    await enrollment.save();
    
    // Update batch enrollment count
    batch.enrolledCount += 1;
    workshop.totalEnrollments += 1;
    await workshop.save();
    
    res.status(201).json({
      success: true,
      data: enrollment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error creating enrollment',
      error: error.message
    });
  }
});

// Update enrollment status
router.put('/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['active', 'completed', 'cancelled', 'paused'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }
    
    const enrollment = await Enrollment.findByIdAndUpdate(
      id,
      { status, cancelledAt: status === 'cancelled' ? new Date() : undefined },
      { new: true }
    );
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }
    
    res.json({
      success: true,
      data: enrollment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error updating enrollment',
      error: error.message
    });
  }
});

// Issue certificate
router.post('/:id/certificate', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { certificateUrl, certificateNumber } = req.body;
    
    const enrollment = await Enrollment.findByIdAndUpdate(
      id,
      {
        status: 'completed',
        certificateUrl,
        certificateNumber,
        certificateIssueDate: new Date()
      },
      { new: true }
    );
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }
    
    res.json({
      success: true,
      data: enrollment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error issuing certificate',
      error: error.message
    });
  }
});

// Cancel enrollment
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const enrollment = await Enrollment.findByIdAndUpdate(
      id,
      {
        status: 'cancelled',
        cancelledAt: new Date(),
        cancelledReason: reason
      },
      { new: true }
    );
    
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        message: 'Enrollment not found'
      });
    }
    
    res.json({
      success: true,
      data: enrollment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error cancelling enrollment',
      error: error.message
    });
  }
});

// Get enrollments by workshop
router.get('/workshop/:workshopId', async (req: Request, res: Response) => {
  try {
    const { workshopId } = req.params;
    
    const enrollments = await Enrollment.find({ workshopId })
      .populate('userId', 'name email phone')
      .sort({ enrollmentDate: -1 });
    
    res.json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching enrollments',
      error
    });
  }
});

export default router;
