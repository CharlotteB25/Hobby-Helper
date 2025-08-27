import { useState, useEffect } from "react";
import { getCurrentUser, updateUser } from "../services/userService";

export const useProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await getCurrentUser();
      setProfile(data);
    } catch (err: any) {
      console.log("Error fetching profile:", err?.response?.data || err);
      setError("Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  const saveProfile = async (updatedData: any) => {
    try {
      setLoading(true);
      const updated = await updateUser(updatedData);
      setProfile(updated);
    } catch (err: any) {
      console.log("Error updating profile:", err?.response?.data || err);
      setError("Failed to update profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  return { profile, loading, error, saveProfile };
};
