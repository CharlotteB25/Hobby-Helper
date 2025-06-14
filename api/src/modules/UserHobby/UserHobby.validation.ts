import { z } from "zod";

export const createUserHobbySchema = z.object({
  user: z.string(),
  hobby: z.string(),
  notes: z.string().optional(),
  performedAt: z.preprocess((val) => {
    const date = new Date(val as string);
    return isNaN(date.getTime()) ? undefined : date;
  }, z.date()),
  rating: z.number().min(1).max(5).optional(), // ✅ NEW FIELD
});
