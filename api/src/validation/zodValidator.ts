import { Request, Response, NextFunction } from "express";
import { ZodSchema } from "zod";

// Universal Zod validator middleware
export const zodValidator =
  (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err: any) {
      return res.status(400).json({
        message: "Validation failed",
        errors: err.errors,
      });
    }
  };
