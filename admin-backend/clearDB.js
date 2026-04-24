/**
 * clearDB.js
 * Run this script to wipe all data from the ntj-db database.
 * Usage: node clearDB.js
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

async function clearDatabase() {
  try {
    console.log("🔌 Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("✅ Connected to:", MONGO_URI.split("@")[1]); // hide credentials in log

    const db = mongoose.connection.db;

    // List all collections
    const collections = await db.listCollections().toArray();
    console.log(`\n📦 Found ${collections.length} collection(s):`);
    collections.forEach((c) => console.log("  -", c.name));

    if (collections.length === 0) {
      console.log("\n⚠️  No collections found. Database is already empty.");
    } else {
      console.log("\n🗑️  Clearing all collections...");
      for (const col of collections) {
        const result = await db.collection(col.name).deleteMany({});
        console.log(`  ✅ ${col.name}: deleted ${result.deletedCount} document(s)`);
      }
      console.log("\n🎉 Database cleared successfully! Ready to start fresh.");
    }
  } catch (err) {
    console.error("\n❌ Error:", err.message);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log("🔌 Disconnected from MongoDB.");
  }
}

clearDatabase();
