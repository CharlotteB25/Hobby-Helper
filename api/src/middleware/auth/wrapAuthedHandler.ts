import { Request, Response, NextFunction, RequestHandler } from "express";
import { AuthRequest } from "./authMiddleware";

export function wrapAuthedHandler(
  fn: (req: AuthRequest, res: Response, next: NextFunction) => any
): RequestHandler {
  return (req, res, next) => fn(req as AuthRequest, res, next);
}
