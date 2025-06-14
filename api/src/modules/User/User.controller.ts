import { Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import User from "./User.model";
import UserHobbyModel from "../UserHobby/UserHobby.model";
import { AuthRequest } from "../../middleware/auth/authMiddleware";
import { notStrictEqual } from "assert";

// 🔐 Login
const login = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const token = req.user.generateToken();
    return res.json({ token });
  } catch (err) {
    return next(err);
  }
};

// 👤 Register
const register = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { name, email, password, favouriteTags } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: "Name, email, and password are required." });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      favouriteTags,
      preferences: {},
    });

    await newUser.save();
    const token = newUser.generateToken();

    return res.status(201).json({ token });
  } catch (error) {
    console.error("❌ Registration error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 👤 Get Current User + Hobby History
const getCurrentUser = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const historyRaw = await UserHobbyModel.find({ user: req.user._id })
      .populate("hobby")
      .sort({ performedAt: -1 });

    const hobbyHistory = historyRaw.map((entry) => {
      const hobby = entry.hobby as { name?: string };
      return {
        id: entry._id,
        name: hobby?.name || "Unknown Hobby",
        date: entry.performedAt,
        duration: "N/A",
        rating: entry.rating || 0,
        notes: entry.notes || "",
      };
    });

    return res.json({
      ...user.toObject(),
      hobbyHistory,
    });
  } catch (err) {
    console.error("❌ Failed to fetch current user:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// 🔁 Update User
const updateUser = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const { name, email, favouriteTags, password, preferences } = req.body;
    const updateData: Record<string, any> = {};

    if (name) updateData.name = name;
    if (email) updateData.email = email;
    if (favouriteTags) updateData.favouriteTags = favouriteTags;

    if (preferences) {
      updateData.preferences = {
        wheelchairAccessible: preferences.wheelchairAccessible ?? false,
        ecoFriendly: preferences.ecoFriendly ?? false,
        trialAvailable: preferences.trialAvailable ?? false,
      };
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.json(updatedUser);
  } catch (err) {
    console.error("❌ Error updating user:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export { login, register, getCurrentUser, updateUser };
