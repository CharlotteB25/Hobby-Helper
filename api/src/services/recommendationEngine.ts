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

  // Duration/location are common to all
  if (duration) matchStage.durationOptions = { $in: [duration] };
  if (location) matchStage.locationOptions = { $in: [location] };

  // ✅ Only apply preference filters if user is logged in
  if (user) {
    if (
      wheelchairAccessible === undefined &&
      user.preferences?.wheelchairAccessible
    ) {
      matchStage.wheelchairAccessible = true;
    } else if (wheelchairAccessible !== undefined) {
      matchStage.wheelchairAccessible = wheelchairAccessible === "true";
    }

    if (ecoFriendly === undefined && user.preferences?.ecoFriendly) {
      matchStage.ecoFriendly = true;
    } else if (ecoFriendly !== undefined) {
      matchStage.ecoFriendly = ecoFriendly === "true";
    }

    if (trialAvailable === undefined && user.preferences?.trialAvailable) {
      matchStage["locations.trialAvailable"] = true;
    } else if (trialAvailable !== undefined) {
      matchStage["locations.trialAvailable"] = trialAvailable === "true";
    }
  } else {
    // ⛔ Guests: Only apply explicit filters, skip profile preferences
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
      { $sample: { size: 10 } }, // Random 10
    ]);
    console.log(`✅ Fetched ${hobbies.length} hobbies from DB`);
  } catch (err) {
    console.error("❌ Aggregation query failed:", err);
    throw err;
  }

  // ✅ TryNew: only apply if user is logged in
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

  // ✅ Favorite tags also only for logged in users
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

  const topHobbies = sortedHobbies.slice(0, 3); // top 3
  console.log(`🚀 Returning ${topHobbies.length} hobbies`);

  return topHobbies;
};
