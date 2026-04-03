import { Request, Response } from 'express';
import { SocialPost } from '@nexus-civic/db';
import { factCheckPost } from '../utils/crag';
import { successResponse, errorResponse } from '../utils/response';

export const triggerFactCheck = async (req: Request, res: Response) => {
  const { postId } = req.params;
  const post = await SocialPost.findById(postId);
  if (!post) return res.status(404).json(errorResponse('Post not found', 404));

  const factCheck = await factCheckPost(post.text, post._id.toString());
  
  post.factCheck = {
    ...factCheck,
    checkedAt: new Date()
  };
  await post.save();

  return res.json(successResponse(post.factCheck, 'Fact check completed'));
};

export const getFlagged = async (req: Request, res: Response) => {
  const posts = await SocialPost.find({
    'factCheck.verdict': { $in: ['FALSE', 'MISLEADING'] }
  }).sort({ createdAt: -1 });

  return res.json(successResponse(posts, 'Flagged posts retrieved'));
};
