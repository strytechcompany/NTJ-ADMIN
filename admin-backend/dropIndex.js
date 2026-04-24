/**
 * dropIndex.js
 * Drops the problematic 'phone_1' index from the users collection.
 */

require("dotenv").config();
const mongoose = require("mongoose");

const MONGO_URI = process.env.MONGO_URI;

async function fixIndex() {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected.");

    const db = mongoose.connection.db;
    const collection = db.collection("users");

    console.log("Checking indexes on 'users' collection...");
    const indexes = await collection.indexes();
    console.log("Current indexes:", indexes.map(i => i.name));

    if (indexes.some(i => i.name === "phone_1")) {
      console.log("Found 'phone_1' index. Dropping it...");
      await collection.dropIndex("phone_1");
      console.log("Index 'phone_1' dropped successfully.");
    } else {
      console.log("No index named 'phone_1' found.");
    }

    if (indexes.some(i => i.name === "phone")) {
        console.log("Found 'phone' index. Dropping it...");
        await collection.dropIndex("phone");
        console.log("Index 'phone' dropped successfully.");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error fixing index:", error);
    process.exit(1);
  }
}

fixIndex();
