import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

type JwtPayload = {
  id: string;
  role: string;
};

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: string;
      };
    }
  }
}

/**
 * Parse and verify a Bearer token from the Authorization header.
 * Returns null when token is missing/invalid and throws only for server misconfiguration.
 */
function extractUserFromAuthHeader(req: Request): JwtPayload | null {
  const authHeader = req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET is not configured');
  }

  const decoded = jwt.verify(token, jwtSecret);
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    typeof decoded.id !== 'string' ||
    typeof decoded.role !== 'string'
  ) {
    return null;
  }

  return {
    id: decoded.id,
    role: decoded.role,
  };
}

/**
 * Require a valid JWT Bearer token.
 * Usage: app.get('/protected', authenticate, handler)
 */
export function authenticate(req: Request, res: Response, next: NextFunction): void {
  try {
    const user = extractUserFromAuthHeader(req);
    if (!user) {
      res.status(401).json({ success: false, error: 'Unauthorized', code: 401 });
      return;
    }

    req.user = user;
    next();
  } catch {
    res.status(401).json({ success: false, error: 'Invalid token', code: 401 });
  }
}

/**
 * Optionally attach req.user when a valid JWT is provided.
 * Usage: app.get('/feed', optionalAuth, handler)
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  try {
    const user = extractUserFromAuthHeader(req);
    if (user) {
      req.user = user;
    }
  } catch {
    // Intentionally ignore auth failures for optional auth routes.
  }

  next();
}
