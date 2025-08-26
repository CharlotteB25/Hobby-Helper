import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import Hobby from "../modules/Hobby/Hobby.model";

// Load .env from common locations, plus default
const rootEnv = path.resolve(__dirname, "../../.env");
const srcEnv = path.resolve(__dirname, "../.env");
[rootEnv, srcEnv].forEach((p) => {
  if (fs.existsSync(p)) dotenv.config({ path: p });
});
dotenv.config();

const MONGO_URI = process.env.MONGO_CONNECTION_STRING;
if (!MONGO_URI) {
  console.error(
    "❌ MONGO_CONNECTION_STRING is missing. Add it to your .env or set it in the shell."
  );
  process.exit(1);
}

const inferMoodEffects = (tags: string[] = []): string[] => {
  const t = tags.map((x) => String(x).toLowerCase().trim());
  const relaxedTags = [
    "relaxation",
    "mindfulness",
    "wellness",
    "sustainability",
    "eco-friendly",
    "eco",
    "calm",
  ];
  const creativeTags = [
    "creative",
    "expression",
    "hands-on",
    "craft",
    "art",
    "diy",
  ];
  const energizedTags = [
    "fitness",
    "adventure",
    "strength",
    "skill-building",
    "sport",
    "training",
  ];

  const moods = new Set<string>();
  if (t.some((x) => relaxedTags.includes(x))) moods.add("relaxed");
  if (t.some((x) => creativeTags.includes(x))) moods.add("creative");
  if (t.some((x) => energizedTags.includes(x))) moods.add("energized");
  if (moods.size === 0) moods.add("neutral");
  return Array.from(moods);
};

const isDryRun =
  process.argv.includes("--dryRun") || process.argv.includes("--dry-run");

async function main() {
  console.log("🔌 Connecting to MongoDB…");
  await mongoose.connect(MONGO_URI as string);
  console.log("✅ MongoDB connected");

  await Hobby.syncIndexes().catch(() => {});

  const missingQuery = {
    $or: [{ moodEffects: { $exists: false } }, { moodEffects: { $size: 0 } }],
  };
  const totalMissing = await Hobby.countDocuments(missingQuery);
  console.log(`📊 Hobbies missing moodEffects: ${totalMissing}`);

  if (totalMissing === 0) {
    console.log("🎉 Nothing to backfill. You're all set!");
    await mongoose.disconnect();
    return;
  }

  if (isDryRun) {
    console.log("👀 Dry run: showing up to 10 examples that would be updated…");
    const sample = await Hobby.find(missingQuery).limit(10).select("name tags");
    for (const d of sample) {
      // @ts-ignore
      const moods = inferMoodEffects(d.tags || []);
      // @ts-ignore
      console.log(
        `• ${d.name} -> ${JSON.stringify(moods)} (from tags: ${JSON.stringify(
          d.tags
        )})`
      );
    }
    console.log("💡 Run again without --dryRun to apply changes.");
    await mongoose.disconnect();
    return;
  }

  console.log("✍️ Backfilling moodEffects in batches…");
  const cursor = Hobby.find(missingQuery).cursor();
  const batchSize = 500;
  let bulkOps: any[] = [];
  let updated = 0;

  for await (const doc of cursor) {
    // @ts-ignore
    const moods = inferMoodEffects(doc.tags || []);
    bulkOps.push({
      updateOne: {
        filter: { _id: doc._id },
        update: { $set: { moodEffects: moods } },
      },
    });

    if (bulkOps.length >= batchSize) {
      const res = await Hobby.bulkWrite(bulkOps, { ordered: false });
      updated += res.modifiedCount ?? 0;
      bulkOps = [];
      console.log(`…updated so far: ${updated}`);
    }
  }

  if (bulkOps.length) {
    const res = await Hobby.bulkWrite(bulkOps, { ordered: false });
    updated += res.modifiedCount ?? 0;
  }

  const remaining = await Hobby.countDocuments(missingQuery);
  console.log(
    `✅ Backfill complete. Updated ${updated}. Remaining without moods: ${remaining}`
  );

  await mongoose.disconnect();
}

main().catch(async (e) => {
  console.error("❌ Backfill error:", e);
  try {
    await mongoose.disconnect();
  } catch {}
  process.exit(1);
});
