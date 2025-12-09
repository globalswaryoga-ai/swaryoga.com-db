import express, { Request, Response } from 'express';
import PageState from '../models/PageState';

const router = express.Router();

// Get user's last visited page
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.get('X-User-ID');
    
    if (!userId) {
      return res.status(400).json({ error: 'X-User-ID header required' });
    }

    const pageState = await PageState.findOne({ userId });
    
    if (!pageState) {
      return res.status(404).json({ error: 'No page state found' });
    }

    res.json(pageState);
  } catch (error) {
    console.error('Error fetching page state:', error);
    res.status(500).json({ error: 'Failed to fetch page state' });
  }
});

// Save or update page state
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = req.get('X-User-ID') || req.body.userId;
    
    if (!userId) {
      return res.status(400).json({ error: 'X-User-ID header or userId required' });
    }

    const { pageName, pageData } = req.body;

    const pageState = await PageState.findOneAndUpdate(
      { userId },
      {
        userId,
        pageName,
        pageData,
        lastVisited: new Date(),
      },
      { upsert: true, new: true }
    );

    res.json(pageState);
  } catch (error) {
    console.error('Error saving page state:', error);
    res.status(500).json({ error: 'Failed to save page state' });
  }
});

// Delete page state
router.delete('/', async (req: Request, res: Response) => {
  try {
    const userId = req.get('X-User-ID');
    
    if (!userId) {
      return res.status(400).json({ error: 'X-User-ID header required' });
    }

    await PageState.deleteOne({ userId });
    
    res.json({ success: true, message: 'Page state deleted' });
  } catch (error) {
    console.error('Error deleting page state:', error);
    res.status(500).json({ error: 'Failed to delete page state' });
  }
});

export default router;
