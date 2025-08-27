import { Request, Response, NextFunction } from "express";
import { AuthRequest } from "../../middleware/auth/authMiddleware";
import { generateRecommendations } from "../../services/recommendationEngine";
import Hobby from "./Hobby.model"; // still needed for getAllHobbies

import jwt from "jsonwebtoken";
import User from "../User/User.model";

// ---- helpers (add to Hobby.controller.ts) ----
const toStringArray = (val: unknown): string[] =>
  Array.isArray(val) ? val.map((v) => String(v)) : [];

const dedupeTrim = (arr: string[]): string[] => [
  ...new Set(arr.map((t) => t.trim()).filter(Boolean)),
];

// if you want to guard moods to allowed values:
const ALLOWED_MOODS = new Set([
  "stressed",
  "energized",
  "creative",
  "relaxed",
  "neutral",
]);
const sanitizeMoods = (val: unknown): string[] =>
  dedupeTrim(toStringArray(val)).filter((m) => ALLOWED_MOODS.has(m));

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

/** NEW: /hobbies/search?mood=relaxed&tags=Creative,Wellness&q=paint */
export const searchHobbies = async (req: Request, res: Response) => {
  try {
    const { mood, tags, q } = req.query as {
      mood?: string;
      tags?: string;
      q?: string;
    };
    const and: any[] = [];

    if (mood) and.push({ moodEffects: mood });
    if (tags) and.push({ tags: { $in: tags.split(",").map((t) => t.trim()) } });
    if (q) and.push({ $text: { $search: q } });

    const filter = and.length ? { $and: and } : {};
    const results = await Hobby.find(filter).limit(50);

    return res.json(results);
  } catch (err) {
    console.error("❌ Error in searchHobbies:", err);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

// small tag->mood helper (same mapping you used in seeder)
const inferMoodEffects = (tags: string[] = []): string[] => {
  const t = tags.map((x) => x.toLowerCase());
  const moods = new Set<string>();
  if (
    t.some((x) =>
      [
        "relaxation",
        "mindfulness",
        "wellness",
        "sustainability",
        "eco-friendly",
        "eco",
        "calm",
      ].includes(x)
    )
  )
    moods.add("relaxed");
  if (
    t.some((x) =>
      ["creative", "expression", "hands-on", "craft", "art", "diy"].includes(x)
    )
  )
    moods.add("creative");
  if (
    t.some((x) =>
      [
        "fitness",
        "adventure",
        "strength",
        "skill-building",
        "sport",
        "training",
      ].includes(x)
    )
  )
    moods.add("energized");
  if (moods.size === 0) moods.add("neutral");
  return Array.from(moods);
};

/** POST /hobbies — create a custom hobby (auth required) */
export const createCustomHobby = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });
  if (!req.body || typeof req.body !== "object") {
    return res.status(400).json({ message: "Invalid or missing JSON body" });
  }
  const body = req.body;

  // sensible defaults to satisfy required schema fields
  const durationOptions = body.durationOptions?.length
    ? body.durationOptions
    : ["Flexible"];
  const locationOptions = body.locationOptions?.length
    ? body.locationOptions
    : ["Indoor"];

  const difficultyLevels = body.difficultyLevels?.length
    ? body.difficultyLevels
    : [{ level: "Beginner", youtubeLinks: [] }];

  const locations = body.locations?.length
    ? body.locations
    : [
        {
          name: "User Provided",
          address: "",
          lat: null,
          lng: null,
          trialAvailable: false,
        },
      ];

  const equipment = body.equipment?.length ? body.equipment : [];
  const costEstimate = body.costEstimate ?? "";
  const safetyNotes = body.safetyNotes ?? "";
  const wheelchairAccessible = body.wheelchairAccessible ?? false;
  const ecoFriendly = body.ecoFriendly ?? false;

  const rawTags = toStringArray(body.tags);
  const tags = dedupeTrim(rawTags);

  const moodEffects =
    Array.isArray(body.moodEffects) && body.moodEffects.length
      ? sanitizeMoods(body.moodEffects) // keep only allowed moods
      : inferMoodEffects(tags);

  const hobby = await Hobby.create({
    name: body.name,
    description: body.description,
    durationOptions,
    locationOptions,
    tags,
    difficultyLevels,
    locations,
    equipment,
    costEstimate,
    safetyNotes,
    wheelchairAccessible,
    ecoFriendly,

    // custom meta
    isCustom: true,
    createdBy: req.user._id,
    status: "published", // or "pending" if you want manual approval
    moodEffects,
  });

  return res.status(201).json(hobby);
};

/** PATCH /hobbies/:id — update (owner-only for custom) */
export const updateCustomHobby = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });

  const { id } = req.params;
  const hobby = await Hobby.findById(id);
  if (!hobby) return res.status(404).json({ message: "Hobby not found" });

  // only owner of custom hobbies can edit
  if (!hobby.isCustom || String(hobby.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const updates = { ...req.body };

  // keep tags unique + trimmed if provided
  if (updates.tags) {
    const safe = dedupeTrim(toStringArray(updates.tags));
    updates.tags = safe;
  }

  // infer moods if user cleared them or didn't provide
  if (!updates.moodEffects && updates.tags) {
    updates.moodEffects = inferMoodEffects(updates.tags as string[]);
  } else if (updates.moodEffects) {
    updates.moodEffects = sanitizeMoods(updates.moodEffects);
  }

  Object.assign(hobby, updates);
  await hobby.save();
  return res.json(hobby);
};

/** DELETE /hobbies/:id — delete (owner-only for custom) */
export const deleteCustomHobby = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });

  const { id } = req.params;
  const hobby = await Hobby.findById(id);
  if (!hobby) return res.status(404).json({ message: "Hobby not found" });

  if (!hobby.isCustom || String(hobby.createdBy) !== String(req.user._id)) {
    return res.status(403).json({ message: "Forbidden" });
  }

  await hobby.deleteOne();
  return res.status(204).send();
};

/** GET /hobbies/mine — list my custom hobbies */
export const getMyCustomHobbies = async (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ message: "Not authenticated" });

  const docs = await Hobby.find({
    createdBy: req.user._id,
    isCustom: true,
  }).sort({ createdAt: -1 });
  return res.json(docs);
};
