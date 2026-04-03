export const UPSKILLING_MAP: Record<string, string[]> = {
  plumbing: ['PMKVY Plumbing level 1', 'Skill India Digital Plumbing course'],
  electrical: ['PMKVY Assistant Electrician', 'DDU-GKY Electrical Training'],
  carpentry: ['Skill India Digital Carpenter program', 'PMKVY Hand Tool Repair'],
  cooking: ['PMKVY Commis Chef', 'DDU-GKY F&B Services'],
  driving: ['PMKVY Commercial Driving', 'Skill India Driving Simulator Course'],
  cleaning: ['PMKVY Domestic Housekeeping', 'Skill India Digital Sanitation'],
  tailoring: ['PMKVY Sewing Machine Operator', 'DDU-GKY Tailoring basics'],
  masonry: ['PMKVY Mason General', 'Skill India Digital Construction'],
  painting: ['PMKVY Painter General', 'DDU-GKY Construction Painting'],
  gardening: ['PMKVY Gardener Training', 'Skill India Digital Horticulture'],
};

export const getRecommendations = (workerId: string, completedGigCategory: string): string[] => {
  const recommendations = UPSKILLING_MAP[completedGigCategory.toLowerCase()] || [];
  return recommendations.slice(0, 3);
};
