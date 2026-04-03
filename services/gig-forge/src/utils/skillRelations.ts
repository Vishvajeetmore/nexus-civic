export const SKILL_RELATIONS: Record<string, string[]> = {
  plumbing: ['pipefitting', 'water-heater-repair', 'drain-cleaning'],
  electrical: ['wiring', 'circuit-breaker-repair', 'appliance-installation'],
  carpentry: ['furniture-assembly', 'woodworking', 'cabinet-making'],
  cooking: ['catering', 'baking', 'meal-prep'],
  driving: ['delivery', 'chauffeur', 'logistics'],
  cleaning: ['deep-cleaning', 'sanitization', 'waste-management'],
  tailoring: ['alterations', 'sewing', 'pattern-making'],
  masonry: ['bricklaying', 'concrete-pouring', 'stone-cutting'],
  painting: ['wall-painting', 'priming', 'surface-preparation'],
  gardening: ['landscaping', 'pruning', 'lawn-mowing'],
};

export const getAdjacentSkills = (skills: string[]): string[] => {
  const expanded = new Set<string>(skills.map(s => s.toLowerCase()));
  for (const skill of skills) {
    const adjacent = SKILL_RELATIONS[skill.toLowerCase()] || [];
    for (const adj of adjacent) {
      expanded.add(adj);
    }
  }
  return Array.from(expanded);
};
