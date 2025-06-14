import mongoose from "mongoose";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import Hobby from "../modules/Hobby/Hobby.model";
import { hobbiesArraySchema } from "./utils/validateSchema";

dotenv.config();

const MONGO_URI = process.env.MONGO_CONNECTION as string;

const seedHobbies = async () => {
  try {
    console.log("📦 Seeding hobbies...");
    const filePath = path.join(__dirname, "./data/hobbies.json");
    const rawData = fs.readFileSync(filePath, "utf-8");
    const hobbiesData = JSON.parse(rawData);

    const parsed = hobbiesArraySchema.parse(hobbiesData); // ✅ validate

    await Hobby.deleteMany();
    await Hobby.insertMany(parsed);
    console.log("✅ Hobbies seeded successfully");
  } catch (err: any) {
    console.error("❌ Error seeding hobbies:", err);
    process.exit(1);
  }
};

const runSeeder = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("✅ MongoDB connected");
    await seedHobbies();
    process.exit();
  } catch (err) {
    console.error("❌ Global seeder error:", err);
    process.exit(1);
  }
};

runSeeder();
// This script connects to MongoDB and seeds the hobbies collection with data from a JSON file.
// Make sure to run this script with `ts-node` or compile it to JavaScript first.
