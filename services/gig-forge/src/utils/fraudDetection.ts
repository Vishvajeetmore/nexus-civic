import { createGeminiClient } from '@nexus-civic/gemini-client';

const geminiClient = createGeminiClient(process.env.GEMINI_API_KEY || 'mock-key');

export interface FraudScreeningResult {
  isSafe: boolean;
  fraudScore: number;
  flags: string[];
  recommendation: string;
}

export const screenListing = async (
  title: string,
  description: string,
  budget: number
): Promise<FraudScreeningResult> => {
  const flags: string[] = [];
  let isSafe = true;
  let fraudScore = 0;

  // Basic heuristical checks
  if (budget > 3000) {
    flags.push('Unrealistically high budget for daily informal gig');
    fraudScore += 40;
  }
  if (description.length < 20) {
    flags.push('Very short description');
    fraudScore += 20;
  }
  // Check for some form of contact info if desired, though usually handled by platform

  try {
    const textToClassify = `Title: ${title}\nDescription: ${description}\nBudget: ${budget}`;
    const result = await geminiClient.classifyText(textToClassify, ['safe', 'suspicious', 'fraudulent']);
    
    if (result.category === 'fraudulent') {
      flags.push(`AI Flag: ${result.reasoning}`);
      fraudScore += 50;
      isSafe = false;
    } else if (result.category === 'suspicious') {
      flags.push(`AI Flag: ${result.reasoning}`);
      fraudScore += 20;
    }
  } catch (err) {
    console.error('Error during AI fraud screening:', err);
  }

  if (fraudScore >= 50) {
    isSafe = false;
  }

  // Cap at 100
  fraudScore = Math.min(fraudScore, 100);

  return {
    isSafe,
    fraudScore,
    flags,
    recommendation: isSafe ? 'Approve' : 'Reject or require manual review',
  };
};
