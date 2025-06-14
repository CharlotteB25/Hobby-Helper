import { z } from "zod";

export const difficultyLevelSchema = z.object({
  level: z.string(),
  youtubeLinks: z.array(z.string()),
});

export const locationSchema = z.object({
  name: z.string(),
  address: z.string(),
  lat: z.number(),
  lng: z.number(),
  trialAvailable: z.boolean(),
});

export const hobbySchema = z.object({
  name: z.string(),
  description: z.string(),
  durationOptions: z.array(z.string()),
  locationOptions: z.array(z.string()),
  tags: z.array(z.string()),
  difficultyLevels: z.array(difficultyLevelSchema),
  locations: z.array(locationSchema),
  equipment: z.array(z.string()),
  costEstimate: z.string(),
  safetyNotes: z.string(),
  wheelchairAccessible: z.boolean(),
  ecoFriendly: z.boolean(),
  createdAt: z.date().optional(), // optional since sometimes not included at insertion
});

export const hobbiesArraySchema = z.array(hobbySchema);
