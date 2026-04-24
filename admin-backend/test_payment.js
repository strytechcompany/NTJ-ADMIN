require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;
    
    // Test with Rohit's ID
    const userId = "69e90a27aae480151a367e81";
    const amount = 1000;
    const type = "gold";
    
    console.log("Checking user...");
    const user = await db.collection("users").findOne({ _id: new mongoose.Types.ObjectId(userId) });
    console.log("User found:", !!user);
    
    if (user) {
      const balanceField = type.toLowerCase() === "gold" ? "goldBalance" : "silverBalance";
      console.log(`Updating ${balanceField} for ${user.name}...`);
      
      const res = await db.collection("users").updateOne(
        { _id: new mongoose.Types.ObjectId(userId) },
        { $inc: { [balanceField]: Number(amount) } }
      );
      console.log("Update result:", res);
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

run();
