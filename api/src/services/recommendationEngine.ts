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

  const matchStage: any = {};

  // Always apply duration/location
  if (duration) matchStage.durationOptions = { $in: [duration] };
  if (location) matchStage.locationOptions = { $in: [location] };

  // ✅ Check if user has any preferences enabled
  const userHasPreferences =
    user?.preferences &&
    Object.values(user.preferences).some((v) => v === true);

  // ✅ Apply profile preferences only if user has them
  if (user && userHasPreferences) {
    if (wheelchairAccessible !== undefined) {
      matchStage.wheelchairAccessible = wheelchairAccessible === "true";
    } else if (user.preferences?.wheelchairAccessible) {
      matchStage.wheelchairAccessible = true;
    }

    if (ecoFriendly !== undefined) {
      matchStage.ecoFriendly = ecoFriendly === "true";
    } else if (user.preferences?.ecoFriendly) {
      matchStage.ecoFriendly = true;
    }

    if (trialAvailable !== undefined) {
      matchStage["locations.trialAvailable"] = trialAvailable === "true";
    } else if (user.preferences?.trialAvailable) {
      matchStage["locations.trialAvailable"] = true;
    }
  } else {
    // 🧍 Guest or no preferences: only apply explicit filters
    if (wheelchairAccessible !== undefined) {
      matchStage.wheelchairAccessible = wheelchairAccessible === "true";
    }
    if (ecoFriendly !== undefined) {
      matchStage.ecoFriendly = ecoFriendly === "true";
    }
    if (trialAvailable !== undefined) {
      matchStage["locations.trialAvailable"] = trialAvailable === "true";
    }
  }

  console.log("📦 Final Mongo match stage:", matchStage);

  let hobbies: Array<{ _id: mongoose.Types.ObjectId; tags?: string[] }> = [];

  try {
    hobbies = await Hobby.aggregate([
      { $match: matchStage },
      { $sample: { size: 10 } },
    ]);
    console.log(`✅ Fetched ${hobbies.length} hobbies from DB`);
  } catch (err) {
    console.error("❌ Aggregation query failed:", err);
    throw err;
  }

  // ✅ Filter out performed hobbies if requested
  if (tryNew === "true" && user && Array.isArray(user.hobbies)) {
    const performedIds = user.hobbies.map(
      (h) => new mongoose.Types.ObjectId(h.hobby)
    );
    hobbies = hobbies.filter(
      (hobby) =>
        !performedIds.some((id) => id.toString() === hobby._id.toString())
    );
    console.log(`🎯 After filtering performed hobbies: ${hobbies.length}`);
  }

  // ✅ Sort by favorite tags
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

  // ✅ Optionally increase this from 3 if needed
  const topHobbies = sortedHobbies.slice(0, 3);
  console.log(`🚀 Returning ${topHobbies.length} hobbies`);

  return topHobbies;
};
