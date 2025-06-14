import { Request, Response, NextFunction } from "express";
import UserHobbyModel from "./UserHobby.model";
import { ZodSchema } from "zod";
// Create new user hobby history entry
export const createUserHobby = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    console.log("📥 Incoming data:", req.body); // <--- add this
    console.log("📥 Received new hobby rating:", req.body);

    const { user, hobby, performedAt, rating, notes } = req.body;

    const userHobby = await UserHobbyModel.create({
      user,
      hobby,
      performedAt,
      rating,
      notes,
    });

    res.status(201).json(userHobby);
  } catch (err) {
    console.error("Failed to create user hobby:", err);
    next(err);
  }
};

// Get all user hobby history for specific user
export const getUserHobbies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const userId = req.params.userId;

    const userHobbies = await UserHobbyModel.find({ user: userId }).populate(
      "hobby"
    );

    res.json(userHobbies);
  } catch (err) {
    console.error("Failed to fetch user hobbies:", err);
    next(err);
  }
};

export const zodValidator =
  (schema: ZodSchema<any>) =>
  (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);

    if (!result.success) {
      console.error("❌ Zod validation failed:", result.error.flatten());
      return res.status(400).json({ error: result.error.flatten() });
    }

    req.body = result.data;
    next();
  };
