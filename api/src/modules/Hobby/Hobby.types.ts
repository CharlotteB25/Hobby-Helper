import { Types } from "mongoose";

// Sub-type for location objects
export interface IHobbyLocation {
  name: string;
  address: string;
  googleMaps: string;
  freeTrial: boolean;
}

// Main Hobby type
export interface IHobby {
  _id: Types.ObjectId; // MongoDB ObjectId type
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
  createdAt?: Date; // optional since it's auto-generated
}
