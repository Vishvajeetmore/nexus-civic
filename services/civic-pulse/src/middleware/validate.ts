import type { NextFunction, Request, Response } from 'express';
import type { ZodSchema } from 'zod';

/**
 * Validate req.body with a Zod schema.
 * Usage: router.post('/', validate(createSchema), handler)
 */
export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      const details = parsed.error.issues.map((issue) => ({
        field: issue.path.join('.') || 'body',
        message: issue.message,
      }));

      res.status(400).json({
        success: false,
        error: 'Validation failed',
        code: 400,
        details,
      });
      return;
    }

    req.body = parsed.data;
    next();
  };
}
