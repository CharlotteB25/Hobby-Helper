// src/services/userService.ts
import api from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getToken, clearToken } from "./tokenManager";
import { DeviceEventEmitter } from "react-native";

/* ============================================================================
   Public constants / event name
============================================================================ */
export const OPEN_HOBBIES_EVENT = "OPEN_HOBBIES_CHANGED";

/* ============================================================================
   Domain types
============================================================================ */
export type Mood =
  | "chill"
  | "creative"
  | "energetic"
  | "social"
  | "curious"
  | "focused";
export type LocationType = "Indoor" | "Outdoor";

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

export type OpenHobbyLite = {
  hobbyId: string;
  name: string;
  startedAt: string; // ISO
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
  openHobbies?: OpenHobbyLite[];
}

/** Data accepted by PATCH /users/profile */
export type UpdateUserData = Partial<UserProfile> & { password?: string };

/* ============================================================================
   Local mirror (so UI keeps working even if server omits field)
============================================================================ */
const OPEN_HOBBIES_KEY = "openHobbies.local";

const getLocalOpenHobbies = async (): Promise<OpenHobbyLite[]> => {
  try {
    const raw = await AsyncStorage.getItem(OPEN_HOBBIES_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
};

const setLocalOpenHobbies = async (rows: OpenHobbyLite[]) => {
  try {
    await AsyncStorage.setItem(OPEN_HOBBIES_KEY, JSON.stringify(rows));
  } catch {}
};

const mergeByHobbyId = (
  a: OpenHobbyLite[],
  b: OpenHobbyLite[]
): OpenHobbyLite[] => {
  const map = new Map<string, OpenHobbyLite>();
  [...a, ...b].forEach((r) => {
    if (!r?.hobbyId) return;
    const safe: OpenHobbyLite = {
      hobbyId: String(r.hobbyId),
      name: String(r.name ?? "Unknown Hobby"),
      startedAt: String(r.startedAt ?? new Date().toISOString()),
    };
    map.set(safe.hobbyId, safe);
  });
  // newest first
  return [...map.values()].sort(
    (x, y) => +new Date(y.startedAt) - +new Date(x.startedAt)
  );
};

/* ============================================================================
   Normalizers (handle snake/camel + embedded shapes)
============================================================================ */
const rootUser = (u: any) => (u && (u.user ?? u)) || {};

const normalizeOpenHobbies = (raw: any): OpenHobbyLite[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row: any) => {
      const hobbyId =
        row?.hobbyId ??
        row?.id ??
        row?._id ??
        row?.hobby?.id ??
        row?.hobby?._id;
      if (!hobbyId) return null;
      const name =
        row?.name ??
        row?.title ??
        row?.hobby?.name ??
        row?.hobby?.title ??
        "Unknown Hobby";
      const startedAt =
        row?.startedAt ??
        row?.started_at ??
        row?.createdAt ??
        row?.created_at ??
        new Date().toISOString();
      return {
        hobbyId: String(hobbyId),
        name: String(name),
        startedAt: String(startedAt),
      };
    })
    .filter(Boolean) as OpenHobbyLite[];
};

const normalizeUser = (raw: any): UserProfile => {
  const u = rootUser(raw);
  const ohServer = u.openHobbies ?? u.open_hobbies ?? [];
  return {
    ...u,
    openHobbies: normalizeOpenHobbies(ohServer),
  } as UserProfile;
};

/* ============================================================================
   API
============================================================================ */
export const loginUser = async (
  email: string,
  password: string
): Promise<{ token: string }> => {
  const res = await api.post("/login", { email, password });
  return res.data;
};

export const getCurrentUser = async (): Promise<UserProfile> => {
  const token = await getToken();
  const res = await api.get("/users/profile", {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  const userFromServer = normalizeUser(res.data);

  // Merge server + local mirror so UI always has data
  const local = await getLocalOpenHobbies();
  const mergedOpenHobbies = mergeByHobbyId(
    userFromServer.openHobbies ?? [],
    local
  );

  // Keep local mirror in sync
  await setLocalOpenHobbies(mergedOpenHobbies);

  const mergedUser: UserProfile = {
    ...userFromServer,
    openHobbies: mergedOpenHobbies,
  };

  // For debugging if needed:
  // console.log("getCurrentUser() -> openHobbies:", mergedOpenHobbies);

  return mergedUser;
};

export const updateUser = async (
  updatedData: UpdateUserData
): Promise<UserProfile> => {
  // Duplicate camel + snake for widest compatibility
  let body: any = { ...updatedData };
  if (updatedData.openHobbies) {
    body.openHobbies = updatedData.openHobbies;
    body.open_hobbies = updatedData.openHobbies;
  }

  const res = await api.patch("/users/profile", body);

  // Some backends return 204/empty body. In that case, prefer what we sent.
  const serverUser = res?.data ? normalizeUser(res.data) : ({} as UserProfile);

  // Determine best openHobbies source:
  const serverOH = serverUser.openHobbies ?? [];
  const sentOH = (updatedData.openHobbies ?? []) as OpenHobbyLite[];
  const bestOH = mergeByHobbyId(serverOH, sentOH);

  // Sync local mirror + emit event so Profile can update instantly
  await setLocalOpenHobbies(bestOH);
  DeviceEventEmitter.emit(OPEN_HOBBIES_EVENT, bestOH);

  return {
    ...serverUser,
    ...(res?.data ? {} : (updatedData as any)),
    openHobbies: bestOH,
  } as UserProfile;
};

/* ============================================================================
   Optional helpers: add/remove open hobby (handy for screens)
============================================================================ */
export const addOpenHobby = async (
  row: OpenHobbyLite
): Promise<OpenHobbyLite[]> => {
  const user = await getCurrentUser();
  const next = mergeByHobbyId(user.openHobbies ?? [], [row]);
  const updated = await updateUser({ openHobbies: next });
  return updated.openHobbies ?? next;
};

export const removeOpenHobby = async (
  hobbyId: string
): Promise<OpenHobbyLite[]> => {
  const user = await getCurrentUser();
  const next = (user.openHobbies ?? []).filter((r) => r.hobbyId !== hobbyId);
  const updated = await updateUser({ openHobbies: next });
  return updated.openHobbies ?? next;
};

/* ============================================================================
   History helpers (optional – keep if API supports these)
============================================================================ */
export const saveHobbyHistory = async (historyData: {
  hobbyId: string;
  performedAt: Date;
  rating: number;
  notes?: string;
}) => {
  const res = await api.post("/users/history", historyData);
  return res.data;
};

export const saveUserHobby = async (data: {
  user: string;
  hobby: string;
  performedAt: string; // ISO
  rating: number;
  notes?: string;
}) => {
  const res = await api.post("/user-hobbies", data);
  return res.data;
};

/* ============================================================================
   Logout
============================================================================ */
export const logoutUser = async () => {
  await AsyncStorage.removeItem("authToken");
  await AsyncStorage.removeItem("userData");
  await clearToken?.();
};
