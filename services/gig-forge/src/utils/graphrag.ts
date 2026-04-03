import { WorkerProfile, GigListing } from '@nexus-civic/db';
import { getAdjacentSkills } from './skillRelations';
import { createGeminiClient } from '@nexus-civic/gemini-client';

const geminiClient = createGeminiClient(process.env.GEMINI_API_KEY || 'mock-key');

function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; 
}

export const matchWorkerToGigs = async (workerId: string) => {
  const worker = await WorkerProfile.findById(workerId);
  if (!worker) {
    throw new Error('Worker profile not found');
  }

  const directSkills = worker.skills || [];
  const expandedSkills = getAdjacentSkills(directSkills);
  
  const directSkillsSet = new Set(directSkills.map(s => s.toLowerCase()));
  const expandedSkillsSet = new Set(expandedSkills.map(s => s.toLowerCase()));

  // Active listings
  const listings = await GigListing.find({ status: 'ACTIVE' });
  
  const scoredListings = [];
  
  for (const listing of listings) {
    const requiredSkills = listing.requiredSkills || [];
    let exactMatches = 0;
    let adjacentMatches = 0;
    
    for (const req of requiredSkills) {
      if (directSkillsSet.has(req.toLowerCase())) {
        exactMatches++;
      } else if (expandedSkillsSet.has(req.toLowerCase())) {
        adjacentMatches++;
      }
    }
    
    if (exactMatches > 0 || adjacentMatches > 0) {
      const distanceKm = getDistanceFromLatLonInKm(
        worker.location.lat,
        worker.location.lng,
        listing.location.lat,
        listing.location.lng
      );
      
      const score = (exactMatches * 10) + (adjacentMatches * 5) - (distanceKm * 0.5);
      
      scoredListings.push({
        listing,
        score,
        exactMatches,
        adjacentMatches,
        distanceKm
      });
    }
  }

  // Sort and take top 10
  scoredListings.sort((a, b) => b.score - a.score);
  const top10 = scoredListings.slice(0, 10);
  
  // Call gemini for fit explanation
  const finalMatches = await Promise.all(top10.map(async (match) => {
    try {
      const prompt = `Explain why the worker with skills [${worker.skills.join(', ')}] is a good fit for the gig titled "${match.listing.title}" requiring [${match.listing.requiredSkills.join(', ')}].`;
      const contextData = { score: match.score, exactMatches: match.exactMatches, adjacentMatches: match.adjacentMatches };
      const explanation = await geminiClient.generateReport(prompt, contextData);
      
      return {
        ...match,
        fitExplanation: explanation
      };
    } catch (err) {
      console.error('Failed to generate fit explanation:', err);
      return {
        ...match,
        fitExplanation: 'A good fit based on requested skills.'
      };
    }
  }));

  return finalMatches;
};
