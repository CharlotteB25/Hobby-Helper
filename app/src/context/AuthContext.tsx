import { createContext, useContext, useState, useEffect } from "react";
import { hasCompletedOnboarding } from "../utils/onboardingStorage";
import {
  setToken as storeToken,
  loadTokenFromStorage,
  clearToken as clearStoredToken,
} from "../services/tokenManager";
import api from "../services/api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getCurrentUser } from "../services/userService";

type AuthContextType = {
  user: any;
  token: string | null;
  isAuthenticated: boolean;
  hasOnboarded: boolean;
  loading: boolean;
  setUser: (user: any) => void;
  setToken: (token: string | null) => Promise<void>;
  refreshOnboarding: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<any>(null);
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOnboarded, setHasOnboarded] = useState(false);

  const isValidToken = (token: string | null) =>
    typeof token === "string" &&
    token.trim().length > 0 &&
    token !== "null" &&
    token !== "undefined";

  const isTokenExpired = (token: string): boolean => {
    try {
      const [, payload] = token.split(".");
      const decoded = JSON.parse(atob(payload));
      return decoded.exp * 1000 < Date.now();
    } catch (err) {
      console.warn("⚠️ Token parsing failed or invalid:", err);
      return true;
    }
  };

  const setToken = async (newToken: string | null) => {
    setTokenState(newToken);
    await storeToken(newToken);

    if (newToken) {
      api.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
    } else {
      delete api.defaults.headers.common["Authorization"];
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem("authToken");
    await AsyncStorage.removeItem("userData");
    await setToken(null);
    setUser(null);
    clearStoredToken?.();
    setHasOnboarded(false);
  };

  const refreshOnboarding = async () => {
    const done = await hasCompletedOnboarding();
    setHasOnboarded(done);
  };

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const restoredToken = await loadTokenFromStorage();

        if (isValidToken(restoredToken)) {
          if (!isTokenExpired(restoredToken as string)) {
            await setToken(restoredToken);
            const userData = await getCurrentUser(); // ✅ Fetch current user
            setUser(userData);
          } else {
            console.log("🧹 Token is expired");
            await logout();
          }
        } else {
          console.log("🧹 Token is invalid or null");
          await logout();
        }
      } catch (err) {
        console.error("❌ Failed to initialize auth:", err);
        await logout(); // fail-safe
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const isAuthenticated = isValidToken(token);

  useEffect(() => {
    const syncOnboarding = async () => {
      if (isAuthenticated) {
        await refreshOnboarding();
      } else {
        setHasOnboarded(false);
      }
    };

    syncOnboarding();
  }, [isAuthenticated]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated,
        hasOnboarded,
        loading,
        setUser,
        setToken,
        refreshOnboarding,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
