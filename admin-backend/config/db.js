const mongoose = require("mongoose");

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI is missing. Point it to the existing user app database.");
  }

  await mongoose.connect(mongoUri);
  console.log("Admin backend connected to MongoDB");
};

module.exports = connectDB;
