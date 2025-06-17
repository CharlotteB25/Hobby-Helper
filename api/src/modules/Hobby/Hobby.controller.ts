import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth/authMiddleware";
import { generateRecommendations } from "../../services/recommendationEngine";
import Hobby from "./Hobby.model"; // still needed for getAllHobbies

import jwt from "jsonwebtoken";
import User from "../User/User.model";

export const getSuggestedHobbies = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    let user = null;

    // 🧠 Try to extract token if it exists
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];

      try {
        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET || "default_secret"
        );
        if (typeof decoded === "object" && "_id" in decoded) {
          user = await User.findById(decoded._id);
        }
      } catch (err) {
        console.warn(
          "⚠️ Invalid or expired token in /suggestions — treating as guest"
        );
      }
    }

    const hobbies = await generateRecommendations(user, req.query);
    return res.json(hobbies);
  } catch (err: any) {
    console.error("❌ Error in getSuggestedHobbies:", err.message || err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// ✅ Keep getAllHobbies exactly as it is
export const getAllHobbies = async (req: Request, res: Response) => {
  try {
    const { name } = req.query;

    if (name && typeof name === "string") {
      // Escape the input for safe regex
      const escaped = name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
      const regex = new RegExp(`^${escaped}$`, "i"); // case-insensitive exact match

      console.log("🔍 Searching hobby with regex:", regex);

      const hobby = await Hobby.find({ name: { $regex: regex } });

      if (!hobby.length) {
        console.warn(`⚠️ No hobby found for name: "${name}"`);
        return res.status(404).json({ message: "Hobby not found" });
      }

      return res.json(hobby);
    }

    // Default: return all hobbies
    const hobbies = await Hobby.find();
    return res.json(hobbies);
  } catch (err) {
    console.error("❌ Error fetching hobbies:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};
export const getHobbyById = async (req: Request, res: Response) => {
  try {
    const hobby = await Hobby.findById(req.params.id);
    if (!hobby) {
      return res.status(404).json({ message: "Hobby not found" });
    }
    res.json(hobby);
  } catch (err) {
    console.error("❌ Error fetching hobby by ID:", err);
    res.status(500).json({ message: "Internal Server Error" });
    console.log("🔍 Looking up hobby ID:", req.params.id);
  }
};
