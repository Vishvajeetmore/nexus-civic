import { callService } from './serviceClient';
import { createGeminiClient } from '@nexus-civic/gemini-client';
import { logger } from './logger';
import axios from 'axios';

const gemini = createGeminiClient(process.env.GEMINI_API_KEY || '');

export async function generateDailyBriefing() {
  try {
    // using axios directly for timeout control to microservices
    const guardianReq = axios.get('http://localhost:3001/api/sos', { timeout: 3000 }).catch(() => null);
    const pulseReq = axios.get('http://localhost:3002/api/grievances', { timeout: 3000 }).catch(() => null);
    const terraReq = axios.get('http://localhost:3006/api/alerts', { timeout: 3000 }).catch(() => null);

    const [guardianRes, pulseRes, terraRes] = await Promise.all([guardianReq, pulseReq, terraReq]);

    const data = {
      guardianNet: guardianRes ? guardianRes.data : null,
      pulseReport: pulseRes ? pulseRes.data : null,
      terraScan: terraRes ? terraRes.data : null,
    };

    const prompt = `Generate a daily executive briefing based on the civic safety module data provided. Format it nicely in markdown. Summarize key incidents, grievances, and environmental alerts into actionable points. Do not wrap with json, use markdown text.`;
    
    let markdown = await gemini.generateReport(prompt, data);

    return { markdown, generatedAt: new Date() };
  } catch(error) {
     logger.error('Error in generateDailyBriefing', { error });
     return { markdown: 'Error generating briefing', generatedAt: new Date() };
  }
}
