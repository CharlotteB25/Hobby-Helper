// src/middleware/auth/wrapAuthedHandler.ts
import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthRequest } from "./authMiddleware";

export const wrapAuthedHandler = (
  fn: (req: AuthRequest, res: Response, next: NextFunction) => any
): RequestHandler => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const out = fn(req as AuthRequest, res, next);
      if (out && typeof (out as any).then === "function") {
        (out as Promise<any>).catch(next); // <- catch async rejections
      }
    } catch (err) {
      next(err); // <- catch sync throws
    }
  };
};
