import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken, clearToken } from "./tokenManager";

// ✅ Types (optional, cleaner code!)
export interface Preferences {
  wheelchairAccessible: boolean;
  ecoFriendly: boolean;
  trialAvailable: boolean;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  favouriteTags?: string[];
  password?: string;
  preferences?: Preferences;
}

// ✅ Login call (returns token)
export const loginUser = async (email: string, password: string) => {
  const res = await api.post("/login", { email, password });
  return res.data;
};

// ✅ Fetch current user after login
export const getCurrentUser = async () => {
  const token = await getToken();

  const res = await api.get("/users/profile", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  return res.data;
};

// ✅ Update user profile (supports preferences now)
export const updateUser = async (updatedData: UpdateUserData) => {
  const res = await api.patch("/users/profile", updatedData);
  return res.data;
};

// Save performed hobby to user history
export const saveHobbyHistory = async (historyData: {
  hobbyId: string;
  performedAt: Date;
  rating: number;
  notes?: string;
}) => {
  const res = await api.post("/users/history", historyData);
  return res.data;
};

// ✅ Update this in userService.ts
export const saveUserHobby = async (data: {
  user: string;
  hobby: string;
  performedAt: String; // ISO date string
  rating: number;
  notes?: string;
}) => {
  const res = await api.post("/user-hobbies", data);
  return res.data;
};

export const logoutUser = async () => {
  await AsyncStorage.removeItem("authToken");
  await AsyncStorage.removeItem("userData");

  clearToken?.(); // ✅ call as a function with no args
  const storedToken = await AsyncStorage.getItem("authToken");
  console.log("Stored token after logout:", storedToken); // Should be null
};
