import { Request, Response } from 'express';
import { GigListing } from '@nexus-civic/db';
import { screenListing } from '../utils/fraudDetection';

export const createListing = async (req: Request, res: Response) => {
  try {
    const {
      title,
      description,
      requiredSkills,
      location,
      budget,
    } = req.body;

    const employerId = (req as any).user?.id || req.body.employerId || 'anonymous';

    const screening = await screenListing(title, description, budget);
    
    let status = 'PENDING_REVIEW';
    if (screening.isSafe) {
      status = 'ACTIVE';
    } else {
      status = 'REJECTED'; 
      // Could also keep PENDING_REVIEW based on flags
    }

    const listing = await GigListing.create({
      title,
      description,
      requiredSkills,
      location,
      budget,
      employerId,
      fraudScore: screening.fraudScore,
      fraudFlags: screening.flags,
      status
    });

    res.status(201).json({ listing, screeningRecommendation: screening.recommendation });
  } catch (error: any) {
    console.error('Error creating gig listing:', error);
    res.status(500).json({ error: 'Failed to create gig listing', details: error.message });
  }
};

export const browseListing = async (req: Request, res: Response) => {
  try {
    // Basic browse, optionally with filters
    const query: any = { status: 'ACTIVE' };
    
    if (req.query.skill) {
      query.requiredSkills = { $in: [req.query.skill] };
    }

    const listings = await GigListing.find(query).sort({ createdAt: -1 });

    res.status(200).json(listings);
  } catch (error) {
    console.error('Error browsing listings:', error);
    res.status(500).json({ error: 'Failed to browse listings' });
  }
};

export const getListing = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const listing = await GigListing.findById(id);

    if (!listing) {
      return res.status(404).json({ error: 'Gig listing not found' });
    }

    res.status(200).json(listing);
  } catch (error) {
    console.error('Error getting gig listing:', error);
    res.status(500).json({ error: 'Failed to get gig listing' });
  }
};

export const applyToGig = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const workerId = (req as any).user?.id || req.body.workerId;
    
    const listing = await GigListing.findById(id);
    if (!listing || listing.status !== 'ACTIVE') {
      return res.status(404).json({ error: 'Active gig listing not found' });
    }

    // Usually you'd create a GigApplication model or update the GigListing.
    // Assuming we just acknowledge and maybe notify here for this simplified service.
    
    res.status(200).json({ message: 'Applied to gig successfully', listingId: id, workerId });
  } catch (error) {
    console.error('Error applying to gig:', error);
    res.status(500).json({ error: 'Failed to apply to gig' });
  }
};
