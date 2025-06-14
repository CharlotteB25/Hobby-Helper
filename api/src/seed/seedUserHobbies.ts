import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import UserHobby from "../modules/UserHobby/UserHobby.model";

dotenv.config();

const MONGO_URI = process.env.MONGO_CONNECTION as string;

const seedUserHobbies = async () => {
  try {
    const filePath = path.join(__dirname, "./data/userHobbies.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const userHobbyData = JSON.parse(rawData);

    await UserHobby.deleteMany();
    await UserHobby.insertMany(userHobbyData);
    console.log("✅ UserHobbies seeded successfully");
  } catch (err: any) {
    console.error("❌ Error seeding UserHobbies:", err);
    process.exit(1);
  }
};

const runSeeder = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
    await seedUserHobbies();
    process.exit();
  } catch (err) {
    console.error("❌ Global seeder error:", err);
    process.exit(1);
  }
};

runSeeder();
// This script connects to MongoDB and seeds the UserHobbies collection with data from a JSON file.
// Make sure to run this script with `ts-node` or compile it to JavaScript first.
