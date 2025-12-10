import express, { Request, Response } from 'express';
import Workshop, { IWorkshop } from '../models/Workshop';

const router = express.Router();

// Get all workshops (public) - accessible at /public
router.get('/public', async (req: Request, res: Response) => {
  try {
    const { isPublished, category, language } = req.query;
    
    let filter: any = {};
    if (isPublished !== undefined) filter.isPublished = true;
    if (category) filter.category = category;
    if (language) filter.languages = { $in: [language] };
    
    const workshops = await Workshop.find(filter)
      .select('-sessions')
      .sort({ createdAt: -1 });
    
    console.log(`📚 Found ${workshops.length} public workshops`);
    res.json({
      success: true,
      data: workshops,
      count: workshops.length
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error fetching public workshops:', message);
    res.status(500).json({
      success: false,
      message: 'Error fetching workshops',
      error: message
    });
  }
});

// Get all workshops (public) - also accessible at / for backwards compatibility
router.get('/', async (req: Request, res: Response) => {
  try {
    const { isPublished, category, language } = req.query;
    
    let filter: any = {};
    if (isPublished) filter.isPublished = true;
    if (category) filter.category = category;
    if (language) filter.languages = { $in: [language] };
    
    const workshops = await Workshop.find(filter)
      .select('-sessions')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: workshops
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching workshops',
      error
    });
  }
});

// Get single workshop by ID or slug
router.get('/:identifier', async (req: Request, res: Response) => {
  try {
    const { identifier } = req.params;
    
    let workshop: IWorkshop | null = null;
    
    // Try to find by ID first
    if (identifier.match(/^[0-9a-fA-F]{24}$/)) {
      workshop = await Workshop.findById(identifier);
    }
    
    // If not found, try by slug
    if (!workshop) {
      workshop = await Workshop.findOne({ slug: identifier });
    }
    
    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    res.json({
      success: true,
      data: workshop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching workshop',
      error
    });
  }
});

// Create new workshop (admin only)
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.headers['x-user-id'];
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User ID required'
      });
    }
    
    const workshopData: Partial<IWorkshop> = {
      ...req.body,
      createdBy: userId as any
    };
    
    const workshop = new Workshop(workshopData);
    await workshop.save();
    
    res.status(201).json({
      success: true,
      data: workshop
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error creating workshop',
      error: error.message
    });
  }
});

// Update workshop (admin only)
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const workshop = await Workshop.findByIdAndUpdate(
      id,
      { ...req.body, updatedBy: req.headers['x-user-id'] },
      { new: true, runValidators: true }
    );
    
    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    res.json({
      success: true,
      data: workshop
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error updating workshop',
      error: error.message
    });
  }
});

// Delete workshop (admin only)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const workshop = await Workshop.findByIdAndDelete(id);
    
    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    res.json({
      success: true,
      message: 'Workshop deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting workshop',
      error
    });
  }
});

// Publish/unpublish workshop
router.patch('/:id/publish', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isPublished } = req.body;
    
    const workshop = await Workshop.findByIdAndUpdate(
      id,
      { isPublished, updatedBy: req.headers['x-user-id'] },
      { new: true }
    );
    
    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    res.json({
      success: true,
      data: workshop
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error updating workshop',
      error
    });
  }
});

// Get workshops by category
router.get('/category/:category', async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    
    const workshops = await Workshop.find({ category, isPublished: true })
      .select('-sessions')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      data: workshops
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching workshops',
      error
    });
  }
});

// Add testimonial/rating
router.post('/:id/testimonial', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { rating, text, userId, name, location, photo, videoUrl } = req.body;
    
    const workshop = await Workshop.findByIdAndUpdate(
      id,
      {
        $push: {
          testimonials: {
            userId,
            name,
            location,
            rating,
            text,
            photo,
            videoUrl,
            submittedAt: new Date()
          }
        },
        $inc: { totalReviews: 1 }
      },
      { new: true }
    );
    
    if (!workshop) {
      return res.status(404).json({
        success: false,
        message: 'Workshop not found'
      });
    }
    
    // Recalculate average rating
    if (workshop.testimonials && workshop.testimonials.length > 0) {
      const avgRating = workshop.testimonials.reduce((sum: number, t: any) => sum + (t.rating || 0), 0) / workshop.testimonials.length;
      workshop.averageRating = avgRating;
      await workshop.save();
    }
    
    res.json({
      success: true,
      data: workshop
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      message: 'Error adding testimonial',
      error: error.message
    });
  }
});

export default router;
