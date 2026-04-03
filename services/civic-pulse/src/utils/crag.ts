import axios from 'axios';
import { createGeminiClient } from '@nexus-civic/gemini-client';
import { callService } from './serviceClient';

const gemini = createGeminiClient(process.env.GEMINI_API_KEY || '');

export async function factCheckPost(postText: string, postId: string) {
  const fallback = { verdict: 'UNVERIFIABLE', explanation: 'Fact check unavailable', sources: [], confidence: 0 };
  try {
    let news: any[] = [];
    if (process.env.NEWS_API_KEY) {
      const keywords = postText.split(' ').slice(0, 5).join(' ');
      try {
        const res = await axios.get(`https://newsapi.org/v2/everything?q=${encodeURIComponent(keywords)}&apiKey=${process.env.NEWS_API_KEY}`);
        news = res.data.articles || [];
      } catch(e) {}
    }

    let publicSafetyReports: any = [];
    try {
      const grievances: any = await callService('http://localhost:3002', 'GET', '/api/grievances');
      publicSafetyReports = grievances?.data || grievances || [];
    } catch(e) {}

    const prompt = `Fact check the following post and return a JSON. Include verdict (TRUE, FALSE, MISLEADING, UNVERIFIABLE), explanation, sources (array of strings), confidence (number), and correctionNote (string). Post: ${postText}`;
    const contextData = { news: news.slice(0,3), publicSafetyReports: publicSafetyReports.slice(0, 3) };
    
    const reportStr = await gemini.generateReport(prompt, contextData);
    
    let start = reportStr.indexOf('{');
    let end = reportStr.lastIndexOf('}');
    if (start >= 0 && end > start) {
      const parsed = JSON.parse(reportStr.slice(start, end + 1));
      return { 
         verdict: ['TRUE', 'FALSE', 'MISLEADING', 'UNVERIFIABLE'].includes(parsed.verdict) ? parsed.verdict : 'UNVERIFIABLE', 
         explanation: parsed.explanation || 'Fact check unavailable', 
         sources: parsed.sources || [], 
         confidence: parsed.confidence || 0,
         correctionNote: parsed.correctionNote
      };
    }
    return fallback;
  } catch (error) {
    return fallback;
  }
}
