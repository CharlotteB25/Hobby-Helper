// src/services/tokenManager.ts
import AsyncStorage from "@react-native-async-storage/async-storage";

const TOKEN_KEY = "authToken";

let inMemoryToken: string | null = null;

export const setToken = async (newToken: string | null) => {
  inMemoryToken = newToken;

  try {
    if (newToken) {
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
    } else {
      await AsyncStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error("Error storing token:", err);
  }
};

export const getToken = async (): Promise<string | null> => {
  if (inMemoryToken) return inMemoryToken;

  try {
    const stored = await AsyncStorage.getItem(TOKEN_KEY);
    inMemoryToken = stored;
    return stored;
  } catch (err) {
    console.error("Error retrieving token:", err);
    return null;
  }
};

export const loadTokenFromStorage = async (): Promise<string | null> => {
  try {
    const token = await AsyncStorage.getItem(TOKEN_KEY);
    inMemoryToken = token;
    return token;
  } catch (err) {
    console.error("Error loading token from storage:", err);
    return null;
  }
};

export const clearToken = async () => {
  inMemoryToken = null;
  try {
    await AsyncStorage.removeItem(TOKEN_KEY);
  } catch (err) {
    console.error("Error clearing token:", err);
  }
};
