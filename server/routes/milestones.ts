import express, { Request, Response, Router } from 'express';
import Milestone from '../models/Milestone.js';

const router: Router = express.Router();

/**
 * Helper function to extract user ID from headers
 */
function getUserId(req: Request): string {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    console.warn('⚠️ Missing X-User-ID header in milestones route');
  }
  return userId || 'anonymous';
}

/**
 * GET /api/milestones
 * Fetch all milestones for the current user
 */
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    console.log(`🏆 Fetching milestones for user: ${userId}`);

    const milestones = await Milestone.find({ userId }).lean().sort({ createdAt: -1 });

    console.log(`✅ Found ${milestones.length} milestones`);
    res.json({
      success: true,
      data: milestones,
      count: milestones.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching milestones:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/milestones/:id
 * Fetch a single milestone by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    const milestone = await Milestone.findOne({ _id: req.params.id, userId });

    if (!milestone) {
      res.status(404).json({
        success: false,
        message: 'Milestone not found',
        id: req.params.id,
      });
      return;
    }

    res.json({
      success: true,
      data: milestone,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching milestone:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/milestones
 * Create a new milestone
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    console.log(`✏️ Creating new milestone for user: ${userId}`);

    if (!req.body.title) {
      res.status(400).json({
        success: false,
        message: 'Title is required',
      });
      return;
    }

    const milestone = new Milestone({
      userId,
      ...req.body,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await milestone.save();

    console.log(`✅ Milestone created: ${milestone._id}`);
    res.status(201).json({
      success: true,
      data: milestone,
      message: 'Milestone created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error creating milestone:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * PUT /api/milestones/:id
 * Update an existing milestone
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    console.log(`🔄 Updating milestone ${req.params.id} for user: ${userId}`);

    const milestone = await Milestone.findOneAndUpdate(
      { _id: req.params.id, userId },
      {
        ...req.body,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!milestone) {
      res.status(404).json({
        success: false,
        message: 'Milestone not found',
      });
      return;
    }

    console.log(`✅ Milestone updated: ${milestone._id}`);
    res.json({
      success: true,
      data: milestone,
      message: 'Milestone updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error updating milestone:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * DELETE /api/milestones/:id
 * Delete a milestone
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserId(req);
    console.log(`🗑️ Deleting milestone ${req.params.id} for user: ${userId}`);

    const milestone = await Milestone.findOneAndDelete({
      _id: req.params.id,
      userId,
    });

    if (!milestone) {
      res.status(404).json({
        success: false,
        message: 'Milestone not found',
      });
      return;
    }

    console.log(`✅ Milestone deleted: ${req.params.id}`);
    res.json({
      success: true,
      message: 'Milestone deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error deleting milestone:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

export default router;
