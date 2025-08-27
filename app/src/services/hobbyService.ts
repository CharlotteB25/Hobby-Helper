// src/services/hobbyService.ts
import api from "./api";

export const getSuggestedHobbies = async (filters: {
  duration?: string;
  location?: string;
  tryNew?: boolean;
  wheelchairAccessible?: boolean;
  ecoFriendly?: boolean;
  trialAvailable?: boolean;
}) => {
  // Remove undefined values from filters
  const cleaned = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== undefined)
  );

  const query = new URLSearchParams(
    cleaned as Record<string, string>
  ).toString();
  console.log("👀 Fetching:", `/hobbies/suggestions?${query}`);
  console.log("👉 Base URL:", api.defaults.baseURL);

  const res = await api.get("/hobbies/suggestions", {
    params: cleaned,
  });

  return res.data;
};

export const getHobbyById = async (id: string) => {
  const res = await api.get(`/hobbies/${id}`);
  return res.data;
};
