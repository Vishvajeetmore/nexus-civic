import type { NextFunction, Request, Response } from 'express';

/**
 * Wraps async route handlers so errors go to next() automatically.
 * Usage: router.get('/', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler =
  <TReq extends Request = Request, TRes extends Response = Response>(
    fn: (req: TReq, res: TRes, next: NextFunction) => Promise<unknown>
  ) =>
  (req: TReq, res: TRes, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
