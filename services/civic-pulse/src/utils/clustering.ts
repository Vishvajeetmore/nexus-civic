import { SocialPost } from '@nexus-civic/db';
import { CrisisRecord } from '../models/CrisisRecord.model';
import { createGeminiClient } from '@nexus-civic/gemini-client';
import { logger } from './logger';

const gemini = createGeminiClient(process.env.GEMINI_API_KEY || '');

export async function detectClusters() {
  try {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    const posts = await SocialPost.find({ createdAt: { $gte: twoHoursAgo } });

    const grouped: Record<string, typeof posts> = {};
    for (const post of posts) {
      if (post.category || post.categoryId) {
        const cat = post.category || post.categoryId;
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(post);
      }
    }

    for (const [category, catPosts] of Object.entries(grouped)) {
      if (catPosts.length >= 5) {
        const prompt = `Verify if this group of posts indicates a real crisis. Return JSON: {"isCrisis": true, "summary": "brief summary string"}\nCategory: ${category}\nPosts: ${catPosts.map(p => p.text).join(' | ')}`;
        const reportStr = await gemini.generateReport(prompt, {});
        
        let start = reportStr.indexOf('{');
        let end = reportStr.lastIndexOf('}');
        if (start >= 0 && end > start) {
          const parsed = JSON.parse(reportStr.slice(start, end + 1));
          if (parsed.isCrisis) {
             const record = new CrisisRecord({
               category,
               summary: parsed.summary || 'Crisis detected',
               postIds: catPosts.map((p: any) => p._id ? p._id.toString() : '')
             });
             await record.save();
             logger.info(`Crisis detected! category: ${category}, summary: ${parsed.summary}`);
          }
        }
      }
    }
  } catch (error) {
    logger.error('Error in detectClusters', { error });
  }
}
