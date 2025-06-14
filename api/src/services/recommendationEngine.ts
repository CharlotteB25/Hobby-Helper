import mongoose from "mongoose";
import Hobby from "../modules/Hobby/Hobby.model";
import { IUser } from "../modules/User/User.types";

interface RecommendationFilters {
  duration?: string;
  location?: string;
  tryNew?: string;
  wheelchairAccessible?: string;
  ecoFriendly?: string;
  trialAvailable?: string;
}

export const generateRecommendations = async (
  user: IUser | null | undefined,
  filters: RecommendationFilters
) => {
  console.log("🧠 Incoming user:", user?._id || "Guest");
  console.log("🔍 Incoming filters:", filters);

  const {
    duration,
    location,
    tryNew,
    wheelchairAccessible,
    ecoFriendly,
    trialAvailable,
  } = filters;

  const query: any = {};

  // Apply duration/location filters
  if (duration) query.durationOptions = duration;
  if (location) query.locationOptions = location;

  // Use user preferences as fallback
  if (user?.preferences) {
    if (
      wheelchairAccessible === undefined &&
      user.preferences.wheelchairAccessible
    ) {
      query.wheelchairAccessible = true;
    }
    if (ecoFriendly === undefined && user.preferences.ecoFriendly) {
      query.ecoFriendly = true;
    }
    if (trialAvailable === undefined && user.preferences.trialAvailable) {
      query["locations.trialAvailable"] = true;
    }
  } else {
    if (wheelchairAccessible !== undefined) {
      query.wheelchairAccessible = wheelchairAccessible === "true";
    }
    if (ecoFriendly !== undefined) {
      query.ecoFriendly = ecoFriendly === "true";
    }
    if (trialAvailable !== undefined) {
      query["locations.trialAvailable"] = trialAvailable === "true";
    }
  }

  console.log("📦 Final Mongo query:", query);

  let hobbies: Array<{ _id: mongoose.Types.ObjectId; tags?: string[] }> = [];
  try {
    hobbies = await Hobby.find(query);
    console.log(`✅ Found ${hobbies.length} hobbies from DB`);
  } catch (err) {
    console.error("❌ DB query failed:", err);
    throw err;
  }

  // Filter out previously performed hobbies if "tryNew" is true
  if (tryNew === "true" && Array.isArray(user?.hobbies)) {
    const performedIds = user.hobbies.map(
      (h) => new mongoose.Types.ObjectId(h.hobby)
    );
    hobbies = hobbies.filter(
      (hobby) =>
        !performedIds.some((id) => id.toString() === hobby._id.toString())
    );
    console.log(`🎯 After filtering performed hobbies: ${hobbies.length}`);
  }

  const favoriteTags = Array.isArray(user?.favouriteTags)
    ? user.favouriteTags
    : [];

  console.log("🏷️ User favorite tags:", favoriteTags);

  const sortedHobbies = hobbies.sort((a, b) => {
    const aMatches = (a.tags || []).filter((tag) =>
      favoriteTags.includes(tag)
    ).length;
    const bMatches = (b.tags || []).filter((tag) =>
      favoriteTags.includes(tag)
    ).length;
    return bMatches - aMatches;
  });

  const shuffleArray = (arr: any[]) => arr.sort(() => Math.random() - 0.5);
  const finalHobbies =
    tryNew === "true" ? shuffleArray(sortedHobbies) : sortedHobbies;

  const topHobbies = finalHobbies.slice(0, 3);
  console.log(`🚀 Returning ${topHobbies.length} hobbies`);

  return topHobbies;
};
