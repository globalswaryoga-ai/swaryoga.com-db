import express, { Request, Response } from 'express';
import Assignment, { IAssignment } from '../models/Assignment';

const router = express.Router();

// Get all assignments for a workshop
router.get('/workshop/:workshopId', async (req: Request, res: Response) => {
  try {
    const { workshopId } = req.params;
    
    const assignments = await Assignment.find({ workshopId })
      .sort({ sessionId: 1 });
    
    res.json({
      success: true,
      data: assignments
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assignments',
      error
    });
  }
});

// Get assignment by ID
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findById(id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }
    
    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment',
      error
    });
  }
});

// Create new assignment
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID required'
      });
    }
    
    const {
      workshopId,
      sessionId,
      title,
      description,
      instructions,
      totalPoints,
      passingPercentage,
      submissionDeadlineDays,
      attachments
    } = req.body;
    
    if (!workshopId || !sessionId || !title) {
      return res.status(400).json({
        success: false,
        message: 'workshopId, sessionId, and title are required'
      });
    }
    
    const assignment = new Assignment({
      workshopId,
      sessionId,
      title,
      description,
      instructions,
      totalPoints: totalPoints || 100,
      passingPercentage: passingPercentage || 60,
      submissionDeadlineDays: submissionDeadlineDays || 7,
      attachments: attachments || [],
      createdBy: userId
    });
    
    await assignment.save();
    
    res.status(201).json({
      success: true,
      data: assignment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error creating assignment',
      error: error.message
    });
  }
});

// Update assignment
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findByIdAndUpdate(
      id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }
    
    res.json({
      success: true,
      data: assignment
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error updating assignment',
      error: error.message
    });
  }
});

// Delete assignment
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const assignment = await Assignment.findByIdAndDelete(id);
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Assignment deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting assignment',
      error
    });
  }
});

// Publish/unpublish assignment
router.patch('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    
    const assignment = await Assignment.findByIdAndUpdate(
      id,
      { isPublished },
      { new: true }
    );
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }
    
    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating assignment',
      error
    });
  }
});

// Get assignment for a session
router.get('/session/:sessionId', async (req: Request, res: Response) => {
  try {
    const { workshopId } = req.query;
    const { sessionId } = req.params;
    
    if (!workshopId) {
      return res.status(400).json({
        success: false,
        message: 'workshopId query param required'
      });
    }
    
    const assignment = await Assignment.findOne({
      workshopId,
      sessionId: parseInt(sessionId)
    });
    
    if (!assignment) {
      return res.status(404).json({
        success: false,
        message: 'Assignment not found'
      });
    }
    
    res.json({
      success: true,
      data: assignment
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching assignment',
      error
    });
  }
});

export default router;
