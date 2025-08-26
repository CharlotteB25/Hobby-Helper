import mongoose, { Document, Schema } from "mongoose";
import { MOODS, Mood } from "./Hobby.types";

// Sub-schema for difficulty levels
interface IDifficultyLevel {
  level: string;
  youtubeLinks: string[];
}

// Sub-schema for locations
interface ILocation {
  name: string;
  address: string;
  lat: number | null;
  lng: number | null;
  trialAvailable: boolean;
}

// Main hobby interface
export interface IHobby extends Document {
  name: string;
  description: string;
  durationOptions: string[];
  locationOptions: string[];
  tags: string[];
  difficultyLevels: IDifficultyLevel[];
  locations: ILocation[];
  equipment: string[];
  costEstimate: string;
  safetyNotes: string;
  wheelchairAccessible: boolean;
  ecoFriendly: boolean;
  createdAt: Date;
  // ✅ NEW
  moodEffects?: Mood[];
  isCustom?: boolean;
  createdBy?: mongoose.Types.ObjectId | null;
  status?: "published" | "pending" | "rejected";
}
// Define DifficultyLevelSchema
const DifficultyLevelSchema: Schema = new Schema<IDifficultyLevel>(
  {
    level: { type: String, required: true },
    youtubeLinks: [{ type: String, required: false }],
  },
  { _id: false }
);

// Define LocationSchema
const LocationSchema: Schema = new Schema<ILocation>(
  {
    name: { type: String, required: true },
    address: { type: String, required: false },
    lat: { type: Schema.Types.Mixed, required: false },
    lng: { type: Schema.Types.Mixed, required: false },
    trialAvailable: { type: Boolean, required: true },
  },
  { _id: false }
);

// Define HobbySchema
const HobbySchema: Schema = new Schema<IHobby>({
  name: { type: String, required: true, index: true },
  description: { type: String, required: true },
  durationOptions: [{ type: String, required: true }],
  locationOptions: [{ type: String, required: true }],
  tags: [{ type: String, required: true, index: true }],
  difficultyLevels: { type: [DifficultyLevelSchema], required: true },
  locations: { type: [LocationSchema], required: true },
  equipment: [{ type: String, required: true }],
  costEstimate: { type: String, required: true },
  safetyNotes: { type: String, required: false },
  wheelchairAccessible: { type: Boolean, required: true },
  ecoFriendly: { type: Boolean, required: true },
  createdAt: { type: Date, default: Date.now },

  // ✅ NEW
  moodEffects: [{ type: String, enum: MOODS, index: true }],
  isCustom: { type: Boolean, default: false, index: true },
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: "User",
    default: null,
    index: true,
  },
  status: {
    type: String,
    enum: ["published", "pending", "rejected"],
    default: "published",
    index: true,
  },
});

// helpful search
HobbySchema.index({ name: "text", description: "text", tags: "text" });
// creator/status filters
HobbySchema.index({ createdBy: 1, isCustom: 1, status: 1 });

export default mongoose.model<IHobby>("Hobby", HobbySchema);
