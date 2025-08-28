// src/services/userService.ts
import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken, clearToken } from "./tokenManager";

/** Domain types you can reuse anywhere */
export type Mood =
  | "chill"
  | "creative"
  | "energetic"
  | "social"
  | "curious"
  | "focused";
export type LocationType = "Indoor" | "Outdoor";

/** History item saved on the user */
export type HobbyHistoryItem = {
  id: string | number;
  hobbyId?: string;
  name: string;
  date: string; // ISO string
  rating?: number;
  notes?: string;
  mood?: Mood;
  location?: LocationType;
  tags?: string[];
};

export interface Preferences {
  wheelchairAccessible: boolean;
  ecoFriendly: boolean;
  trialAvailable: boolean;
}

export interface UserProfile {
  _id: string;
  name: string;
  email: string;
  favouriteTags: string[];
  preferences: Preferences;
  hobbyHistory?: HobbyHistoryItem[];
}

/**
 * Data accepted by the update endpoint.
 * Using Partial<UserProfile> keeps service & screens in sync.
 */
export type UpdateUserData = Partial<UserProfile> & {
  password?: string;
};

/** ---------- AUTH ---------- */

/** Login call (expects server to return { token, ... }) */
export const loginUser = async (
  email: string,
  password: string
): Promise<{ token: string }> => {
  const res = await api.post("/login", { email, password });
  return res.data;
};

/** Fetch current user after login */
export const getCurrentUser = async (): Promise<UserProfile> => {
  // If your axios instance already sets the Authorization header via tokenManager,
  // this explicit header is harmless but not required. Keeping for safety.
  const token = await getToken();
  const res = await api.get("/users/profile", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  return res.data as UserProfile;
};

/** Update user profile (supports preferences & hobbyHistory) */
export const updateUser = async (
  updatedData: UpdateUserData
): Promise<UserProfile> => {
  const res = await api.patch("/users/profile", updatedData);
  return res.data as UserProfile;
};

/** ---------- HISTORY HELPERS (optional, keep if you use these routes) ---------- */

/** Save a performed hobby (legacy helper — keep if your API supports it) */
export const saveHobbyHistory = async (historyData: {
  hobbyId: string;
  performedAt: Date;
  rating: number;
  notes?: string;
}) => {
  const res = await api.post("/users/history", historyData);
  return res.data;
};

/** Alternate route for recording a user-hobby performance */
export const saveUserHobby = async (data: {
  user: string;
  hobby: string;
  performedAt: string; // ISO date string (primitive string is correct)
  rating: number;
  notes?: string;
}) => {
  const res = await api.post("/user-hobbies", data);
  return res.data;
};

/** ---------- LOGOUT ---------- */

export const logoutUser = async () => {
  await AsyncStorage.removeItem("authToken");
  await AsyncStorage.removeItem("userData");
  await clearToken?.(); // clears persisted token + axios header (per your tokenManager)

  // Debug: ensure it's gone
  const storedToken = await AsyncStorage.getItem("authToken");
  console.log("Stored token after logout:", storedToken); // should be null
};
