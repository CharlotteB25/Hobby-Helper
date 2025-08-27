// src/middleware/error/errorHandlerMiddleware.ts
import { Request, Response, NextFunction } from "express";
import AppError from "./AppError";
import mongoose from "mongoose";

export const errorHandler = (
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  // Mongoose validation error
  if (err instanceof mongoose.Error.ValidationError) {
    return res.status(400).json({ message: err.message, errors: err.errors });
  }

  // Custom app errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }

  // Unknown errors
  res.status(err.statusCode || 500).json({
    message: err.message || "Internal server error",
    // stack: process.env.NODE_ENV === "production" ? undefined : err.stack,
  });
};
