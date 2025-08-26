import { z } from "zod";

export const moodEnum = z.enum([
  "stressed",
  "energized",
  "creative",
  "relaxed",
  "neutral",
]);

export const createCustomHobbySchema = z.object({
  name: z.string().min(2),
  description: z.string().min(10),

  // keep these optional — we’ll provide sensible defaults in the controller
  durationOptions: z.array(z.string()).optional(),
  locationOptions: z.array(z.string()).optional(),

  tags: z.array(z.string()).min(1),

  // allow simple creation; if omitted, we’ll default to Beginner
  difficultyLevels: z
    .array(
      z.object({
        level: z.string().min(3),
        youtubeLinks: z.array(z.string().url()).optional().default([]),
      })
    )
    .optional(),

  locations: z
    .array(
      z.object({
        name: z.string().min(1),
        address: z.string().optional().default(""),
        lat: z.number().nullable().optional(),
        lng: z.number().nullable().optional(),
        trialAvailable: z.boolean().optional().default(false),
      })
    )
    .optional(),

  equipment: z.array(z.string()).optional(),
  costEstimate: z.string().optional().default(""),
  safetyNotes: z.string().optional().default(""),
  wheelchairAccessible: z.boolean().optional().default(false),
  ecoFriendly: z.boolean().optional().default(false),

  moodEffects: z.array(moodEnum).optional(),
});
