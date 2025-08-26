import { Types } from "mongoose";

/** Supported moods */
export const MOODS = [
  "stressed",
  "energized",
  "creative",
  "relaxed",
  "neutral",
] as const;
export type Mood = (typeof MOODS)[number];

// Sub-type for location objects
export interface IHobbyLocation {
  name: string;
  address: string;
  googleMaps: string;
  freeTrial: boolean;
}

// Main Hobby type
export interface IHobby {
  _id: Types.ObjectId;
  name: string;
  description: string;
  durationOptions: string[];
  locationOptions: string[];
  tags: string[];
  difficulty: string;
  youtubeLinks: string[];
  locations: IHobbyLocation[];
  equipment: string[];
  costEstimate: string;
  safetyNotes: string;
  createdAt?: Date;

  /** NEW: how this hobby tends to make users feel */
  moodEffects?: Mood[];
}
