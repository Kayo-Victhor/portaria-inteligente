import { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validateRequest(schemas: ValidationSchemas) {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      if (schemas.body) {
        req.body = await schemas.body.parseAsync(req.body);
      }
      if (schemas.params) {
        req.params = (await schemas.params.parseAsync(req.params)) as any;
      }
      if (schemas.query) {
        req.query = (await schemas.query.parseAsync(req.query)) as any;
      }
      next();
    } catch (error) {
      next(error);
    }
  };
}
