import express, { Request, Response, Router } from 'express';
import Workshop from '../models/Workshop.js';
import type { IWorkshop } from '../models/Workshop.js';

const router: Router = express.Router();

/**
 * Type definitions
 */
interface WorkshopQuery {
  page?: string | number;
  limit?: string | number;
  isPublic?: string;
  category?: string;
  search?: string;
}

interface WorkshopFilter {
  [key: string]: any;
  isPublic?: boolean;
  category?: string;
  $or?: Array<{ [key: string]: any }>;
}

/**
 * Helper function to extract user ID from headers
 */
function getUserIdFromHeaders(req: Request): string {
  const userId = req.headers['x-user-id'] as string;
  if (!userId) {
    console.warn('⚠️ Missing X-User-ID header in workshops route');
  }
  return userId || 'anonymous';
}

/**
 * GET /api/workshops
 * Fetch all public workshops with pagination and filtering
 * Query params: page, limit, isPublic, category, search
 */
router.get('/', async (req: Request<any, any, any, WorkshopQuery>, res: Response): Promise<void> => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, parseInt(req.query.limit as string) || 10);
    const skip = (page - 1) * limit;

    const filter: WorkshopFilter = {};
    
    // Filter by public status (default to public)
    if (req.query.isPublic !== undefined) {
      filter.isPublic = req.query.isPublic === 'true';
    } else {
      filter.isPublic = true;
    }

    // Filter by category
    if (req.query.category) {
      filter.category = req.query.category;
    }

    // Search in title and description
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    console.log(`🎓 Fetching workshops | Page: ${page}, Limit: ${limit}, Filters:`, filter);

    const [workshops, total] = await Promise.all([
      Workshop.find(filter)
        .skip(skip)
        .limit(limit)
        .lean()
        .sort({ startDate: -1 }),
      Workshop.countDocuments(filter),
    ]);

    console.log(`✅ Retrieved ${workshops.length} workshops (Total: ${total})`);

    res.json({
      success: true,
      data: workshops,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
      count: workshops.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching workshops:', message);
    res.status(500).json({
      success: false,
      error: message,
      message: 'Failed to fetch workshops',
    });
  }
});

/**
 * GET /api/workshops/stats/summary
 * Fetch workshop statistics (total, public, upcoming, enrolled)
 */
router.get('/stats/summary', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log('📊 Fetching workshop statistics');

    const [total, public_count, upcoming, enrolled_sum] = await Promise.all([
      Workshop.countDocuments(),
      Workshop.countDocuments({ isPublic: true }),
      Workshop.countDocuments({ startDate: { $gte: new Date() } }),
      Workshop.aggregate([
        { $group: { _id: null, totalEnrolled: { $sum: '$enrolledCount' } } },
      ]),
    ]);

    const stats = {
      total,
      public: public_count,
      upcoming,
      totalEnrolled: enrolled_sum[0]?.totalEnrolled || 0,
    };

    console.log('✅ Workshop statistics:', stats);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching statistics:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * GET /api/workshops/:id
 * Fetch a single workshop by ID
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    console.log(`🎓 Fetching workshop: ${req.params.id}`);

    const workshop = await Workshop.findById(req.params.id).lean();

    if (!workshop) {
      console.warn(`⚠️ Workshop not found: ${req.params.id}`);
      res.status(404).json({
        success: false,
        message: 'Workshop not found',
        id: req.params.id,
      });
      return;
    }

    console.log(`✅ Retrieved workshop: ${workshop.title}`);
    res.json({
      success: true,
      data: workshop,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching workshop:', message);
    res.status(500).json({
      success: false,
      error: message,
    });
  }
});

/**
 * POST /api/workshops
 * Create a new workshop (typically by admin)
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserIdFromHeaders(req);
    console.log(`✏️ Creating new workshop by user: ${userId}`);

    // Validate required fields
    if (!req.body.title || !req.body.instructor) {
      res.status(400).json({
        success: false,
        message: 'Title and instructor are required',
      });
      return;
    }

    const workshop = new Workshop({
      ...req.body,
      enrolledCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const savedWorkshop = await workshop.save();

    console.log(`✅ Workshop created: ${savedWorkshop._id} | Title: ${savedWorkshop.title}`);

    res.status(201).json({
      success: true,
      data: savedWorkshop,
      message: 'Workshop created successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error creating workshop:', message);
    res.status(500).json({
      success: false,
      error: message,
      message: 'Failed to create workshop',
    });
  }
});

/**
 * PUT /api/workshops/:id
 * Update an existing workshop
 */
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserIdFromHeaders(req);
    console.log(`🔄 Updating workshop ${req.params.id} by user: ${userId}`);

    const workshop = await Workshop.findByIdAndUpdate(
      req.params.id,
      {
        ...req.body,
        updatedAt: new Date(),
      },
      { new: true, runValidators: true }
    );

    if (!workshop) {
      console.warn(`⚠️ Workshop not found for update: ${req.params.id}`);
      res.status(404).json({
        success: false,
        message: 'Workshop not found',
      });
      return;
    }

    console.log(`✅ Workshop updated: ${workshop.title}`);
    res.json({
      success: true,
      data: workshop,
      message: 'Workshop updated successfully',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error updating workshop:', message);
    res.status(500).json({
      success: false,
      error: message,
      message: 'Failed to update workshop',
    });
  }
});

/**
 * DELETE /api/workshops/:id
 * Delete a workshop
 */
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserIdFromHeaders(req);
    console.log(`🗑️ Deleting workshop ${req.params.id} by user: ${userId}`);

    const workshop = await Workshop.findByIdAndDelete(req.params.id);

    if (!workshop) {
      console.warn(`⚠️ Workshop not found for deletion: ${req.params.id}`);
      res.status(404).json({
        success: false,
        message: 'Workshop not found',
      });
      return;
    }

    console.log(`✅ Workshop deleted: ${workshop.title}`);
    res.json({
      success: true,
      message: 'Workshop deleted successfully',
      deletedId: req.params.id,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error deleting workshop:', message);
    res.status(500).json({
      success: false,
      error: message,
      message: 'Failed to delete workshop',
    });
  }
});

/**
 * POST /api/workshops/:id/enroll
 * Enroll a user in a workshop
 */
router.post('/:id/enroll', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserIdFromHeaders(req);
    console.log(`📝 User ${userId} enrolling in workshop ${req.params.id}`);

    const workshop = await Workshop.findById(req.params.id);

    if (!workshop) {
      console.warn(`⚠️ Workshop not found: ${req.params.id}`);
      res.status(404).json({
        success: false,
        message: 'Workshop not found',
      });
      return;
    }

    // Check if workshop is full
    const currentEnrolled = workshop.enrolledCount || 0;
    const maxParticipants = workshop.maxParticipants || 100;

    if (currentEnrolled >= maxParticipants) {
      console.warn(`⚠️ Workshop is full: ${workshop.title} (${currentEnrolled}/${maxParticipants})`);
      res.status(400).json({
        success: false,
        message: 'Workshop is full',
        enrolled: currentEnrolled,
        maxParticipants,
      });
      return;
    }

    // Enroll user
    workshop.enrolledCount = currentEnrolled + 1;
    await workshop.save();

    console.log(
      `✅ User enrolled in ${workshop.title} | New count: ${workshop.enrolledCount}/${maxParticipants}`
    );

    res.status(201).json({
      success: true,
      data: workshop,
      message: 'Enrolled successfully',
      enrolled: workshop.enrolledCount,
      maxParticipants,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error enrolling in workshop:', message);
    res.status(500).json({
      success: false,
      error: message,
      message: 'Failed to enroll in workshop',
    });
  }
});

/**
 * POST /api/workshops/:id/unenroll
 * Unenroll a user from a workshop
 */
router.post('/:id/unenroll', async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = getUserIdFromHeaders(req);
    console.log(`❌ User ${userId} unenrolling from workshop ${req.params.id}`);

    const workshop = await Workshop.findById(req.params.id);

    if (!workshop) {
      res.status(404).json({
        success: false,
        message: 'Workshop not found',
      });
      return;
    }

    const currentEnrolled = workshop.enrolledCount || 0;
    if (currentEnrolled > 0) {
      workshop.enrolledCount = currentEnrolled - 1;
      await workshop.save();
      console.log(`✅ User unenrolled from ${workshop.title} | New count: ${workshop.enrolledCount}`);
    }

    res.json({
      success: true,
      data: workshop,
      message: 'Unenrolled successfully',
      enrolled: workshop.enrolledCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error unenrolling from workshop:', message);
    res.status(500).json({
      success: false,
      error: message,
      message: 'Failed to unenroll from workshop',
    });
  }
});

export default router;
