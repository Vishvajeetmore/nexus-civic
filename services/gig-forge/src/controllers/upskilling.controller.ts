import { Request, Response } from 'express';
import { getRecommendations } from '../utils/upskilling';

export const getUpskilling = async (req: Request, res: Response) => {
  try {
    const { workerId } = req.params;
    const completedGigCategory = req.query.category as string || 'plumbing'; // mock or use real complete gig history
    
    // Recommendations based on a category of gig they might have completed recently
    const recommendations = getRecommendations(workerId, completedGigCategory);

    res.status(200).json({ workerId, recommendedSchemes: recommendations });
  } catch (error) {
    console.error('Error getting upskilling recommendations:', error);
    res.status(500).json({ error: 'Failed to get upskilling recommendations' });
  }
};
