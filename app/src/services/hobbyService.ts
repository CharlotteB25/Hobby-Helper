import api from "./api";

/**
 * Get suggested hobbies with safe query cleaning.
 * - Removes undefined/null/""/false so we don't accidentally over-filter
 * - Adds a cache-busting `_ts` param so repeat queries don't stick
 */
export const getSuggestedHobbies = async (filters: Record<string, any>) => {
  const cleaned = Object.fromEntries(
    Object.entries(filters).filter(
      ([_, v]) => v !== undefined && v !== null && v !== "" && v !== false
    )
  );

  const res = await api.get("/hobbies/suggestions", {
    params: { ...cleaned, _ts: Date.now() },
  });

  return res.data;
};

export const getHobbyById = async (id: string) => {
  const res = await api.get(`/hobbies/${id}`);
  return res.data;
};
/** 🔎 Search by name (server should support ?q=) */
export const searchHobbiesByName = async (q: string) => {
  const res = await api.get("/hobbies/search", { params: { q } });
  // Fallback if your backend uses a different route:
  // const res = await api.get("/hobbies", { params: { q } });
  return res.data;
};

/** ➕ Create a new hobby */
export type CreateHobbyPayload = {
  name: string;
  description: string;
  tags: string[];
  locationOptions: ("Indoor" | "Outdoor")[];
  durationOptions?: string[];
  costEstimate?: string;
  wheelchairAccessible?: boolean;
  ecoFriendly?: boolean;
  trialAvailable?: boolean;
};

export const createHobby = async (payload: CreateHobbyPayload) => {
  const res = await api.post("/hobbies", payload);
  return res.data; // expecting the created hobby object
};
