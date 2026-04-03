import { createGeminiClient } from '@nexus-civic/gemini-client';

const gemini = createGeminiClient(process.env.GEMINI_API_KEY || '');

export async function scoreSentiment(text: string) {
  try {
    const sentiments = ['positive', 'neutral', 'negative', 'urgent'];
    const result = await gemini.classifyText(text, sentiments);
    const sentiment = result.category;

    let urgencyScore = sentiment === 'urgent' ? 80 : 0;
    const keywords = ['flood', 'fire', 'accident', 'collapse', 'outbreak'];
    
    let keywordMatches = 0;
    const lowerText = text.toLowerCase();
    for (const kw of keywords) {
      if (lowerText.includes(kw)) {
        keywordMatches++;
      }
    }
    urgencyScore += Math.min(keywordMatches * 20, 20); // max +20 for keywords

    let sentimentScore = 0;
    if (sentiment === 'positive') sentimentScore = 1;
    if (sentiment === 'negative') sentimentScore = -1;
    if (sentiment === 'urgent') sentimentScore = -2;

    return { sentiment, urgencyScore, sentimentScore };
  } catch (error) {
    return { sentiment: 'neutral', urgencyScore: 0, sentimentScore: 0 };
  }
}
