import { Request, Response } from 'express';
import { WorkerProfile } from '@nexus-civic/db';
import { matchWorkerToGigs } from '../utils/graphrag';

export const createProfile = async (req: Request, res: Response) => {
  try {
    const {
      name,
      skills,
      location,
      bio,
    } = req.body;
    
    // Assuming auth middleware sets req.user
    const userId = (req as any).user?.id || req.body.userId;

    const profile = await WorkerProfile.findOneAndUpdate(
      { userId },
      { name, skills, location, bio },
      { new: true, upsert: true }
    );

    res.status(200).json(profile);
  } catch (error) {
    console.error('Error creating worker profile:', error);
    res.status(500).json({ error: 'Failed to create worker profile' });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const profile = await WorkerProfile.findById(id);

    if (!profile) {
      return res.status(404).json({ error: 'Worker profile not found' });
    }

    res.status(200).json(profile);
  } catch (error) {
    console.error('Error getting worker profile:', error);
    res.status(500).json({ error: 'Failed to get worker profile' });
  }
};

export const getMatches = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const matches = await matchWorkerToGigs(id);
    
    res.status(200).json(matches);
  } catch (error: any) {
    console.error('Error getting worker matches:', error);
    res.status(500).json({ error: 'Failed to get worker matches', details: error.message });
  }
};
