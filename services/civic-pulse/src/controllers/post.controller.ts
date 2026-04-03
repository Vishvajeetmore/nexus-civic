import { Request, Response } from 'express';
import { SocialPost } from '@nexus-civic/db';
import { scoreSentiment } from '../utils/sentiment';
import { successResponse, errorResponse, paginatedResponse } from '../utils/response';

export const createPost = async (req: Request, res: Response) => {
  const { text, location, category } = req.body;
  const authorId = req.user?.id || 'anonymous';

  const { sentiment, urgencyScore, sentimentScore } = await scoreSentiment(text);

  const post = await SocialPost.create({
    text,
    authorId,
    location,
    category,
    sentimentScore,
    urgencyScore,
    voteCount: 0
  });

  return res.status(201).json(successResponse(post, 'Post created successfully'));
};

export const getFeed = async (req: Request, res: Response) => {
  const limit = parseInt(req.query.limit as string) || 20;
  const page = parseInt(req.query.page as string) || 1;
  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    SocialPost.find()
      .sort({ urgencyScore: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit),
    SocialPost.countDocuments()
  ]);

  return res.json(paginatedResponse(posts, {
    page, limit, total, pages: Math.ceil(total / limit)
  }, 'Feed retrieved'));
};

export const getPost = async (req: Request, res: Response) => {
  const post = await SocialPost.findById(req.params.id);
  if (!post) return res.status(404).json(errorResponse('Post not found', 404));
  return res.json(successResponse(post, 'Post retrieved'));
};

export const votePost = async (req: Request, res: Response) => {
  const { direction } = req.body; // 'up' or 'down'

  const update = direction === 'down' ? { $inc: { voteCount: -1 } } : { $inc: { voteCount: 1 } };
  const post = await SocialPost.findByIdAndUpdate(req.params.id, update, { new: true });
  
  if (!post) return res.status(404).json(errorResponse('Post not found', 404));
  return res.json(successResponse(post, 'Vote recorded'));
};
